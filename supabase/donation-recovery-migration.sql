alter table public.blood_requests
  add column if not exists component text not null default 'WHOLE_BLOOD',
  add column if not exists search_radius_km integer not null default 25;

alter table public.donors
  add column if not exists last_donation_date date,
  add column if not exists donations_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.blood_requests'::regclass
      and conname = 'blood_requests_component_supported'
  ) then
    alter table public.blood_requests
      add constraint blood_requests_component_supported
      check (component in ('WHOLE_BLOOD', 'PLATELETS', 'PLASMA', 'OTHER'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.blood_requests'::regclass
      and conname = 'blood_requests_search_radius_valid'
  ) then
    alter table public.blood_requests
      add constraint blood_requests_search_radius_valid
      check (search_radius_km between 5 and 50)
      not valid;
  end if;
end;
$$;

create or replace function public.valid_cross_component_restrictions(
  p_restrictions jsonb
)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select coalesce(
    jsonb_typeof(p_restrictions) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(
        case
          when jsonb_typeof(p_restrictions) = 'array' then p_restrictions
          else '[]'::jsonb
        end
      ) as item(value)
      where coalesce(
        jsonb_typeof(item.value) <> 'object'
        or not (item.value ? 'component')
        or item.value->>'component' not in (
          'WHOLE_BLOOD', 'PLATELETS', 'PLASMA', 'OTHER'
        )
        or not (item.value ? 'interval_days')
        or (item.value->>'interval_days') !~ '^[1-9][0-9]*$',
        true
      )
    ),
    false
  );
$$;

create table if not exists public.donor_recovery_rules (
  id uuid primary key default gen_random_uuid(),
  component text not null,
  donor_gender text not null,
  interval_days integer,
  effective_from date not null,
  version text not null,
  approval_status text not null default 'pending',
  cross_component_restrictions jsonb not null default '[]'::jsonb,
  max_donations_per_year integer,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint donor_recovery_rules_component_valid
    check (component in ('WHOLE_BLOOD', 'PLATELETS', 'PLASMA', 'OTHER')),
  constraint donor_recovery_rules_gender_valid
    check (donor_gender in ('Male', 'Female', 'Other', 'Unknown')),
  constraint donor_recovery_rules_approval_valid
    check (approval_status in ('pending', 'approved', 'retired')),
  constraint donor_recovery_rules_interval_valid
    check (interval_days is null or interval_days > 0),
  constraint donor_recovery_rules_cross_component_valid
    check (public.valid_cross_component_restrictions(cross_component_restrictions)),
  constraint donor_recovery_rules_max_annual_valid
    check (max_donations_per_year is null or max_donations_per_year > 0),
  constraint donor_recovery_rules_approval_metadata_valid
    check (
      approval_status <> 'approved'
      or (approved_by is not null and approved_at is not null)
    ),
  constraint donor_recovery_rules_version_unique
    unique (component, donor_gender, version)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.donor_recovery_rules'::regclass
      and conname = 'donor_recovery_rules_cross_component_valid'
  ) then
    alter table public.donor_recovery_rules
      add constraint donor_recovery_rules_cross_component_valid
      check (public.valid_cross_component_restrictions(cross_component_restrictions))
      not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.donor_recovery_rules'::regclass
      and conname = 'donor_recovery_rules_max_annual_valid'
  ) then
    alter table public.donor_recovery_rules
      add constraint donor_recovery_rules_max_annual_valid
      check (max_donations_per_year is null or max_donations_per_year > 0)
      not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.donor_recovery_rules'::regclass
      and conname = 'donor_recovery_rules_approval_metadata_valid'
  ) then
    alter table public.donor_recovery_rules
      add constraint donor_recovery_rules_approval_metadata_valid
      check (
        approval_status <> 'approved'
        or (approved_by is not null and approved_at is not null)
      )
      not valid;
  end if;
end;
$$;

insert into public.donor_recovery_rules (
  component, donor_gender, interval_days, effective_from, version,
  approval_status
)
values
  (
    'WHOLE_BLOOD', 'Male', 90,
    (now() at time zone 'Asia/Kolkata')::date,
    'india-whole-blood-v1', 'pending'
  ),
  (
    'WHOLE_BLOOD', 'Female', 120,
    (now() at time zone 'Asia/Kolkata')::date,
    'india-whole-blood-v1', 'pending'
  )
on conflict (component, donor_gender, version) do nothing;

