alter table public.blood_requests
  add column if not exists verified_by uuid references public.ngos(id),
  add column if not exists matched_donor uuid
  references public.donors(id),
  add column if not exists hospital_contact_person text,
  add column if not exists hospital_contact_phone text,
  add column if not exists hospital_contact_email text;

do $$
declare
  allowed_statuses text;
begin
  select string_agg(quote_literal(status), ', ' order by status)
    into allowed_statuses
  from (
    select unnest(array[
      'Created',
      'Verification Pending',
      'Verified',
      'Matching',
      'Donors Contacted',
      'Donor Confirmed',
      'Hospital Confirmation',
      'Fulfilled',
      'Cancelled'
    ]::text[]) as status
    union
    select distinct status
    from public.blood_requests
    where status is not null
  ) existing_and_supported_statuses;

  alter table public.blood_requests
    drop constraint if exists blood_requests_status_check;

  execute format(
    'alter table public.blood_requests
      add constraint blood_requests_status_check check (status in (%s))',
    allowed_statuses
  );
end;
$$;

alter table public.blood_requests
  alter column status set default 'Matching';

do $$
declare
  allowed_urgencies text;
begin
  select string_agg(quote_literal(urgency), ', ' order by urgency)
    into allowed_urgencies
  from (
    select unnest(array['CRITICAL', 'URGENT', 'NORMAL']::text[]) as urgency
    union
    select distinct urgency
    from public.blood_requests
    where urgency is not null
  ) existing_and_supported_urgencies;

  alter table public.blood_requests
    drop constraint if exists blood_requests_urgency_check;

  execute format(
    'alter table public.blood_requests
      add constraint blood_requests_urgency_check check (urgency in (%s))',
    allowed_urgencies
  );
end;
$$;

create or replace function public.sync_legacy_blood_request_units()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if new.units is null then
      new.units := new.units_required;
    end if;
    new.units_required := new.units;
  elsif new.units is distinct from old.units then
    new.units_required := new.units;
  elsif new.units_required is distinct from old.units_required then
    new.units := new.units_required;
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'blood_requests'
      and column_name = 'units_required'
  ) then
    execute 'drop trigger if exists sync_legacy_blood_request_units on public.blood_requests';
    execute 'create trigger sync_legacy_blood_request_units
      before insert or update on public.blood_requests
      for each row execute function public.sync_legacy_blood_request_units()';
  else
    execute 'drop trigger if exists sync_legacy_blood_request_units on public.blood_requests';
  end if;
end;
$$;

alter table public.donors
  add column if not exists radius_km integer;

alter table public.notifications
  add column if not exists request_id uuid references public.blood_requests(id) on delete cascade,
  add column if not exists body text,
  add column if not exists message text;

update public.notifications
set body = coalesce(nullif(body, ''), nullif(message, ''), title, ''),
    message = coalesce(nullif(message, ''), nullif(body, ''), title, '');

alter table public.notifications
  alter column body set default '',
  alter column message set default '';

create or replace function public.sync_notification_body_and_message()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.body is distinct from old.body
      and new.message is not distinct from old.message then
      new.message := new.body;
    elsif new.message is distinct from old.message
      and new.body is not distinct from old.body then
      new.body := new.message;
    end if;
  end if;

  new.body := coalesce(nullif(new.body, ''), nullif(new.message, ''), new.title, '');
  new.message := coalesce(nullif(new.message, ''), nullif(new.body, ''), new.title, '');
  return new;
end;
$$;

drop trigger if exists sync_notification_body_and_message
  on public.notifications;
create trigger sync_notification_body_and_message
before insert or update of body, message on public.notifications
for each row execute function public.sync_notification_body_and_message();

create unique index if not exists notifications_request_recipient_type_uidx
  on public.notifications (user_id, request_id, type)
  where request_id is not null;

create table if not exists public.blood_request_ngos (
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  ngo_id uuid not null references public.ngos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, ngo_id)
);

create index if not exists blood_request_ngos_ngo_created_idx
  on public.blood_request_ngos (ngo_id, created_at desc);

alter table public.blood_request_ngos enable row level security;

drop policy if exists "Hospitals can create requests"
  on public.blood_requests;
