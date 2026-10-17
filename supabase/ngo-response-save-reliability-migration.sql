-- Repair missing NGO assignment rows and make NGO responses reliably persist
-- for any authenticated NGO on an active request.
alter table public.notifications
  add column if not exists read boolean not null default false;

insert into public.blood_request_ngos (request_id, ngo_id)
select request.id, ngo.id
from public.blood_requests request
cross join public.ngos ngo
where request.status in (
  'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
  'Donor Confirmed', 'Hospital Confirmation'
)
on conflict (request_id, ngo_id) do nothing;

create or replace function public.get_hospital_ngo_response_counts()
returns table (request_id uuid, response_count integer)
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

  return query
  select response.request_id, count(*)::integer
  from public.ngo_request_responses response
  join public.blood_requests request
    on request.id = response.request_id
   and request.hospital_id = v_hospital_id
  group by response.request_id;
end;
$$;

revoke all on function public.get_hospital_ngo_response_counts() from public, anon;
grant execute on function public.get_hospital_ngo_response_counts() to authenticated;

create or replace function public.notify_hospital_of_donor_response()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_hospital_user_id uuid;
  v_blood_group text;
begin
  if new.status not in (
    'Response Sent', 'Hospital Confirmed', 'Coordination in Progress', 'Completed'
  ) then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select hospital.user_id, request.blood_group
  into v_hospital_user_id, v_blood_group
  from public.blood_requests request
  join public.hospitals hospital on hospital.id = request.hospital_id
  where request.id = new.request_id;

  if v_hospital_user_id is null then
    return new;
  end if;

  insert into public.notifications (
    user_id, request_id, type, title, body, message
  )
  values (
    v_hospital_user_id,
    new.request_id,
    'donor_response_' || new.donor_id::text,
    'New donor response',
    'A donor responded to your ' || coalesce(v_blood_group, 'blood group')
      || ' request. Open My Requests to review the saved response.',
    'A donor responded to your ' || coalesce(v_blood_group, 'blood group')
      || ' request. Open My Requests to review the saved response.'
  )
  on conflict (user_id, request_id, type) where request_id is not null
  do update set
    title = excluded.title,
    body = excluded.body,
    message = excluded.message,
    read = false;

  return new;
end;
$$;

drop trigger if exists notify_hospital_of_donor_response
  on public.donor_responses;
create trigger notify_hospital_of_donor_response
after insert or update of status on public.donor_responses
for each row execute function public.notify_hospital_of_donor_response();

