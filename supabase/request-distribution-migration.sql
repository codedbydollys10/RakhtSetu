alter table public.notifications
  add column if not exists request_id uuid references public.blood_requests(id) on delete cascade;

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

drop policy if exists "Verified NGOs can read their assigned requests"
  on public.blood_request_ngos;
create policy "Verified NGOs can read their assigned requests"
  on public.blood_request_ngos for select to authenticated
  using (
    exists (
      select 1 from public.ngos n
      where n.id = ngo_id and n.user_id = auth.uid() and n.verified
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
        and n.verified
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
        r.status in ('Verified', 'Matching', 'Donors Contacted')
        or (
          r.status in ('Donor Confirmed', 'Hospital Confirmation')
          and r.matched_donor = p_donor_id
        )
      )
      and d.available
      and d.verified
      and d.consent
      and public.blood_groups_compatible(r.blood_group, d.blood_group)
      and (
        (
          r.latitude is not null and r.longitude is not null
          and d.approximate_latitude is not null
          and d.approximate_longitude is not null
          and 6371 * 2 * asin(sqrt(
            power(sin(radians(d.approximate_latitude - r.latitude) / 2), 2)
            + cos(radians(r.latitude)) * cos(radians(d.approximate_latitude))
            * power(sin(radians(d.approximate_longitude - r.longitude) / 2), 2)
          )) <= coalesce(nullif(d.radius_km, 0), nullif(d.radius, 0), 50)
        )
        or (
          (r.latitude is null or r.longitude is null
            or d.approximate_latitude is null or d.approximate_longitude is null)
          and nullif(trim(h.city), '') is not null
          and lower(trim(d.city)) = lower(trim(h.city))
        )
      )
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
  authenticated_ngo_id uuid;
begin
  select n.id into authenticated_ngo_id
  from public.ngos n
  where n.user_id = auth.uid() and n.verified;

  if tg_op = 'INSERT' then
    if new.status <> 'Verification Pending'
      or new.verified_by is not null
      or new.matched_donor is not null then
      raise exception 'New requests must enter the verification workflow first.';
    end if;
    return new;
  end if;

  if new.verified_by is distinct from old.verified_by then
    if old.status <> 'Verification Pending'
      or new.status <> 'Verified'
      or new.verified_by is distinct from authenticated_ngo_id
      or not exists (
        select 1
        from public.ngos n
        join public.blood_request_ngos a on a.ngo_id = n.id
        where n.user_id = auth.uid()
          and n.verified
          and a.request_id = new.id
      ) then
      raise exception 'Only an assigned, verified NGO can verify this request.';
    end if;
  end if;

  if new.status is distinct from old.status then
    if old.status in ('Fulfilled', 'Cancelled') then
      raise exception 'A closed blood request cannot change status.';
    elsif new.status = 'Verified' then
      if old.status in ('Donor Confirmed', 'Hospital Confirmation')
        and new.matched_donor is null
        and new.verified_by is not distinct from old.verified_by
        and exists (
          select 1 from public.donor_responses dr
          where dr.request_id = new.id
            and dr.donor_id = old.matched_donor
            and dr.status = 'Cancelled'
        ) then
        null;
      elsif new.verified_by is distinct from authenticated_ngo_id
        or not exists (
          select 1
          from public.ngos n
          join public.blood_request_ngos a on a.ngo_id = n.id
          where n.user_id = auth.uid()
            and n.verified
            and a.request_id = new.id
        ) then
        raise exception 'Only an assigned, verified NGO can verify this request.';
      end if;
    elsif new.status = 'Cancelled' then
      if not exists (
          select 1 from public.hospitals h
          where h.id = old.hospital_id and h.user_id = auth.uid()
        )
        or old.status in ('Donor Confirmed', 'Hospital Confirmation') then
        raise exception 'Only the hospital can cancel this request.';
      end if;
    elsif new.status = 'Fulfilled' then
      if exists (
        select 1 from public.hospitals h
        where h.id = old.hospital_id and h.user_id = auth.uid()
      ) then
        if old.status not in (
          'Donor Confirmed', 'Hospital Confirmation', 'Matching', 'Donors Contacted'
        ) then
          raise exception 'The hospital can fulfill only a request in coordination.';
        end if;
      elsif not exists (
          select 1
          from public.blood_request_ngos a
          join public.ngos n on n.id = a.ngo_id
          where a.request_id = new.id
            and n.user_id = auth.uid()
            and n.verified
        )
        and not exists (
          select 1 from public.donor_responses dr
          where dr.request_id = new.id
            and dr.donor_id = new.matched_donor
            and dr.status = 'Completed'
        ) then
        raise exception 'This role cannot fulfill the request.';
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

create or replace function public.distribute_new_blood_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hospital_city text;
begin
  select h.city into hospital_city
  from public.hospitals h
  where h.id = new.hospital_id;

  insert into public.blood_request_ngos (request_id, ngo_id)
  select new.id, n.id
  from public.ngos n
  where n.verified
    and (
      (
        new.latitude is not null and new.longitude is not null
        and n.latitude is not null and n.longitude is not null
        and 6371 * 2 * asin(sqrt(
          power(sin(radians(n.latitude - new.latitude) / 2), 2)
          + cos(radians(new.latitude)) * cos(radians(n.latitude))
          * power(sin(radians(n.longitude - new.longitude) / 2), 2)
        )) <= 50
      )
      or (
        nullif(trim(new.area), '') is not null
        and nullif(trim(n.areas_served), '') is not null
        and position(lower(trim(new.area)) in lower(n.areas_served)) > 0
      )
      or (
        nullif(trim(hospital_city), '') is not null
        and (
          lower(trim(n.city)) = lower(trim(hospital_city))
          or position(lower(trim(hospital_city)) in lower(coalesce(n.areas_served, ''))) > 0
        )
      )
    )
  on conflict (request_id, ngo_id) do nothing;

  insert into public.notifications (user_id, request_id, type, title, body)
  select n.user_id, new.id, 'request', 'Blood request needs verification',
    'A ' || lower(new.urgency) || ' request for ' || new.units || ' unit(s) of '
      || new.blood_group || ' needs review in '
      || coalesce(nullif(new.area, ''), nullif(hospital_city, ''), 'your service area') || '.'
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
      'Your request was saved, but no verified NGO matched its location or service area. Review the hospital location and NGO service coverage.'
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

create or replace function public.assign_pending_requests_to_verified_ngo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.verified or new.user_id is null then
    return new;
  end if;

  insert into public.blood_request_ngos (request_id, ngo_id)
  select r.id, new.id
  from public.blood_requests r
  join public.hospitals h on h.id = r.hospital_id
  where r.status = 'Verification Pending'
    and (
      (
        r.latitude is not null and r.longitude is not null
        and new.latitude is not null and new.longitude is not null
        and 6371 * 2 * asin(sqrt(
          power(sin(radians(new.latitude - r.latitude) / 2), 2)
          + cos(radians(r.latitude)) * cos(radians(new.latitude))
          * power(sin(radians(new.longitude - r.longitude) / 2), 2)
        )) <= 50
      )
      or (
        nullif(trim(r.area), '') is not null
        and nullif(trim(new.areas_served), '') is not null
        and position(lower(trim(r.area)) in lower(new.areas_served)) > 0
      )
      or (
        nullif(trim(h.city), '') is not null
        and (
          lower(trim(new.city)) = lower(trim(h.city))
          or position(lower(trim(h.city)) in lower(coalesce(new.areas_served, ''))) > 0
        )
      )
    )
  on conflict (request_id, ngo_id) do nothing;

  insert into public.notifications (user_id, request_id, type, title, body)
  select new.user_id, a.request_id, 'request', 'Blood request needs verification',
    'A blood request needs review in your service area.'
  from public.blood_request_ngos a
  join public.blood_requests r on r.id = a.request_id
  where a.ngo_id = new.id and r.status = 'Verification Pending'
  on conflict (user_id, request_id, type) where request_id is not null do nothing;

  update public.notifications
  set read = true
  where user_id in (
      select h.id
      from public.hospitals h
      join public.blood_requests r on r.hospital_id = h.id
      join public.blood_request_ngos a on a.request_id = r.id
      where a.ngo_id = new.id and r.status = 'Verification Pending'
    )
    and request_id in (
      select a.request_id from public.blood_request_ngos a
      where a.ngo_id = new.id
    )
    and type = 'system'
    and title = 'No local NGO matched this request';

  return new;
end;
$$;

drop trigger if exists assign_pending_requests_to_verified_ngo
  on public.ngos;
create trigger assign_pending_requests_to_verified_ngo
after insert or update of verified, areas_served, city, latitude, longitude
on public.ngos
for each row execute function public.assign_pending_requests_to_verified_ngo();

create or replace function public.notify_eligible_donors_on_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hospital_city text;
begin
  if new.status = 'Verified' then
    if tg_op = 'UPDATE' and old.status = 'Verified' then
      return new;
    end if;
    select h.city into hospital_city
    from public.hospitals h
    where h.id = new.hospital_id;

    insert into public.notifications (user_id, request_id, type, title, body)
    select d.user_id, new.id, 'request', 'A blood request matches you',
      'A verified ' || lower(new.urgency) || ' request needs ' || new.units
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
create trigger notify_eligible_donors_on_verification
after insert or update of status on public.blood_requests
for each row execute function public.notify_eligible_donors_on_verification();

create or replace function public.notify_newly_eligible_donor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null or not new.available or not new.verified or not new.consent then
    return new;
  end if;

  insert into public.notifications (user_id, request_id, type, title, body)
  select new.user_id, r.id, 'request', 'A blood request matches you',
    'A verified ' || lower(r.urgency) || ' request needs ' || r.units
      || ' unit(s) of ' || r.blood_group || ' in '
      || coalesce(nullif(h.city, ''), 'your area')
      || case when r.required_by is null then '.' else
        ' by ' || to_char(r.required_by at time zone 'UTC', 'DD Mon, HH24:MI') || ' UTC.' end
  from public.blood_requests r
  join public.hospitals h on h.id = r.hospital_id
  where r.status in (
      'Verified', 'Matching', 'Donors Contacted',
      'Donor Confirmed', 'Hospital Confirmation'
    )
    and public.is_eligible_blood_request(r.id, new.id)
  on conflict (user_id, request_id, type) where request_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists notify_newly_eligible_donor on public.donors;
create trigger notify_newly_eligible_donor
after insert or update of blood_group, available, verified, consent,
  approximate_latitude, approximate_longitude, city, radius, radius_km
on public.donors
for each row execute function public.notify_newly_eligible_donor();

create or replace function public.notify_hospital_of_request_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Verified' then
    if tg_op = 'UPDATE' and old.status = 'Verified' then
      return new;
    end if;
    if coalesce((
        select p.request_verification
        from public.hospital_notification_preferences p
        where p.hospital_id = new.hospital_id
      ), true) then
      insert into public.notifications (user_id, request_id, type, title, body)
      values (
        new.hospital_id, new.id, 'verified', 'Blood request verified',
        'Your request ' || new.id::text || ' has been verified for donor outreach.'
      )
      on conflict (user_id, request_id, type) where request_id is not null do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_hospital_of_request_verification
  on public.blood_requests;
create trigger notify_hospital_of_request_verification
after insert or update of status on public.blood_requests
for each row execute function public.notify_hospital_of_request_verification();

create or replace function public.get_ngo_blood_requests()
returns table (
  id uuid,
  hospital_id uuid,
  hospital_name text,
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
begin
  if not exists (
    select 1 from public.ngos n
    where n.user_id = auth.uid() and n.verified
  ) then
    raise exception 'Only verified NGOs can review blood requests.';
  end if;

  return query
    select r.id, r.hospital_id, h.hospital_name, r.blood_group, r.units,
      r.urgency, r.status, r.area, r.department, r.required_by, r.latitude,
      r.longitude, r.location_address, r.patient_age, r.notes, r.verified_by,
      r.matched_donor, r.fulfilled_at, r.created_at
    from public.blood_requests r
    join public.hospitals h on h.id = r.hospital_id
    join public.blood_request_ngos a on a.request_id = r.id
    join public.ngos n on n.id = a.ngo_id
    where n.user_id = auth.uid()
    order by r.created_at desc;
end;
$$;

create or replace function public.verify_blood_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_status text;
  request_verifier uuid;
  request_ngo_id uuid;
begin
  select n.id into request_ngo_id
  from public.ngos n
  where n.user_id = auth.uid() and n.verified;

  if request_ngo_id is null then
    raise exception 'Only verified NGOs can verify blood requests.';
  end if;

  select r.status, r.verified_by
  into request_status, request_verifier
  from public.blood_requests r
  join public.blood_request_ngos a on a.request_id = r.id
  where r.id = p_request_id and a.ngo_id = request_ngo_id
  for update of r;

  if not found then
    raise exception 'This request is not assigned to your NGO.';
  end if;
  if request_status = 'Verified' then
    if request_verifier = request_ngo_id then
      return;
    end if;
    raise exception 'This request has already been verified by another NGO.';
  end if;
  if request_status <> 'Verification Pending' then
    raise exception 'This request is no longer awaiting verification.';
  end if;

  update public.blood_requests
  set status = 'Verified', verified_by = request_ngo_id
  where id = p_request_id;
end;
$$;

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
      and n.verified
  ) then
    raise exception 'This request is not assigned to your verified NGO.';
  end if;

  update public.blood_requests
  set status = 'Fulfilled', fulfilled_at = now()
  where id = p_request_id
    and status in (
      'Verified', 'Matching', 'Donors Contacted',
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
      and n.verified and r.status in (
        'Verified', 'Matching', 'Donors Contacted',
        'Donor Confirmed', 'Hospital Confirmation'
      )
  ) then
    raise exception 'A verified request assigned to your NGO is required.';
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
  where d.user_id = auth.uid() and d.verified and d.available and d.consent;
  if v_donor_id is null then
    raise exception 'An approved, available donor profile with outreach consent is required.';
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

  if v_request_status not in ('Verified', 'Matching', 'Donors Contacted') then
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
              then 'Verified'
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
revoke all on function public.verify_blood_request(uuid) from public;
revoke all on function public.complete_ngo_blood_request(uuid) from public;
revoke all on function public.get_eligible_blood_requests() from public;
revoke all on function public.get_ngo_donor_matches(uuid) from public;
revoke all on function public.respond_to_blood_request(uuid) from public;
grant execute on function public.get_ngo_blood_requests() to authenticated;
grant execute on function public.verify_blood_request(uuid) to authenticated;
grant execute on function public.complete_ngo_blood_request(uuid) to authenticated;
grant execute on function public.get_eligible_blood_requests() to authenticated;
grant execute on function public.get_ngo_donor_matches(uuid) to authenticated;
grant execute on function public.respond_to_blood_request(uuid) to authenticated;