create policy "Hospitals can create requests"
  on public.blood_requests for insert to authenticated
  with check (
    exists (
      select 1 from public.hospitals h
      where h.id = public.blood_requests.hospital_id
        and h.user_id = auth.uid()
    )
  );

grant select, insert on public.blood_requests to authenticated;

drop policy if exists "Users can link their legacy hospital record"
  on public.hospitals;
create policy "Users can link their legacy hospital record"
  on public.hospitals for update to authenticated
  using (
    id = auth.uid()
    and user_id is null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'hospital'
    )
  )
  with check (id = auth.uid() and user_id = auth.uid());

drop policy if exists "Verified NGOs can read their assigned requests"
  on public.blood_request_ngos;
drop policy if exists "NGOs can read their assigned requests"
  on public.blood_request_ngos;
create policy "NGOs can read their assigned requests"
  on public.blood_request_ngos for select to authenticated
  using (
    exists (
      select 1 from public.ngos n
      where n.id = ngo_id and n.user_id = auth.uid()
    )
  );
grant select on public.blood_request_ngos to authenticated;

drop policy if exists "Authenticated users can read requests"
  on public.blood_requests;
drop policy if exists "Hospitals can read their own requests"
  on public.blood_requests;
create policy "Hospitals can read their own requests"
  on public.blood_requests for select to authenticated
  using (
    exists (
      select 1 from public.hospitals h
      where h.id = public.blood_requests.hospital_id
        and h.user_id = auth.uid()
    )
  );
drop policy if exists "Assigned NGOs can read their requests"
  on public.blood_requests;
create policy "Assigned NGOs can read their requests"
  on public.blood_requests for select to authenticated
  using (
    exists (
      select 1 from public.blood_request_ngos a
      join public.ngos n on n.id = a.ngo_id
      where a.request_id = public.blood_requests.id
        and n.user_id = auth.uid()
    )
  );

drop policy if exists "Hospitals can update their requests"
  on public.blood_requests;
create policy "Hospitals can update their requests"
  on public.blood_requests for update to authenticated
  using (
    exists (
      select 1 from public.hospitals h
      where h.id = public.blood_requests.hospital_id
        and h.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.hospitals h
      where h.id = public.blood_requests.hospital_id
        and h.user_id = auth.uid()
    )
  );

create or replace function public.blood_groups_compatible(
  request_group text,
  donor_group text
)
returns boolean
language sql
immutable
as $$
  select case request_group
    when 'O+' then donor_group in ('O+', 'O-')
    when 'O-' then donor_group = 'O-'
    when 'A+' then donor_group in ('A+', 'A-', 'O+', 'O-')
    when 'A-' then donor_group in ('A-', 'O-')
    when 'B+' then donor_group in ('B+', 'B-', 'O+', 'O-')
    when 'B-' then donor_group in ('B-', 'O-')
    when 'AB+' then donor_group in ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')
    when 'AB-' then donor_group in ('A-', 'B-', 'O-', 'AB-')
    else false
  end;
$$;

create or replace function public.is_eligible_blood_request(
  p_request_id uuid,
  p_donor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blood_requests r
    join public.hospitals h on h.id = r.hospital_id
    join public.donors d on d.id = p_donor_id
    where r.id = p_request_id
      and (
        r.status in ('Verification Pending', 'Verified', 'Matching', 'Donors Contacted')
        or (
          r.status in ('Donor Confirmed', 'Hospital Confirmation')
          and r.matched_donor = p_donor_id
        )
      )
      and d.available
      and d.consent
      and upper(trim(r.blood_group)) = upper(trim(d.blood_group))
      and nullif(trim(h.city), '') is not null
      and nullif(trim(d.city), '') is not null
      and lower(regexp_replace(split_part(trim(d.city), ',', 1), '\s+(city|district)$', '', 'i'))
        = lower(regexp_replace(split_part(trim(h.city), ',', 1), '\s+(city|district)$', '', 'i'))
  );
$$;

revoke all on function public.is_eligible_blood_request(uuid, uuid) from public;