create table if not exists public.donor_medical_deferrals (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.donors(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  reason_code text not null,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint donor_medical_deferrals_date_valid
    check (ends_at is null or ends_at > starts_at)
);

create index if not exists donor_medical_deferrals_active_idx
  on public.donor_medical_deferrals (donor_id, ends_at)
  where active;

create table if not exists public.donation_records (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests(id) on delete restrict,
  donor_id uuid not null references public.donors(id) on delete restrict,
  hospital_id uuid not null references public.hospitals(id) on delete restrict,
  component text not null,
  donated_at timestamptz not null,
  volume_ml integer,
  confirmed_by uuid not null references auth.users(id),
  confirmed_at timestamptz not null default now(),
  rule_id uuid references public.donor_recovery_rules(id),
  rule_version text,
  next_potentially_eligible_at timestamptz,
  recovery_state text not null default 'review_required',
  created_at timestamptz not null default now(),
  constraint donation_records_component_valid
    check (component in ('WHOLE_BLOOD', 'PLATELETS', 'PLASMA', 'OTHER')),
  constraint donation_records_volume_valid
    check (volume_ml is null or volume_ml > 0),
  constraint donation_records_recovery_state_valid
    check (recovery_state in ('active', 'expired', 'review_required')),
  constraint donation_records_request_donor_unique
    unique (request_id, donor_id)
);

create index if not exists donation_records_donor_latest_idx
  on public.donation_records (donor_id, donated_at desc);

create table if not exists public.donation_record_audit (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donation_records(id) on delete restrict,
  changed_by uuid not null references auth.users(id),
  change_reason text not null,
  old_record jsonb not null,
  new_record jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists donation_record_audit_donation_idx
  on public.donation_record_audit (donation_id, created_at desc);

create table if not exists public.donation_record_issues (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donation_records(id) on delete restrict,
  donor_id uuid not null references public.donors(id) on delete restrict,
  details text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint donation_record_issues_status_valid
    check (status in ('open', 'reviewing', 'resolved'))
);

create or replace function public.guard_donor_recovery_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user not in ('postgres', 'service_role') then
    if tg_op = 'INSERT' then
      if new.last_donation_date is not null or new.donations_count <> 0 then
        raise exception 'Donation history and recovery fields are server-managed.';
      end if;
    elsif new.last_donation_date is distinct from old.last_donation_date
      or new.donations_count is distinct from old.donations_count then
      raise exception 'Donation history and recovery fields are server-managed.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_donor_recovery_fields
  on public.donors;
create trigger guard_donor_recovery_fields
before insert or update
on public.donors
for each row execute function public.guard_donor_recovery_fields();

alter table public.donor_recovery_rules enable row level security;
alter table public.donor_medical_deferrals enable row level security;
alter table public.donation_records enable row level security;
alter table public.donation_record_audit enable row level security;
alter table public.donation_record_issues enable row level security;

drop policy if exists "Donors and hospitals can read donation records"
  on public.donation_records;
create policy "Donors and hospitals can read donation records"
  on public.donation_records for select to authenticated
  using (
    exists (
      select 1 from public.donors d
      where d.id = donor_id and d.user_id = auth.uid()
    )
    or exists (
      select 1 from public.hospitals h
      where h.id = hospital_id and h.user_id = auth.uid()
    )
  );

drop policy if exists "Donors can read their donation record audit"
  on public.donation_record_audit;
create policy "Donors can read their donation record audit"
  on public.donation_record_audit for select to authenticated
  using (
    exists (
      select 1 from public.donation_records dr
      join public.donors d on d.id = dr.donor_id
      where dr.id = donation_id and d.user_id = auth.uid()
    )
    or exists (
      select 1 from public.donation_records dr
      join public.hospitals h on h.id = dr.hospital_id
      where dr.id = donation_id and h.user_id = auth.uid()
    )
  );

drop policy if exists "Donors can read their donation record issues"
  on public.donation_record_issues;
create policy "Donors can read their donation record issues"
  on public.donation_record_issues for select to authenticated
  using (
    exists (
      select 1 from public.donors d
      where d.id = donor_id and d.user_id = auth.uid()
    )
  );

revoke all on public.donor_recovery_rules from anon, authenticated;
revoke all on public.donor_medical_deferrals from anon, authenticated;
revoke all on public.donation_records from anon, authenticated;
revoke all on public.donation_record_audit from anon, authenticated;
revoke all on public.donation_record_issues from anon, authenticated;
grant select on public.donation_records to authenticated;
grant select on public.donation_record_audit to authenticated;
grant select on public.donation_record_issues to authenticated;

create or replace function public.has_approved_whole_blood_recovery_rule(
  p_donor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.donors donor
    join public.donor_recovery_rules rule
      on rule.component = 'WHOLE_BLOOD'
      and rule.donor_gender = coalesce(donor.gender, 'Unknown')
      and rule.approval_status = 'approved'
      and rule.approved_by is not null
      and rule.approved_at is not null
      and rule.effective_from = (
        select max(current_rule.effective_from)
        from public.donor_recovery_rules current_rule
        where current_rule.component = 'WHOLE_BLOOD'
          and current_rule.donor_gender = coalesce(donor.gender, 'Unknown')
          and current_rule.approval_status = 'approved'
          and current_rule.approved_by is not null
          and current_rule.approved_at is not null
          and current_rule.effective_from <=
            (now() at time zone 'Asia/Kolkata')::date
      )
    where donor.id = p_donor_id
      and rule.interval_days > 0
      and (
        rule.max_donations_per_year is null
        or rule.max_donations_per_year > 0
      )
      and public.valid_cross_component_restrictions(
        rule.cross_component_restrictions
      )
      and (
        select count(*)
        from public.donor_recovery_rules current_rule
        where current_rule.component = 'WHOLE_BLOOD'
          and current_rule.donor_gender = coalesce(donor.gender, 'Unknown')
          and current_rule.approval_status = 'approved'
          and current_rule.approved_by is not null
          and current_rule.approved_at is not null
          and current_rule.effective_from = rule.effective_from
      ) = 1
  );
$$;

revoke all on function public.has_approved_whole_blood_recovery_rule(uuid)
  from public, anon, authenticated;

create or replace function public.is_donor_recovery_restricted(p_donor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.donation_records dr
    where dr.donor_id = p_donor_id
      and (
        dr.recovery_state = 'review_required'
        or (
          dr.component = 'WHOLE_BLOOD'
          and
          dr.next_potentially_eligible_at is not null
          and dr.next_potentially_eligible_at > now()
        )
      )
  )
  or exists (
    select 1
    from public.donation_records donation
    join public.donor_recovery_rules rule on rule.id = donation.rule_id
    cross join lateral jsonb_array_elements(
      case
        when public.valid_cross_component_restrictions(
          rule.cross_component_restrictions
        ) then rule.cross_component_restrictions
        else '[]'::jsonb
      end
    ) as restriction(value)
    where donation.donor_id = p_donor_id
      and restriction.value->>'component' = 'WHOLE_BLOOD'
      and (
        (
          donation.donated_at at time zone 'Asia/Kolkata'
        )::date + (restriction.value->>'interval_days')::integer
      )::timestamp at time zone 'Asia/Kolkata' > now()
  )
  or exists (
    select 1
    from public.donation_records donation
    join public.donor_recovery_rules rule on rule.id = donation.rule_id
    where donation.donor_id = p_donor_id
      and rule.approval_status = 'approved'
      and not public.valid_cross_component_restrictions(
        rule.cross_component_restrictions
      )
  )
  or (
    exists (
      select 1
      from public.donation_records donation
      where donation.donor_id = p_donor_id
    )
    and not public.has_approved_whole_blood_recovery_rule(p_donor_id)
  )
  or exists (
    select 1
    from public.donors donor
    join public.donor_recovery_rules rule
      on rule.component = 'WHOLE_BLOOD'
      and rule.donor_gender = coalesce(donor.gender, 'Unknown')
      and rule.approval_status = 'approved'
      and rule.approved_by is not null
      and rule.approved_at is not null
      and rule.effective_from = (
        select max(current_rule.effective_from)
        from public.donor_recovery_rules current_rule
        where current_rule.component = 'WHOLE_BLOOD'
          and current_rule.donor_gender = coalesce(donor.gender, 'Unknown')
          and current_rule.approval_status = 'approved'
          and current_rule.approved_by is not null
          and current_rule.approved_at is not null
          and current_rule.effective_from <=
            (now() at time zone 'Asia/Kolkata')::date
      )
    where donor.id = p_donor_id
      and rule.max_donations_per_year is not null
      and exists (
        select 1
        from (
          select donation.donated_at,
            row_number() over (order by donation.donated_at) as ordinal,
            count(*) over () as recent_count
          from public.donation_records donation
          where donation.donor_id = donor.id
            and donation.component = 'WHOLE_BLOOD'
            and donation.donated_at >= now() - interval '365 days'
        ) recent
        where recent.recent_count >= rule.max_donations_per_year
          and recent.ordinal =
            recent.recent_count - rule.max_donations_per_year + 1
          and recent.donated_at + interval '365 days' > now()
      )
  )
  or exists (
    select 1
    from public.donors donor
    where donor.id = p_donor_id
      and donor.last_donation_date is not null
      and not exists (
        select 1
        from public.donation_records donation
        where donation.donor_id = donor.id
          and (donation.donated_at at time zone 'Asia/Kolkata')::date
            = donor.last_donation_date
      )
  )
  or exists (
    select 1
    from public.donor_medical_deferrals md
    where md.donor_id = p_donor_id
      and md.active
      and md.starts_at <= now()
      and (md.ends_at is null or md.ends_at > now())
  );
$$;

revoke all on function public.is_donor_recovery_restricted(uuid) from public;
revoke all on function public.is_donor_recovery_restricted(uuid)
  from anon, authenticated;

create or replace function public.is_eligible_blood_request(
  p_request_id uuid,
  p_donor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.blood_requests r
    join public.hospitals h on h.id = r.hospital_id
    join public.donors d on d.id = p_donor_id
    where r.id = p_request_id
      and r.component = 'WHOLE_BLOOD'
      and r.status in (
        'Verification Pending', 'Verified', 'Matching', 'Donors Contacted'
      )
      and d.available
      and d.consent
      and not public.is_donor_recovery_restricted(d.id)
      and upper(trim(r.blood_group)) = upper(trim(d.blood_group))
      and nullif(trim(h.city), '') is not null
      and nullif(trim(d.city), '') is not null
      and lower(regexp_replace(split_part(trim(d.city), ',', 1), '\s+(city|district)$', '', 'i'))
        = lower(regexp_replace(split_part(trim(h.city), ',', 1), '\s+(city|district)$', '', 'i'))
  );
$$;

revoke all on function public.is_eligible_blood_request(uuid, uuid) from public;

-- Backfill missing notifications for active requests using the final eligibility rules.
insert into public.notifications (user_id, request_id, type, title, body)
select donor.user_id, request.id, 'request', 'A blood request matches you',
  'A ' || lower(request.urgency) || ' request needs ' || request.units
    || ' unit(s) of ' || request.blood_group || ' in '
    || coalesce(nullif(hospital.city, ''), 'your area')
    || case when request.required_by is null then '.' else
      ' by ' || to_char(request.required_by at time zone 'UTC', 'DD Mon, HH24:MI') || ' UTC.' end
from public.blood_requests request
join public.hospitals hospital on hospital.id = request.hospital_id
join public.donors donor on donor.user_id is not null
where request.status in (
  'Verification Pending', 'Verified', 'Matching', 'Donors Contacted'
)
  and public.is_eligible_blood_request(request.id, donor.id)
on conflict (user_id, request_id, type) where request_id is not null do nothing;

create or replace function public.acknowledge_blood_donation(
  p_request_id uuid,
  p_donor_id uuid,
  p_component text,
  p_donated_at timestamptz,
  p_volume_ml integer default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
  v_hospital_name text;
  v_request_component text;
  v_response_status text;
  v_donor_user_id uuid;
  v_donor_gender text;
  v_existing_id uuid;
  v_donation_id uuid;
  v_rule_id uuid;
  v_rule_version text;
  v_interval_days integer;
  v_effective_from date;
  v_rule_count integer;
  v_next_eligible_at timestamptz;
  v_recovery_state text := 'review_required';
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  if p_component is null
    or p_component not in ('WHOLE_BLOOD', 'PLATELETS', 'PLASMA', 'OTHER') then
    raise exception 'Unsupported donation component.';
  end if;
  if p_donated_at is null or p_donated_at > now() then
    raise exception 'Enter a valid donation date and time.';
  end if;
  if p_volume_ml is not null and p_volume_ml <= 0 then
    raise exception 'Donation volume must be a positive number of millilitres.';
  end if;

  select h.id, h.hospital_name, r.component
  into v_hospital_id, v_hospital_name, v_request_component
  from public.blood_requests r
  join public.hospitals h on h.id = r.hospital_id
  join public.profiles p on p.id = h.user_id and p.role = 'hospital'
  where r.id = p_request_id and h.user_id = auth.uid()
  for update of r;

  if v_hospital_id is null then
    raise exception 'This request does not belong to your hospital account.';
  end if;
  if p_component <> v_request_component then
    raise exception 'The recorded donation component must match the request.';
  end if;

  select dr.id into v_existing_id
  from public.donation_records dr
  where dr.request_id = p_request_id and dr.donor_id = p_donor_id;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  select response.status, d.user_id, d.gender
  into v_response_status, v_donor_user_id, v_donor_gender
  from public.donor_responses response
  join public.donors d on d.id = response.donor_id
  where response.request_id = p_request_id
    and response.donor_id = p_donor_id
  for update of response, d;

  if not found or v_response_status not in (
    'Hospital Confirmed', 'Coordination in Progress', 'Completed'
  ) then
    raise exception 'A hospital-confirmed donor response is required before recording a donation.';
  end if;
  if v_donor_user_id is null then
    raise exception 'The donor response is not linked to an account.';
  end if;

  select count(*), max(rule.effective_from)
  into v_rule_count, v_effective_from
  from public.donor_recovery_rules rule
  where rule.component = p_component
    and rule.donor_gender = coalesce(v_donor_gender, 'Unknown')
    and rule.approval_status = 'approved'
    and rule.approved_by is not null
    and rule.approved_at is not null
    and rule.effective_from <= (p_donated_at at time zone 'Asia/Kolkata')::date;

  if v_rule_count > 0 then
    select count(*), (array_agg(rule.id))[1], min(rule.version),
      min(rule.interval_days)
    into v_rule_count, v_rule_id, v_rule_version, v_interval_days
    from public.donor_recovery_rules rule
    where rule.component = p_component
      and rule.donor_gender = coalesce(v_donor_gender, 'Unknown')
      and rule.approval_status = 'approved'
      and rule.approved_by is not null
      and rule.approved_at is not null
      and rule.effective_from = v_effective_from;

    if v_rule_count = 1 and v_interval_days > 0 then
      v_next_eligible_at :=
        (((p_donated_at at time zone 'Asia/Kolkata')::date
          + v_interval_days)::timestamp at time zone 'Asia/Kolkata');
      v_recovery_state := 'active';
    else
      v_rule_id := null;
      v_rule_version := null;
      v_next_eligible_at := null;
    end if;
  end if;

  insert into public.donation_records (
    request_id, donor_id, hospital_id, component, donated_at, volume_ml,
    confirmed_by, rule_id, rule_version, next_potentially_eligible_at,
    recovery_state
  )
  values (
    p_request_id, p_donor_id, v_hospital_id, p_component, p_donated_at,
    p_volume_ml, auth.uid(), v_rule_id, v_rule_version,
    v_next_eligible_at, v_recovery_state
  )
  returning id into v_donation_id;

  update public.donor_responses
  set status = 'Completed', updated_at = now()
  where request_id = p_request_id and donor_id = p_donor_id;

  update public.donors
  set last_donation_date = (
        select max((donation.donated_at at time zone 'Asia/Kolkata')::date)
        from public.donation_records donation
        where donation.donor_id = p_donor_id
      ),
      donations_count = donations_count + 1
  where id = p_donor_id;

  insert into public.notifications (user_id, request_id, type, title, body)
  values (
    v_donor_user_id,
    p_request_id,
    'donation_confirmed',
    'Donation recorded by the hospital',
    case when v_next_eligible_at is null then
      'Your donation was recorded. Your next potential eligibility date requires medical-policy review.'
    else
      'Your donation was recorded. Your next potential eligibility date is '
        || to_char(v_next_eligible_at at time zone 'Asia/Kolkata', 'DD Mon YYYY')
        || ', subject to medical screening.'
    end
  )
  on conflict (user_id, request_id, type) where request_id is not null do nothing;

  return v_donation_id;
end;
$$;

create or replace function public.get_hospital_donation_candidates(
  p_request_id uuid
)
returns table (
  donor_id uuid,
  donor_name text,
  blood_group text,
  response_status text,
  already_acknowledged boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.blood_requests r
    join public.hospitals h on h.id = r.hospital_id
    join public.profiles profile
      on profile.id = h.user_id and profile.role = 'hospital'
    where r.id = p_request_id and h.user_id = auth.uid()
  ) then
    raise exception 'This request does not belong to your hospital account.';
  end if;

  return query
    select d.id, d.full_name, d.blood_group, response.status,
      exists (
        select 1 from public.donation_records donation
        where donation.request_id = response.request_id
          and donation.donor_id = response.donor_id
      )
    from public.donor_responses response
    join public.donors d on d.id = response.donor_id
    where response.request_id = p_request_id
      and response.status in (
        'Hospital Confirmed', 'Coordination in Progress', 'Completed'
      )
    order by response.responded_at;
end;
$$;

drop function if exists public.get_my_donation_recovery();
create function public.get_my_donation_recovery()
returns table (
  donation_id uuid,
  request_id uuid,
  hospital_name text,
  donated_at timestamptz,
  component text,
  volume_ml integer,
  next_potentially_eligible_at timestamptz,
  recovery_state text,
  rule_version text,
  remaining_seconds bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_donor_id uuid;
begin
  select d.id into v_donor_id
  from public.donors d
  where d.user_id = auth.uid();

  if v_donor_id is null then
    raise exception 'A linked donor profile is required.';
  end if;

  return query
    select donation.id, donation.request_id, hospital.hospital_name,
      donation.donated_at, donation.component,
      donation.volume_ml, donation.next_potentially_eligible_at,
      case
        when donation.recovery_state = 'review_required' then 'review_required'
        when donation.next_potentially_eligible_at > now() then 'active'
        else 'expired'
      end,
      donation.rule_version,
      case
        when donation.next_potentially_eligible_at is null then null
        else greatest(
          0,
          extract(epoch from (donation.next_potentially_eligible_at - now()))
        )::bigint
      end
    from public.donation_records donation
    join public.hospitals hospital on hospital.id = donation.hospital_id
    where donation.donor_id = v_donor_id
    order by donation.donated_at desc;
end;
$$;

drop function if exists public.get_my_donor_recovery_status();
create function public.get_my_donor_recovery_status()
returns table (
  is_restricted boolean,
  restriction_reason text,
  eligible_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_donor_id uuid;
  v_legacy_review boolean;
  v_manual_review boolean;
  v_rule_review boolean;
  v_deferral boolean;
  v_restricted boolean;
begin
  select d.id into v_donor_id
  from public.donors d
  where d.user_id = auth.uid();

  if v_donor_id is null then
    raise exception 'A linked donor profile is required.';
  end if;

  v_legacy_review := exists (
    select 1
    from public.donors donor
    where donor.id = v_donor_id
      and donor.last_donation_date is not null
      and not exists (
        select 1
        from public.donation_records donation
        where donation.donor_id = donor.id
          and (donation.donated_at at time zone 'Asia/Kolkata')::date
            = donor.last_donation_date
      )
  );
  v_manual_review := exists (
    select 1
    from public.donation_records donation
    where donation.donor_id = v_donor_id
      and donation.recovery_state = 'review_required'
  ) or exists (
    select 1
    from public.donation_records donation
    join public.donor_recovery_rules rule on rule.id = donation.rule_id
    where donation.donor_id = v_donor_id
      and rule.approval_status = 'approved'
      and not public.valid_cross_component_restrictions(
        rule.cross_component_restrictions
      )
  );
  v_rule_review :=
    (
      exists (
        select 1
        from public.donation_records donation
        where donation.donor_id = v_donor_id
      )
      or exists (
        select 1
        from public.donors donor
        where donor.id = v_donor_id
          and donor.last_donation_date is not null
      )
    )
    and not public.has_approved_whole_blood_recovery_rule(v_donor_id);
  v_deferral := exists (
    select 1
    from public.donor_medical_deferrals deferral
    where deferral.donor_id = v_donor_id
      and deferral.active
      and deferral.starts_at <= now()
      and (deferral.ends_at is null or deferral.ends_at > now())
  );
  v_restricted := public.is_donor_recovery_restricted(v_donor_id);

  return query
  select
    v_restricted,
    case
      when v_legacy_review then 'Legacy donation history requires medical review.'
      when v_manual_review then 'A recorded donation requires medical review.'
      when v_rule_review then 'Applicable recovery rules require qualified medical approval.'
      when v_deferral then 'An active medical deferral is in effect.'
      when v_restricted then 'Recovery interval is still active.'
      else null
    end,
    case
      when not v_restricted
        or v_legacy_review
        or v_manual_review
        or v_rule_review
        or exists (
          select 1
          from public.donor_medical_deferrals deferral
          where deferral.donor_id = v_donor_id
            and deferral.active
            and deferral.starts_at <= now()
            and deferral.ends_at is null
        )
      then null
      else greatest(
        (
          select max(donation.next_potentially_eligible_at)
          from public.donation_records donation
          where donation.donor_id = v_donor_id
            and donation.component = 'WHOLE_BLOOD'
            and donation.recovery_state = 'active'
            and donation.next_potentially_eligible_at > now()
        ),
        (
          select max(
            (
              (
                donation.donated_at at time zone 'Asia/Kolkata'
              )::date + (restriction.value->>'interval_days')::integer
            )::timestamp at time zone 'Asia/Kolkata'
          )
          from public.donation_records donation
          join public.donor_recovery_rules rule on rule.id = donation.rule_id
          cross join lateral jsonb_array_elements(
            case
              when public.valid_cross_component_restrictions(
                rule.cross_component_restrictions
              ) then rule.cross_component_restrictions
              else '[]'::jsonb
            end
          ) as restriction(value)
          where donation.donor_id = v_donor_id
            and restriction.value->>'component' = 'WHOLE_BLOOD'
            and (
              (
                donation.donated_at at time zone 'Asia/Kolkata'
              )::date + (restriction.value->>'interval_days')::integer
            )::timestamp at time zone 'Asia/Kolkata' > now()
        ),
        (
          select max(recent.donated_at + interval '365 days')
          from public.donors donor
          join public.donor_recovery_rules rule
            on rule.component = 'WHOLE_BLOOD'
            and rule.donor_gender = coalesce(donor.gender, 'Unknown')
            and rule.approval_status = 'approved'
            and rule.approved_by is not null
            and rule.approved_at is not null
            and rule.effective_from = (
              select max(current_rule.effective_from)
              from public.donor_recovery_rules current_rule
              where current_rule.component = 'WHOLE_BLOOD'
                and current_rule.donor_gender = coalesce(donor.gender, 'Unknown')
                and current_rule.approval_status = 'approved'
                and current_rule.approved_by is not null
                and current_rule.approved_at is not null
                and current_rule.effective_from <=
                  (now() at time zone 'Asia/Kolkata')::date
            )
          cross join lateral (
            select recent.donated_at, recent.ordinal, recent.recent_count
            from (
              select donation.donated_at,
                row_number() over (order by donation.donated_at) as ordinal,
                count(*) over () as recent_count
              from public.donation_records donation
              where donation.donor_id = donor.id
                and donation.component = 'WHOLE_BLOOD'
                and donation.donated_at >= now() - interval '365 days'
            ) recent
            where recent.recent_count >= rule.max_donations_per_year
              and recent.ordinal =
                recent.recent_count - rule.max_donations_per_year + 1
          ) recent
          where donor.id = v_donor_id
            and rule.max_donations_per_year is not null
        ),
        (
          select max(deferral.ends_at)
          from public.donor_medical_deferrals deferral
          where deferral.donor_id = v_donor_id
            and deferral.active
            and deferral.starts_at <= now()
            and deferral.ends_at > now()
        )
      )
    end;
end;
$$;

create or replace function public.report_donation_record_issue(
  p_donation_id uuid,
  p_details text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_donor_id uuid;
  v_issue_id uuid;
begin
  if nullif(trim(p_details), '') is null then
    raise exception 'Describe the issue with this donation record.';
  end if;

  select d.id into v_donor_id
  from public.donation_records donation
  join public.donors d on d.id = donation.donor_id
  where donation.id = p_donation_id and d.user_id = auth.uid();

  if v_donor_id is null then
    raise exception 'Donation record not found for this donor account.';
  end if;

  insert into public.donation_record_issues (donation_id, donor_id, details)
  values (p_donation_id, v_donor_id, trim(p_details))
  returning id into v_issue_id;

  return v_issue_id;
end;
$$;

create or replace function public.correct_blood_donation(
  p_donation_id uuid,
  p_reason text,
  p_component text,
  p_donated_at timestamptz,
  p_volume_ml integer default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_record public.donation_records%rowtype;
  v_donor_gender text;
  v_rule_id uuid;
  v_rule_version text;
  v_interval_days integer;
  v_effective_from date;
  v_rule_count integer;
  v_next_eligible_at timestamptz;
  v_recovery_state text := 'review_required';
begin
  if nullif(trim(p_reason), '') is null then
    raise exception 'A correction reason is required for the audit trail.';
  end if;
  if p_component is null
    or p_component not in ('WHOLE_BLOOD', 'PLATELETS', 'PLASMA', 'OTHER')
    or p_donated_at is null or p_donated_at > now()
    or (p_volume_ml is not null and p_volume_ml <= 0) then
    raise exception 'The corrected donation details are invalid.';
  end if;

  select donation.* into v_record
  from public.donation_records donation
  join public.hospitals hospital on hospital.id = donation.hospital_id
  join public.profiles profile on profile.id = hospital.user_id
    and profile.role = 'hospital'
  where donation.id = p_donation_id
    and hospital.user_id = auth.uid()
  for update of donation;

  if not found then
    raise exception 'Donation record not found for this hospital account.';
  end if;

  select donor.gender into v_donor_gender
  from public.donors donor
  where donor.id = v_record.donor_id;

  select count(*), max(rule.effective_from)
  into v_rule_count, v_effective_from
  from public.donor_recovery_rules rule
  where rule.component = p_component
    and rule.donor_gender = coalesce(v_donor_gender, 'Unknown')
    and rule.approval_status = 'approved'
    and rule.approved_by is not null
    and rule.approved_at is not null
    and rule.effective_from <= (p_donated_at at time zone 'Asia/Kolkata')::date;

  if v_rule_count > 0 then
    select count(*), (array_agg(rule.id))[1], min(rule.version),
      min(rule.interval_days)
    into v_rule_count, v_rule_id, v_rule_version, v_interval_days
    from public.donor_recovery_rules rule
    where rule.component = p_component
      and rule.donor_gender = coalesce(v_donor_gender, 'Unknown')
      and rule.approval_status = 'approved'
      and rule.approved_by is not null
      and rule.approved_at is not null
      and rule.effective_from = v_effective_from;

    if v_rule_count = 1 and v_interval_days > 0 then
      v_next_eligible_at :=
        (((p_donated_at at time zone 'Asia/Kolkata')::date
          + v_interval_days)::timestamp at time zone 'Asia/Kolkata');
      v_recovery_state := 'active';
    else
      v_rule_id := null;
      v_rule_version := null;
      v_next_eligible_at := null;
    end if;
  end if;

  insert into public.donation_record_audit (
    donation_id, changed_by, change_reason, old_record, new_record
  )
  values (
    p_donation_id, auth.uid(), trim(p_reason), to_jsonb(v_record),
    jsonb_build_object(
      'component', p_component,
      'donated_at', p_donated_at,
      'volume_ml', p_volume_ml,
      'rule_id', v_rule_id,
      'rule_version', v_rule_version,
      'next_potentially_eligible_at', v_next_eligible_at,
      'recovery_state', v_recovery_state
    )
  );

  update public.donation_records
  set component = p_component,
      donated_at = p_donated_at,
      volume_ml = p_volume_ml,
      confirmed_by = auth.uid(),
      confirmed_at = now(),
      rule_id = v_rule_id,
      rule_version = v_rule_version,
      next_potentially_eligible_at = v_next_eligible_at,
      recovery_state = v_recovery_state
  where id = p_donation_id;

  update public.donors donor
  set last_donation_date = (
        select max((donation.donated_at at time zone 'Asia/Kolkata')::date)
        from public.donation_records donation
        where donation.donor_id = v_record.donor_id
      )
  where donor.id = v_record.donor_id;
end;
$$;

create or replace function public.get_eligible_blood_requests()
returns table (
  id uuid,
  hospital_id uuid,
  hospital_name text,
  blood_group text,
  units integer,
  urgency text,
  status text,
  area text,
  required_by timestamptz,
  created_at timestamptz,
  verified_by uuid,
  distance_km integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_donor_id uuid;
begin
  select d.id into v_donor_id
  from public.donors d
  where d.user_id = auth.uid();
  if v_donor_id is null then
    raise exception 'A donor profile is required.';
  end if;

  if public.is_donor_recovery_restricted(v_donor_id) then
    return query
      select r.id, r.hospital_id, h.hospital_name, r.blood_group, r.units,
        r.urgency, r.status, coalesce(nullif(h.city, ''), 'Nearby'),
        r.required_by, r.created_at, r.verified_by,
        case when r.latitude is not null and r.longitude is not null
          and d.approximate_latitude is not null
          and d.approximate_longitude is not null
        then round((6371 * 2 * asin(sqrt(
          power(sin(radians(d.approximate_latitude - r.latitude) / 2), 2)
          + cos(radians(r.latitude)) * cos(radians(d.approximate_latitude))
          * power(sin(radians(d.approximate_longitude - r.longitude) / 2), 2)
        )))::numeric)::integer else null end
      from public.blood_requests r
      join public.hospitals h on h.id = r.hospital_id
      join public.donors d on d.id = v_donor_id
      join public.donor_responses response
        on response.request_id = r.id and response.donor_id = d.id
      where r.status not in ('Fulfilled', 'Cancelled')
        and response.status not in ('Cancelled', 'Completed')
      order by response.responded_at desc;
    return;
  end if;

  return query
    select r.id, r.hospital_id, h.hospital_name, r.blood_group, r.units,
      r.urgency, r.status, coalesce(nullif(h.city, ''), 'Nearby'),
      r.required_by, r.created_at, r.verified_by,
      case when r.latitude is not null and r.longitude is not null
        and d.approximate_latitude is not null
        and d.approximate_longitude is not null
      then round((6371 * 2 * asin(sqrt(
        power(sin(radians(d.approximate_latitude - r.latitude) / 2), 2)
        + cos(radians(r.latitude)) * cos(radians(d.approximate_latitude))
        * power(sin(radians(d.approximate_longitude - r.longitude) / 2), 2)
      )))::numeric)::integer else null end
    from public.blood_requests r
    join public.hospitals h on h.id = r.hospital_id
    join public.donors d on d.id = v_donor_id
    where r.status not in ('Fulfilled', 'Cancelled')
      and (
        public.is_eligible_blood_request(r.id, v_donor_id)
      or exists (
        select 1
        from public.donor_responses response
        where response.request_id = r.id
          and response.donor_id = v_donor_id
          and response.status not in ('Cancelled', 'Completed')
      )
      )
    order by
      case r.urgency when 'CRITICAL' then 1 when 'URGENT' then 2 else 3 end,
      r.created_at desc;
end;
$$;

revoke all on function public.acknowledge_blood_donation(uuid, uuid, text, timestamptz, integer) from public;
revoke all on function public.get_hospital_donation_candidates(uuid) from public;
revoke all on function public.get_my_donation_recovery() from public;
revoke all on function public.get_my_donor_recovery_status() from public;
revoke all on function public.report_donation_record_issue(uuid, text) from public;
revoke all on function public.correct_blood_donation(uuid, text, text, timestamptz, integer) from public;
revoke all on function public.get_eligible_blood_requests() from public;
revoke all on function public.is_eligible_blood_request(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.acknowledge_blood_donation(uuid, uuid, text, timestamptz, integer) to authenticated;
grant execute on function public.get_hospital_donation_candidates(uuid) to authenticated;
grant execute on function public.get_my_donation_recovery() to authenticated;
grant execute on function public.get_my_donor_recovery_status() to authenticated;
grant execute on function public.report_donation_record_issue(uuid, text) to authenticated;
grant execute on function public.correct_blood_donation(uuid, text, text, timestamptz, integer) to authenticated;
grant execute on function public.get_eligible_blood_requests() to authenticated;

select
  request.id as request_id,
  request.blood_group,
  request.status,
  (
    select count(*)
    from public.donors donor
    where public.is_eligible_blood_request(request.id, donor.id)
  ) as eligible_donors,
  (
    select count(*)
    from public.notifications notification
    join public.donors donor on donor.user_id = notification.user_id
    where notification.request_id = request.id
      and notification.type = 'request'
      and public.is_eligible_blood_request(request.id, donor.id)
  ) as eligible_donor_notifications
from public.blood_requests request
where request.status in ('Matching', 'Donors Contacted')
order by request.created_at desc;

create or replace function public.can_access_request_notification(
  p_request_id uuid,
  p_user_id uuid,
  p_type text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select p_user_id = auth.uid()
    and (
      p_request_id is null
      or exists (
        select 1
        from public.donors donor
        where donor.user_id = auth.uid()
          and (
            public.is_eligible_blood_request(p_request_id, donor.id)
            or exists (
              select 1
              from public.donor_responses response
              join public.blood_requests request
                on request.id = response.request_id
              where response.request_id = p_request_id
                and response.donor_id = donor.id
                and response.status not in ('Cancelled', 'Completed')
                and request.status not in ('Fulfilled', 'Cancelled')
            )
            or (
              p_type = 'donation_confirmed'
              and exists (
                select 1
                from public.donation_records donation
                where donation.request_id = p_request_id
                  and donation.donor_id = donor.id
              )
            )
          )
      )
      or exists (
        select 1
        from public.blood_request_ngos assignment
        join public.ngos ngo on ngo.id = assignment.ngo_id
        where assignment.request_id = p_request_id
          and ngo.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.blood_requests request
        join public.hospitals hospital on hospital.id = request.hospital_id
        where request.id = p_request_id
          and hospital.user_id = auth.uid()
      )
    );
$$;

revoke all on function public.can_access_request_notification(uuid, uuid, text)
  from public, anon;
grant execute on function public.can_access_request_notification(uuid, uuid, text)
  to authenticated;

drop policy if exists "Users can manage their notifications"
  on public.notifications;
create policy "Users can manage their notifications"
  on public.notifications for all to authenticated
  using (
    auth.uid() = user_id
    and public.can_access_request_notification(request_id, user_id, type)
  )
  with check (
    auth.uid() = user_id
    and public.can_access_request_notification(request_id, user_id, type)
  );

notify pgrst, 'reload schema';
