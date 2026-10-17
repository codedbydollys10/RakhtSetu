create or replace function public.respond_to_blood_request(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_donor_id uuid;
  v_donor_phone text;
  v_request_status text;
  v_existing_status text;
begin
  select donor.id,
    coalesce(nullif(trim(donor.phone), ''), nullif(trim(profile.phone), ''))
  into v_donor_id, v_donor_phone
  from public.donors donor
  join public.profiles profile
    on profile.id = donor.user_id and profile.role = 'donor'
  where donor.user_id = auth.uid()
    and donor.available
    and donor.consent;

  if v_donor_id is null then
    raise exception 'An available donor profile with outreach consent is required.';
  end if;
  if v_donor_phone is null
    or length(regexp_replace(v_donor_phone, '[^0-9]', '', 'g')) < 7 then
    raise exception 'Add a valid phone number to your donor profile before responding.';
  end if;

  select request.status into v_request_status
  from public.blood_requests request
  where request.id = p_request_id
  for update;
  if not found then
    raise exception 'Blood request not found.';
  end if;

  select response.status into v_existing_status
  from public.donor_responses response
  where response.request_id = p_request_id
    and response.donor_id = v_donor_id;
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

create or replace function public.confirm_hospital_donor_response(
  p_request_id uuid,
  p_donor_id uuid
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
  v_request_hospital_id uuid;
  v_hospital_name text;
  v_donor_user_id uuid;
  v_donor_phone text;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  select hospital.id, hospital.hospital_name
  into v_hospital_id, v_hospital_name
  from public.hospitals hospital
  join public.profiles profile
    on profile.id = hospital.user_id and profile.role = 'hospital'
  where hospital.user_id = auth.uid();

  if v_hospital_id is null then
    raise exception 'A linked hospital profile is required.';
  end if;

  select request.hospital_id into v_request_hospital_id
  from public.blood_requests request
  where request.id = p_request_id
    and request.hospital_id = v_hospital_id
    and request.status not in ('Fulfilled', 'Cancelled')
  for update;
  if not found then
    raise exception 'This active request does not belong to your hospital.';
  end if;

  select response.status, donor.user_id,
    coalesce(nullif(trim(donor.phone), ''), nullif(trim(donor_profile.phone), ''))
  into v_status, v_donor_user_id, v_donor_phone
  from public.donor_responses response
  join public.donors donor on donor.id = response.donor_id
  join public.profiles donor_profile
    on donor_profile.id = donor.user_id and donor_profile.role = 'donor'
  where response.request_id = p_request_id
    and response.donor_id = p_donor_id
  for update of response;

  if not found or v_status = 'Cancelled' then
    raise exception 'An active donor response is required.';
  end if;
  if v_donor_phone is null
    or length(regexp_replace(v_donor_phone, '[^0-9]', '', 'g')) < 7 then
    raise exception 'The donor must add a valid phone number before you can confirm this response.';
  end if;
  if v_status in ('Hospital Confirmed', 'Coordination in Progress', 'Completed') then
    return v_status;
  end if;
  if v_status <> 'Response Sent' then
    raise exception 'This donor response cannot be confirmed.';
  end if;
  if v_donor_user_id is null then
    raise exception 'The donor response is not linked to an account.';
  end if;

  update public.donor_responses
  set status = 'Hospital Confirmed',
      updated_at = now()
  where request_id = p_request_id
    and donor_id = p_donor_id;

  insert into public.notifications (user_id, request_id, type, title, body)
  values (
    v_donor_user_id,
    p_request_id,
    'response_confirmed',
    'The hospital acknowledged your response',
    coalesce(v_hospital_name, 'The hospital')
      || ' has acknowledged your response. Contact them to coordinate safely.'
  )
  on conflict (user_id, request_id, type)
    where request_id is not null do nothing;

  return 'Hospital Confirmed';
end;
$$;

create or replace function public.get_hospital_donor_responses(
  p_request_id uuid default null
)
returns table (
  request_id uuid,
  request_blood_group text,
  request_component text,
  request_area text,
  donor_id uuid,
  donor_name text,
  donor_phone text,
  donor_blood_group text,
  donor_city text,
  donor_area text,
  response_status text,
  responded_at timestamptz,
  donation_recorded boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  select hospital.id into v_hospital_id
  from public.hospitals hospital
  join public.profiles profile
    on profile.id = hospital.user_id and profile.role = 'hospital'
  where hospital.user_id = auth.uid();

  if v_hospital_id is null then
    raise exception 'A linked hospital profile is required.';
  end if;

  if p_request_id is not null and not exists (
    select 1 from public.blood_requests request
    where request.id = p_request_id
      and request.hospital_id = v_hospital_id
  ) then
    raise exception 'This request does not belong to your hospital.';
  end if;

  return query
  select
    request.id,
    request.blood_group,
    request.component,
    request.area,
    donor.id,
    coalesce(nullif(trim(donor.full_name), ''), donor_profile.full_name),
    coalesce(nullif(trim(donor.phone), ''), nullif(trim(donor_profile.phone), '')),
    donor.blood_group,
    donor.city,
    donor.area,
    response.status,
    response.responded_at,
    exists (
      select 1 from public.donation_records donation
      where donation.request_id = response.request_id
        and donation.donor_id = response.donor_id
    )
  from public.donor_responses response
  join public.blood_requests request
    on request.id = response.request_id
   and request.hospital_id = v_hospital_id
  join public.donors donor on donor.id = response.donor_id
  join public.profiles donor_profile
    on donor_profile.id = donor.user_id and donor_profile.role = 'donor'
  where response.status <> 'Cancelled'
    and (p_request_id is null or request.id = p_request_id)
  order by response.responded_at desc;
end;
$$;

alter table public.donor_responses enable row level security;

drop policy if exists "Donors can manage their own responses"
  on public.donor_responses;
drop policy if exists "Donors can read their own responses"
  on public.donor_responses;
create policy "Donors can read their own responses"
  on public.donor_responses for select to authenticated
  using (exists (
    select 1 from public.donors donor
    where donor.id = donor_responses.donor_id
      and donor.user_id = auth.uid()
  ));

drop policy if exists "Donors can update their own responses"
  on public.donor_responses;
create policy "Donors can update their own responses"
  on public.donor_responses for update to authenticated
  using (
    status = 'Response Sent'
    and exists (
      select 1 from public.donors donor
      where donor.id = donor_responses.donor_id
        and donor.user_id = auth.uid()
    )
  )
  with check (
    status = 'Cancelled'
    and exists (
      select 1 from public.donors donor
      where donor.id = donor_responses.donor_id
        and donor.user_id = auth.uid()
    )
  );

drop policy if exists "Hospitals can view responses to their requests"
  on public.donor_responses;
create policy "Hospitals can view responses to their requests"
  on public.donor_responses for select to authenticated
  using (exists (
    select 1
    from public.blood_requests request
    join public.hospitals hospital
      on hospital.id = request.hospital_id
    where request.id = donor_responses.request_id
      and hospital.user_id = auth.uid()
  ));

revoke insert, delete on public.donor_responses from authenticated;
grant select, update on public.donor_responses to authenticated;

revoke all on function public.respond_to_blood_request(uuid) from public;
revoke all on function public.confirm_hospital_donor_response(uuid, uuid) from public;
revoke all on function public.get_hospital_donor_responses(uuid) from public;
grant execute on function public.respond_to_blood_request(uuid) to authenticated;
grant execute on function public.confirm_hospital_donor_response(uuid, uuid)
  to authenticated;
grant execute on function public.get_hospital_donor_responses(uuid)
  to authenticated;

notify pgrst, 'reload schema';