create or replace function public.guard_blood_request_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hospital_owns_request boolean;
  ngo_assigned_request boolean;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'Matching'
      or new.verified_by is not null
      or new.matched_donor is not null then
      raise exception 'New blood requests must start in Matching status.';
    end if;
    return new;
  end if;

  if new.verified_by is distinct from old.verified_by then
    raise exception 'Request verification is disabled for the prototype.';
  end if;

  if new.status is distinct from old.status then
    select exists (
      select 1 from public.hospitals h
      where h.id = old.hospital_id and h.user_id = auth.uid()
    ) into hospital_owns_request;

    select exists (
      select 1 from public.blood_request_ngos a
      join public.ngos n on n.id = a.ngo_id
      where a.request_id = new.id and n.user_id = auth.uid()
    ) into ngo_assigned_request;

    if old.status in ('Fulfilled', 'Cancelled') then
      raise exception 'A closed blood request cannot change status.';
    elsif new.status = 'Cancelled' then
      if not hospital_owns_request
        or old.status in ('Donor Confirmed', 'Hospital Confirmation') then
        raise exception 'Only the hospital can cancel this request.';
      end if;
    elsif new.status = 'Fulfilled' then
      if hospital_owns_request then
        if old.status not in (
          'Verified', 'Verification Pending', 'Donor Confirmed',
          'Hospital Confirmation', 'Matching', 'Donors Contacted'
        ) then
          raise exception 'The hospital can fulfill only a request in coordination.';
        end if;
      elsif not ngo_assigned_request
        and not exists (
          select 1 from public.donor_responses dr
          where dr.request_id = new.id
            and dr.donor_id = new.matched_donor
            and dr.status = 'Completed'
        ) then
        raise exception 'This role cannot fulfill the request.';
      end if;
    elsif new.status = 'Matching'
      and old.status in ('Donor Confirmed', 'Hospital Confirmation')
      and new.matched_donor is null
      and exists (
        select 1 from public.donor_responses dr
        where dr.request_id = new.id
          and dr.donor_id = old.matched_donor
          and dr.status = 'Cancelled'
      ) then
      null;
    elsif new.status = 'Donors Contacted'
      or (new.status = 'Matching' and new.matched_donor is null) then
      if not hospital_owns_request and not ngo_assigned_request then
        raise exception 'Only the hospital or an assigned NGO can coordinate this request.';
      end if;
    elsif new.status in ('Donor Confirmed', 'Hospital Confirmation', 'Matching') then
      if new.matched_donor is null or not exists (
        select 1
        from public.donor_responses dr
        where dr.request_id = new.id
          and dr.donor_id = new.matched_donor
          and (
            (new.status = 'Donor Confirmed' and dr.status = 'Response Sent')
            or (new.status = 'Hospital Confirmation' and dr.status = 'Hospital Confirmed')
            or (new.status = 'Matching' and dr.status = 'Coordination in Progress')
          )
      ) then
        raise exception 'Request status must be synchronized from a valid donor response.';
      end if;
    else
      raise exception 'Unsupported blood request status transition.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_blood_request_workflow
  on public.blood_requests;
create trigger guard_blood_request_workflow
before insert or update on public.blood_requests
for each row execute function public.guard_blood_request_workflow();

do $$
declare
  obsolete_trigger record;
begin
  for obsolete_trigger in
    select trigger_row.tgname
    from pg_trigger trigger_row
    join pg_proc trigger_function
      on trigger_function.oid = trigger_row.tgfoid
    where trigger_row.tgrelid = 'public.blood_requests'::regclass
      and not trigger_row.tgisinternal
      and position(
        'New requests must enter the verification workflow first'
        in trigger_function.prosrc
      ) > 0
  loop
    execute format(
      'drop trigger %I on public.blood_requests',
      obsolete_trigger.tgname
    );
  end loop;
end;
$$;

create or replace function public.distribute_new_blood_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.blood_request_ngos (request_id, ngo_id)
  select new.id, n.id
  from public.ngos n
  on conflict (request_id, ngo_id) do nothing;

  insert into public.notifications (user_id, request_id, type, title, body)
  select n.user_id, new.id, 'request', 'New blood request for coordination',
    'A ' || lower(new.urgency) || ' request for ' || new.units || ' unit(s) of '
      || new.blood_group || ' needs coordination.'
  from public.blood_request_ngos a
  join public.ngos n on n.id = a.ngo_id
  where a.request_id = new.id and n.user_id is not null
  on conflict (user_id, request_id, type) where request_id is not null do nothing;

  if not exists (
    select 1 from public.blood_request_ngos a where a.request_id = new.id
  ) then
    insert into public.notifications (user_id, request_id, type, title, body)
    values (
      new.hospital_id, new.id, 'system', 'No local NGO matched this request',
      'Your request was saved, but no NGO profiles are available to coordinate it yet.'
    )
    on conflict (user_id, request_id, type) where request_id is not null do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists distribute_new_blood_request on public.blood_requests;