create or replace function public.submit_ngo_request_response(
  p_request_id uuid,
  p_response_type text,
  p_potential_donor_count integer default null,
  p_expected_time text default null,
  p_coordination_note text default null,
  p_share_contact boolean default false,
  p_unable_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_ngo_id uuid;
  v_ngo_name text;
  v_coordinator text;
  v_phone text;
  v_email text;
  v_hospital_user_id uuid;
  v_request_status text;
  v_existing public.ngo_request_responses%rowtype;
  v_response_id uuid;
  v_status text;
  v_new public.ngo_request_responses%rowtype;
  v_notification_type text;
  v_notification_title text;
  v_notification_body text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select ngo.id, ngo.organisation_name,
    coalesce(nullif(trim(ngo.contact_person), ''), profile.full_name),
    coalesce(nullif(trim(ngo.phone), ''), nullif(trim(profile.phone), '')),
    coalesce(nullif(trim(ngo.email), ''), nullif(trim(profile.email), ''))
  into v_ngo_id, v_ngo_name, v_coordinator, v_phone, v_email
  from public.ngos ngo
  join public.profiles profile
    on profile.id = ngo.user_id and profile.role = 'ngo'
  where ngo.user_id = v_user_id
  for update of ngo;

  if v_ngo_id is null then
    raise exception 'A linked NGO profile is required.';
  end if;
  if p_response_type is null
    or p_response_type not in ('potential_donor', 'unable_to_help') then
    raise exception 'Choose a valid NGO response type.';
  end if;

  select request.status, hospital.user_id
  into v_request_status, v_hospital_user_id
  from public.blood_requests request
  join public.hospitals hospital on hospital.id = request.hospital_id
  where request.id = p_request_id
  for update of request;

  if not found or v_request_status in ('Fulfilled', 'Cancelled') then
    raise exception 'This request is no longer accepting NGO responses.';
  end if;

  insert into public.blood_request_ngos (request_id, ngo_id)
  values (p_request_id, v_ngo_id)
  on conflict (request_id, ngo_id) do nothing;

  if p_response_type = 'potential_donor' then
    if p_potential_donor_count is null or p_potential_donor_count < 1 then
      raise exception 'Enter at least one potential donor.';
    end if;
    if p_share_contact is distinct from true then
      raise exception 'Consent is required before sharing coordinator contact details.';
    end if;
    if nullif(trim(p_expected_time), '') is null then
      raise exception 'Enter the expected availability or coordination time.';
    end if;
    if nullif(trim(v_coordinator), '') is null
      or (v_phone is null and v_email is null) then
      raise exception 'Complete your NGO coordinator name and phone or email in the NGO profile first.';
    end if;
    v_status := 'Awaiting Hospital Coordination';
  else
    if nullif(trim(p_unable_reason), '') is null then
      raise exception 'Choose a reason for being unable to help.';
    end if;
    v_status := 'Unable to Help';
  end if;

  select * into v_existing
  from public.ngo_request_responses response
  where response.request_id = p_request_id
    and response.ngo_id = v_ngo_id
  for update;

  if found then
    if v_existing.status not in (
      'Awaiting Hospital Coordination', 'Unable to Help'
    ) then
      raise exception 'This NGO response is already being coordinated and can no longer be replaced.';
    end if;

    update public.ngo_request_responses
    set response_type = p_response_type,
        status = v_status,
        potential_donor_count = case when p_response_type = 'potential_donor'
          then p_potential_donor_count else null end,
        coordinator_name = case when p_response_type = 'potential_donor'
          then v_coordinator else null end,
        coordinator_phone = case
          when p_response_type = 'potential_donor' and p_share_contact
          then v_phone else null end,
        coordinator_email = case
          when p_response_type = 'potential_donor' and p_share_contact
          then v_email else null end,
        consent_to_share_contact =
          p_response_type = 'potential_donor' and p_share_contact,
        expected_time = case when p_response_type = 'potential_donor'
          then nullif(trim(p_expected_time), '') else null end,
        coordination_note = case when p_response_type = 'potential_donor'
          then nullif(trim(p_coordination_note), '') else null end,
        unable_reason = case when p_response_type = 'unable_to_help'
          then nullif(trim(p_unable_reason), '') else null end,
        responded_at = now(),
        updated_at = now()
    where id = v_existing.id
    returning * into v_new;
  else
    insert into public.ngo_request_responses (
      request_id, ngo_id, response_type, status, potential_donor_count,
      coordinator_name, coordinator_phone, coordinator_email,
      consent_to_share_contact, expected_time, coordination_note, unable_reason
    )
    values (
      p_request_id, v_ngo_id, p_response_type, v_status,
      case when p_response_type = 'potential_donor'
        then p_potential_donor_count end,
      case when p_response_type = 'potential_donor' then v_coordinator end,
      case when p_response_type = 'potential_donor' and p_share_contact
        then v_phone end,
      case when p_response_type = 'potential_donor' and p_share_contact
        then v_email end,
      p_response_type = 'potential_donor' and p_share_contact,
      case when p_response_type = 'potential_donor'
        then nullif(trim(p_expected_time), '') end,
      case when p_response_type = 'potential_donor'
        then nullif(trim(p_coordination_note), '') end,
      case when p_response_type = 'unable_to_help'
        then nullif(trim(p_unable_reason), '') end
    )
    returning * into v_new;
  end if;

  v_response_id := v_new.id;
  insert into public.ngo_request_response_audit (
    response_id, changed_by, old_response, new_response
  )
  values (
    v_new.id, v_user_id,
    case when v_existing.id is null then null else to_jsonb(v_existing) end,
    to_jsonb(v_new)
  );

  if v_hospital_user_id is not null then
    v_notification_type := case when p_response_type = 'potential_donor'
      then 'ngo_potential_donor_' || v_ngo_id::text
      else 'ngo_unable_to_help_' || v_ngo_id::text end;
    v_notification_title := case when p_response_type = 'potential_donor'
      then v_ngo_name || ' identified potential donors'
      else v_ngo_name || ' is unable to help' end;
    v_notification_body := case when p_response_type = 'potential_donor'
      then v_ngo_name || ' identified ' || p_potential_donor_count::text
        || ' potential donor(s). This is an offer for coordination, not a confirmed donation.'
      else v_ngo_name || ' marked this request as unable to help: '
        || trim(p_unable_reason) end;

    update public.notifications
    set title = v_notification_title,
        body = v_notification_body,
        message = v_notification_body,
        read = false
    where user_id = v_hospital_user_id
      and request_id = p_request_id
      and type = v_notification_type;

    if not found then
      insert into public.notifications (
        user_id, request_id, type, title, body, message
      )
      values (
        v_hospital_user_id, p_request_id, v_notification_type,
        v_notification_title, v_notification_body, v_notification_body
      );
    end if;
  end if;

  return v_response_id;
end;
$$;

revoke all on function public.submit_ngo_request_response(
  uuid, text, integer, text, text, boolean, text
) from public, anon;
grant execute on function public.submit_ngo_request_response(
  uuid, text, integer, text, text, boolean, text
) to authenticated;

notify pgrst, 'reload schema';