create trigger distribute_new_blood_request
after insert on public.blood_requests
for each row execute function public.distribute_new_blood_request();

create or replace function public.assign_active_requests_to_ngo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.blood_request_ngos (request_id, ngo_id)
  select r.id, new.id
  from public.blood_requests r
  where r.status in (
    'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
    'Donor Confirmed', 'Hospital Confirmation'
  )
  on conflict (request_id, ngo_id) do nothing;

  insert into public.notifications (user_id, request_id, type, title, body)
  select new.user_id, a.request_id, 'request', 'New blood request for coordination',
    'A blood request needs coordination.'
  from public.blood_request_ngos a
  join public.blood_requests r on r.id = a.request_id
  where a.ngo_id = new.id and r.status in (
    'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
    'Donor Confirmed', 'Hospital Confirmation'
  )
  on conflict (user_id, request_id, type) where request_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists assign_pending_requests_to_verified_ngo
  on public.ngos;
drop trigger if exists assign_active_requests_to_ngo
  on public.ngos;
create trigger assign_active_requests_to_ngo
after insert or update of user_id, areas_served, city, latitude, longitude
on public.ngos
for each row execute function public.assign_active_requests_to_ngo();

insert into public.blood_request_ngos (request_id, ngo_id)
select request.id, ngo.id
from public.blood_requests request
cross join public.ngos ngo
where request.status in (
  'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
  'Donor Confirmed', 'Hospital Confirmation'
)
on conflict (request_id, ngo_id) do nothing;

insert into public.notifications (user_id, request_id, type, title, body)
select ngo.user_id, assignment.request_id, 'request',
  'New blood request for coordination',
  'A blood request needs coordination.'
from public.blood_request_ngos assignment
join public.ngos ngo on ngo.id = assignment.ngo_id
join public.blood_requests request on request.id = assignment.request_id
where request.status in (
  'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
  'Donor Confirmed', 'Hospital Confirmation'
)
  and ngo.user_id is not null
on conflict (user_id, request_id, type) where request_id is not null do nothing;

create or replace function public.notify_eligible_donors_on_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hospital_city text;
begin
  if new.status in (
    'Verification Pending', 'Verified', 'Matching', 'Donors Contacted'
  ) then
    if tg_op = 'UPDATE' and old.status in ('Matching', 'Donors Contacted') then
      return new;
    end if;
    select h.city into hospital_city
    from public.hospitals h
    where h.id = new.hospital_id;

    insert into public.notifications (user_id, request_id, type, title, body)
    select d.user_id, new.id, 'request', 'A blood request matches you',
      'A ' || lower(new.urgency) || ' request needs ' || new.units
        || ' unit(s) of ' || new.blood_group || ' in '
        || coalesce(nullif(hospital_city, ''), 'your area')
        || case when new.required_by is null then '.' else
          ' by ' || to_char(new.required_by at time zone 'UTC', 'DD Mon, HH24:MI') || ' UTC.' end
    from public.donors d
    where d.user_id is not null
      and public.is_eligible_blood_request(new.id, d.id)
    on conflict (user_id, request_id, type) where request_id is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_eligible_donors_on_verification
  on public.blood_requests;
drop trigger if exists distribute_eligible_donors_on_request
  on public.blood_requests;
create trigger distribute_eligible_donors_on_request
after insert or update of status on public.blood_requests
for each row execute function public.notify_eligible_donors_on_request();

create or replace function public.notify_newly_eligible_donor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null or not new.available or not new.consent then
    return new;
  end if;

  insert into public.notifications (user_id, request_id, type, title, body)
  select new.user_id, r.id, 'request', 'A blood request matches you',
    'A ' || lower(r.urgency) || ' request needs ' || r.units
      || ' unit(s) of ' || r.blood_group || ' in '
      || coalesce(nullif(h.city, ''), 'your area')
      || case when r.required_by is null then '.' else
        ' by ' || to_char(r.required_by at time zone 'UTC', 'DD Mon, HH24:MI') || ' UTC.' end
  from public.blood_requests r
  join public.hospitals h on h.id = r.hospital_id
  where r.status in (
    'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
    'Donor Confirmed', 'Hospital Confirmation'
  )
    and public.is_eligible_blood_request(r.id, new.id)
  on conflict (user_id, request_id, type) where request_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists notify_newly_eligible_donor on public.donors;
create trigger notify_newly_eligible_donor
after insert or update of user_id, blood_group, available, consent,
  approximate_latitude, approximate_longitude, city, radius, radius_km
on public.donors
for each row execute function public.notify_newly_eligible_donor();

drop trigger if exists notify_hospital_of_request_verification
  on public.blood_requests;
drop function if exists public.notify_hospital_of_request_verification();

drop function if exists public.get_ngo_blood_requests();
create function public.get_ngo_blood_requests()
returns table (
  id uuid,
  hospital_id uuid,
  hospital_name text,
  hospital_contact_person text,
  hospital_contact_phone text,
  hospital_contact_email text,
  blood_group text,
  units integer,
  urgency text,
  status text,
  area text,
  department text,
  required_by timestamptz,
  latitude double precision,
  longitude double precision,
  location_address text,
  patient_age integer,
  notes text,
  verified_by uuid,
  matched_donor uuid,
  fulfilled_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  request_ngo_id uuid;
begin
  select n.id into request_ngo_id
  from public.ngos n
  where n.user_id = auth.uid();

  if request_ngo_id is null then
    raise exception 'A linked NGO profile is required to load assigned requests.';
  end if;

  return query
    select r.id, r.hospital_id, h.hospital_name,
      r.hospital_contact_person, r.hospital_contact_phone,
      r.hospital_contact_email, r.blood_group, r.units,
      r.urgency, r.status, r.area, r.department, r.required_by, r.latitude,
      r.longitude, r.location_address, r.patient_age, r.notes, r.verified_by,
      r.matched_donor, r.fulfilled_at, r.created_at
    from public.blood_requests r
    join public.hospitals h on h.id = r.hospital_id
    join public.blood_request_ngos a on a.request_id = r.id
    join public.ngos n on n.id = a.ngo_id
    where n.id = request_ngo_id and n.user_id = auth.uid()
    order by r.created_at desc;
end;
$$;

drop function if exists public.verify_blood_request(uuid);

create or replace function public.complete_ngo_blood_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.blood_request_ngos a
    join public.ngos n on n.id = a.ngo_id
    where a.request_id = p_request_id
      and n.user_id = auth.uid()
  ) then
    raise exception 'This request is not assigned to your NGO.';
  end if;

  update public.blood_requests
  set status = 'Fulfilled', fulfilled_at = now()
  where id = p_request_id
    and status in (
      'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
      'Donor Confirmed', 'Hospital Confirmation'
    );
  if not found then
    raise exception 'This request cannot be marked fulfilled.';
  end if;
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
set search_path = public
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
    where public.is_eligible_blood_request(r.id, v_donor_id)
      or exists (
        select 1 from public.donor_responses dr
        where dr.request_id = r.id and dr.donor_id = v_donor_id
      )
    order by
      case r.urgency when 'CRITICAL' then 1 when 'URGENT' then 2 else 3 end,
      r.created_at desc;
end;
$$;

create or replace function public.get_ngo_donor_matches(p_request_id uuid)
returns table (
  donor_id uuid,
  blood_group text,
  city text,
  notified boolean,
  response_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.blood_request_ngos a
    join public.ngos n on n.id = a.ngo_id
    join public.blood_requests r on r.id = a.request_id
    where a.request_id = p_request_id and n.user_id = auth.uid()
      and r.status in (
        'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
        'Donor Confirmed', 'Hospital Confirmation'
      )
  ) then
    raise exception 'An active request assigned to your NGO is required.';
  end if;

  return query
    select d.id, d.blood_group, d.city,
      exists (
        select 1 from public.notifications n
        where n.user_id = d.user_id and n.request_id = r.id and n.type = 'request'
      ),
      (select dr.status from public.donor_responses dr
        where dr.request_id = r.id and dr.donor_id = d.id)
    from public.blood_requests r
    join public.donors d on public.is_eligible_blood_request(r.id, d.id)
    where r.id = p_request_id
    order by d.city, d.blood_group;
end;
$$;

create or replace function public.respond_to_blood_request(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_donor_id uuid;
  v_request_status text;
  v_existing_status text;
begin
  select d.id into v_donor_id
  from public.donors d
  where d.user_id = auth.uid() and d.available and d.consent;
  if v_donor_id is null then
    raise exception 'An available donor profile with outreach consent is required.';
  end if;

  select r.status into v_request_status
  from public.blood_requests r
  where r.id = p_request_id
  for update;
  if not found then
    raise exception 'Blood request not found.';
  end if;

  select dr.status into v_existing_status
  from public.donor_responses dr
  where dr.request_id = p_request_id and dr.donor_id = v_donor_id;
  if found then
    return v_existing_status;
  end if;

  if v_request_status not in (
    'Verification Pending', 'Verified', 'Matching', 'Donors Contacted'
  ) then
    raise exception 'This request is no longer accepting responses.';
  end if;
  if not public.is_eligible_blood_request(p_request_id, v_donor_id) then
    raise exception 'This request is not available to your donor profile.';
  end if;

  insert into public.donor_responses (request_id, donor_id, status)
  values (p_request_id, v_donor_id, 'Response Sent');

  return 'Response Sent';
end;
$$;

create or replace function public.notify_hospital_of_donor_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hospital_id uuid;
  v_request_id uuid;
begin
  if new.status = 'Response Sent' then
    if tg_op = 'UPDATE' and old.status = 'Response Sent' then
      return new;
    end if;
    select r.hospital_id, r.id into v_hospital_id, v_request_id
    from public.blood_requests r
    where r.id = new.request_id;

    if coalesce((
      select p.new_donor_response
      from public.hospital_notification_preferences p
      where p.hospital_id = v_hospital_id
    ), true) then
      insert into public.notifications (user_id, request_id, type, title, body)
      values (
        v_hospital_id, v_request_id, 'match', 'Donor response received',
        'A donor has responded to blood request ' || v_request_id::text || '.'
      )
      on conflict (user_id, request_id, type) where request_id is not null do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_hospital_of_donor_response
  on public.donor_responses;
create trigger notify_hospital_of_donor_response
after insert or update of status on public.donor_responses
for each row execute function public.notify_hospital_of_donor_response();

create or replace function public.sync_blood_request_from_donor_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_donor_id uuid;
begin
  if new.status = 'Cancelled' then
    if tg_op = 'UPDATE' and old.status is distinct from 'Cancelled' then
      select dr.donor_id into next_donor_id
      from public.donor_responses dr
      where dr.request_id = new.request_id
        and dr.id <> new.id and dr.status <> 'Cancelled'
      order by dr.responded_at
      limit 1;

      update public.blood_requests r
      set matched_donor = case
            when r.matched_donor = old.donor_id then next_donor_id
            else r.matched_donor
          end,
          status = case
            when r.matched_donor = old.donor_id and next_donor_id is null
              then 'Matching'
            when r.matched_donor = old.donor_id
              then 'Donor Confirmed'
            else r.status
          end
      where r.id = new.request_id and r.status not in ('Fulfilled', 'Cancelled');
    end if;
    return new;
  end if;

  update public.blood_requests r
  set status = case new.status
        when 'Hospital Confirmed' then 'Hospital Confirmation'
        when 'Coordination in Progress' then 'Matching'
        when 'Completed' then 'Fulfilled'
        else 'Donor Confirmed'
      end,
      matched_donor = coalesce(r.matched_donor, new.donor_id),
      fulfilled_at = case when new.status = 'Completed' then now() else r.fulfilled_at end
  where r.id = new.request_id
    and r.status not in ('Fulfilled', 'Cancelled')
    and (r.matched_donor is null or r.matched_donor = new.donor_id);

  return new;
end;
$$;

drop trigger if exists sync_blood_request_from_donor_response
  on public.donor_responses;
create trigger sync_blood_request_from_donor_response
after insert or update of status on public.donor_responses
for each row execute function public.sync_blood_request_from_donor_response();

create or replace function public.notify_hospital_of_request_fulfillment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Fulfilled' and old.status is distinct from 'Fulfilled'
    and coalesce((
      select p.request_fulfillment
      from public.hospital_notification_preferences p
      where p.hospital_id = new.hospital_id
    ), true) then
    insert into public.notifications (user_id, request_id, type, title, body)
    values (
      new.hospital_id, new.id, 'system', 'Blood request fulfilled',
      'Your blood request ' || new.id::text || ' has been marked fulfilled.'
    )
    on conflict (user_id, request_id, type) where request_id is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_hospital_of_request_fulfillment
  on public.blood_requests;
create trigger notify_hospital_of_request_fulfillment
after update of status on public.blood_requests
for each row execute function public.notify_hospital_of_request_fulfillment();

drop policy if exists "Donors can manage their own responses"
  on public.donor_responses;
drop policy if exists "Donors can read their own responses"
  on public.donor_responses;
create policy "Donors can read their own responses"
  on public.donor_responses for select to authenticated
  using (
    exists (
      select 1 from public.donors d
      where d.id = donor_id and d.user_id = auth.uid()
    )
  );
drop policy if exists "Eligible donors can create their own responses"
  on public.donor_responses;
drop policy if exists "Donors can update their own responses"
  on public.donor_responses;
create policy "Donors can update their own responses"
  on public.donor_responses for update to authenticated
  using (
    exists (
      select 1 from public.donors d
      where d.id = donor_id and d.user_id = auth.uid()
    )
    and status = 'Response Sent'
  )
  with check (
    exists (
      select 1 from public.donors d
      where d.id = donor_id and d.user_id = auth.uid()
    )
    and status = 'Cancelled'
  );

revoke all on function public.get_ngo_blood_requests() from public;
revoke all on function public.guard_blood_request_workflow() from public;
revoke all on function public.complete_ngo_blood_request(uuid) from public;
revoke all on function public.get_eligible_blood_requests() from public;
revoke all on function public.get_ngo_donor_matches(uuid) from public;
revoke all on function public.respond_to_blood_request(uuid) from public;
grant execute on function public.get_ngo_blood_requests() to authenticated;
grant execute on function public.complete_ngo_blood_request(uuid) to authenticated;
grant execute on function public.get_eligible_blood_requests() to authenticated;
grant execute on function public.get_ngo_donor_matches(uuid) to authenticated;
grant execute on function public.respond_to_blood_request(uuid) to authenticated;

notify pgrst, 'reload schema';

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.blood_requests'::regclass
  and conname = 'blood_requests_status_check';

select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'blood_requests'
      and column_name = 'units_required'
  ) as has_legacy_units_required,
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.blood_requests'::regclass
      and tgname = 'sync_legacy_blood_request_units'
      and not tgisinternal
  ) as legacy_units_sync_trigger_installed,
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.blood_requests'::regclass
      and tgname = 'distribute_new_blood_request'
      and not tgisinternal
  ) as ngo_distribution_trigger_installed,
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.blood_requests'::regclass
      and tgname = 'guard_blood_request_workflow'
      and not tgisinternal
  ) as active_request_workflow_trigger_installed,
  exists (
    select 1
    from pg_trigger trigger_row
    join pg_proc trigger_function
      on trigger_function.oid = trigger_row.tgfoid
    where trigger_row.tgrelid = 'public.blood_requests'::regclass
      and not trigger_row.tgisinternal
      and position(
        'New requests must enter the verification workflow first'
        in trigger_function.prosrc
      ) > 0
  ) as obsolete_request_verification_trigger_installed,
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.blood_requests'::regclass
      and tgname = 'distribute_eligible_donors_on_request'
      and not tgisinternal
  ) as eligible_donor_distribution_trigger_installed;

select
  request.id as request_id,
  (select count(*) from public.ngos) as total_ngo_profiles,
  count(distinct assignment.ngo_id) as assigned_ngo_profiles
from public.blood_requests request
left join public.blood_request_ngos assignment
  on assignment.request_id = request.id
where request.status in (
  'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
  'Donor Confirmed', 'Hospital Confirmation'
)
group by request.id
order by request.created_at desc;
