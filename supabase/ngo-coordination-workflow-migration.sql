-- NGO responses are separate from hospital requests and donor responses.
create table if not exists public.ngo_request_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  ngo_id uuid not null references public.ngos(id) on delete cascade,
  response_type text not null
    check (response_type in ('potential_donor', 'unable_to_help')),
  status text not null
    check (status in (
      'Awaiting Hospital Coordination',
      'Coordination in Progress',
      'Donation Verified',
      'Unable to Help'
    )),
  potential_donor_count integer,
  coordinator_name text,
  coordinator_phone text,
  coordinator_email text,
  consent_to_share_contact boolean not null default false,
  expected_time text,
  coordination_note text,
  unable_reason text,
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, ngo_id),
  constraint ngo_request_response_count_valid
    check (potential_donor_count is null or potential_donor_count > 0),
  constraint ngo_request_response_type_status_valid
    check (
      (response_type = 'potential_donor' and status in (
        'Awaiting Hospital Coordination',
        'Coordination in Progress',
        'Donation Verified'
      ))
      or (response_type = 'unable_to_help' and status = 'Unable to Help')
    )
);

create index if not exists ngo_request_responses_ngo_time_idx
  on public.ngo_request_responses (ngo_id, responded_at desc);
create index if not exists ngo_request_responses_request_idx
  on public.ngo_request_responses (request_id, responded_at desc);

create table if not exists public.ngo_request_response_audit (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.ngo_request_responses(id) on delete cascade,
  changed_by uuid not null references auth.users(id),
  old_response jsonb,
  new_response jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.hospital_fulfillment_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  donation_id uuid not null references public.donation_records(id) on delete restrict,
  donor_response_count integer not null,
  status text not null default 'needs_more_valid_responses'
    check (status in ('needs_more_valid_responses', 'ready', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (donation_id)
);

create table if not exists public.hospital_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  response_id uuid not null,
  message_type text not null
    check (message_type in ('ngo_appreciation', 'donor_acknowledgement')),
  sender_id uuid not null references auth.users(id),
  recipient_id uuid not null references public.profiles(id),
  recipient_name text not null,
  content text not null check (length(trim(content)) > 0),
  delivery_status text not null default 'copyable_not_sent'
    check (delivery_status in ('copyable_not_sent', 'copied')),
  approved_at timestamptz not null default now(),
  copied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, response_id, message_type)
);

alter table public.ngo_request_responses enable row level security;
alter table public.ngo_request_response_audit enable row level security;
alter table public.hospital_fulfillment_reviews enable row level security;
alter table public.hospital_acknowledgements enable row level security;

revoke all on public.ngo_request_responses from anon, authenticated;
revoke all on public.ngo_request_response_audit from anon, authenticated;
revoke all on public.hospital_fulfillment_reviews from anon, authenticated;
revoke all on public.hospital_acknowledgements from anon, authenticated;

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
  where ngo.user_id = v_user_id;

  if v_ngo_id is null then
    raise exception 'A linked NGO profile is required.';
  end if;
  if p_response_type is null
    or p_response_type not in ('potential_donor', 'unable_to_help') then
    raise exception 'Choose a valid NGO response type.';
  end if;
  if not exists (
    select 1 from public.blood_request_ngos assignment
    where assignment.request_id = p_request_id and assignment.ngo_id = v_ngo_id
  ) then
    raise exception 'This request is not assigned to your NGO.';
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
    v_status := 'Unable to Help';
    if nullif(trim(p_unable_reason), '') is null then
      raise exception 'Choose a reason for being unable to help.';
    end if;
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
        coordinator_phone = case when p_response_type = 'potential_donor' and p_share_contact
          then v_phone else null end,
        coordinator_email = case when p_response_type = 'potential_donor' and p_share_contact
          then v_email else null end,
        consent_to_share_contact = p_response_type = 'potential_donor' and p_share_contact,
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
      case when p_response_type = 'potential_donor' then p_potential_donor_count end,
      case when p_response_type = 'potential_donor' then v_coordinator end,
      case when p_response_type = 'potential_donor' and p_share_contact then v_phone end,
      case when p_response_type = 'potential_donor' and p_share_contact then v_email end,
      p_response_type = 'potential_donor' and p_share_contact,
      case when p_response_type = 'potential_donor' then nullif(trim(p_expected_time), '') end,
      case when p_response_type = 'potential_donor' then nullif(trim(p_coordination_note), '') end,
      case when p_response_type = 'unable_to_help' then nullif(trim(p_unable_reason), '') end
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
    insert into public.notifications (user_id, request_id, type, title, body)
    values (
      v_hospital_user_id,
      p_request_id,
      case when p_response_type = 'potential_donor'
        then 'ngo_potential_donor_' || v_ngo_id::text
        else 'ngo_unable_to_help_' || v_ngo_id::text end,
      case when p_response_type = 'potential_donor'
        then v_ngo_name || ' identified potential donors'
        else v_ngo_name || ' is unable to help' end,
      case when p_response_type = 'potential_donor'
        then v_ngo_name || ' identified ' || p_potential_donor_count::text
          || ' potential donor(s). This is an offer for coordination, not a confirmed donation.'
        else v_ngo_name || ' marked this request as unable to help: '
          || trim(p_unable_reason) end
    )
    on conflict (user_id, request_id, type) where request_id is not null
    do update set title = excluded.title, body = excluded.body, read = false;
  end if;

  return v_response_id;
end;
$$;

create or replace function public.get_ngo_request_contributions()
returns table (
  response_id uuid,
  request_id uuid,
  hospital_name text,
  blood_group text,
  component text,
  units integer,
  urgency text,
  request_status text,
  area text,
  created_at timestamptz,
  response_type text,
  response_status text,
  potential_donor_count integer,
  coordinator_name text,
  coordinator_phone text,
  coordinator_email text,
  expected_time text,
  coordination_note text,
  unable_reason text,
  responded_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_ngo_id uuid;
begin
  select ngo.id into v_ngo_id
  from public.ngos ngo
  join public.profiles profile
    on profile.id = ngo.user_id and profile.role = 'ngo'
  where ngo.user_id = auth.uid();
  if v_ngo_id is null then
    raise exception 'A linked NGO profile is required.';
  end if;

  return query
  select response.id, request.id, hospital.hospital_name,
    request.blood_group, coalesce(request.component, 'WHOLE_BLOOD'),
    request.units, request.urgency, request.status, request.area,
    request.created_at, response.response_type, response.status,
    response.potential_donor_count, response.coordinator_name,
    response.coordinator_phone, response.coordinator_email,
    response.expected_time, response.coordination_note,
    response.unable_reason, response.responded_at, response.updated_at
  from public.ngo_request_responses response
  join public.blood_requests request on request.id = response.request_id
  join public.hospitals hospital on hospital.id = request.hospital_id
  where response.ngo_id = v_ngo_id
  order by response.responded_at desc;
end;
$$;

create or replace function public.get_hospital_ngo_responses(p_request_id uuid)
returns table (
  response_id uuid,
  ngo_id uuid,
  ngo_name text,
  organisation_type text,
  city text,
  areas_served text,
  response_type text,
  response_status text,
  potential_donor_count integer,
  coordinator_name text,
  coordinator_phone text,
  coordinator_email text,
  contact_shared boolean,
  expected_time text,
  coordination_note text,
  unable_reason text,
  responded_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
begin
  select hospital.id into v_hospital_id
  from public.hospitals hospital
  join public.profiles profile
    on profile.id = hospital.user_id and profile.role = 'hospital'
  where hospital.user_id = auth.uid();
  if v_hospital_id is null then
    raise exception 'A linked hospital profile is required.';
  end if;
  if not exists (
    select 1 from public.blood_requests request
    where request.id = p_request_id and request.hospital_id = v_hospital_id
  ) then
    raise exception 'This request does not belong to your hospital.';
  end if;

  return query
  select response.id, ngo.id, ngo.organisation_name,
    ngo.organisation_type, ngo.city, ngo.areas_served,
    response.response_type, response.status, response.potential_donor_count,
    case when response.consent_to_share_contact then response.coordinator_name end,
    case when response.consent_to_share_contact then response.coordinator_phone end,
    case when response.consent_to_share_contact then response.coordinator_email end,
    response.consent_to_share_contact, response.expected_time,
    response.coordination_note, response.unable_reason,
    response.responded_at, response.updated_at
  from public.ngo_request_responses response
  join public.ngos ngo on ngo.id = response.ngo_id
  where response.request_id = p_request_id
  order by response.responded_at desc;
end;
$$;

drop function if exists public.get_hospital_ngo_coordination_summary(timestamptz, timestamptz);
create function public.get_hospital_ngo_coordination_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  response_count bigint,
  donor_response_count bigint,
  potential_donor_count bigint,
  potential_people_count bigint,
  awaiting_coordination bigint,
  coordination_in_progress bigint,
  donations_verified bigint,
  unable_to_help bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
begin
  select hospital.id into v_hospital_id
  from public.hospitals hospital
  join public.profiles profile
    on profile.id = hospital.user_id and profile.role = 'hospital'
  where hospital.user_id = auth.uid();
  if v_hospital_id is null then
    raise exception 'A linked hospital profile is required.';
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'The report date range is invalid.';
  end if;

  return query
  with ngo_responses as (
    select response.status, response.response_type,
      response.potential_donor_count
    from public.ngo_request_responses response
    join public.blood_requests request on request.id = response.request_id
    where request.hospital_id = v_hospital_id
      and (p_from is null or response.responded_at >= p_from)
      and (p_to is null or response.responded_at <= p_to)
  ),
  donor_responses as (
    select response.status,
      exists (
        select 1 from public.donation_records donation
        where donation.request_id = response.request_id
          and donation.donor_id = response.donor_id
          and donation.hospital_id = v_hospital_id
          and donation.confirmed_by is not null
          and donation.confirmed_at is not null
      ) as donation_verified
    from public.donor_responses response
    join public.blood_requests request on request.id = response.request_id
    join public.donors donor on donor.id = response.donor_id
    join public.profiles donor_profile
      on donor_profile.id = donor.user_id and donor_profile.role = 'donor'
    where request.hospital_id = v_hospital_id
      and response.status in (
        'Response Sent', 'Hospital Confirmed',
        'Coordination in Progress', 'Completed'
      )
      and (p_from is null or response.responded_at >= p_from)
      and (p_to is null or response.responded_at <= p_to)
  )
  select
    (select count(*) from ngo_responses)::bigint,
    (select count(*) from donor_responses)::bigint,
    (select count(*) from ngo_responses
      where response_type = 'potential_donor')::bigint,
    coalesce((select sum(potential_donor_count) from ngo_responses
      where response_type = 'potential_donor'), 0)::bigint,
    (
      (select count(*) from ngo_responses
        where status = 'Awaiting Hospital Coordination')
      + (select count(*) from donor_responses where status = 'Response Sent')
    )::bigint,
    (
      (select count(*) from ngo_responses
        where status = 'Coordination in Progress')
      + (select count(*) from donor_responses
        where status in ('Hospital Confirmed', 'Coordination in Progress')
          or (status = 'Completed' and not donation_verified))
    )::bigint,
    (
      (select count(*) from ngo_responses where status = 'Donation Verified')
      + (select count(*) from donor_responses
        where status = 'Completed' and donation_verified)
    )::bigint,
    (select count(*) from ngo_responses where status = 'Unable to Help')::bigint;
end;
$$;

create or replace function public.get_hospital_recent_ngo_responses()
returns table (
  response_id uuid,
  request_id uuid,
  ngo_name text,
  response_type text,
  response_status text,
  potential_donor_count integer,
  responded_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
begin
  select hospital.id into v_hospital_id
  from public.hospitals hospital
  join public.profiles profile on profile.id = hospital.user_id
    and profile.role = 'hospital'
  where hospital.user_id = auth.uid();
  if v_hospital_id is null then
    raise exception 'A linked hospital profile is required.';
  end if;

  return query
  select response.id, response.request_id, ngo.organisation_name,
    response.response_type, response.status,
    response.potential_donor_count, response.responded_at
  from public.ngo_request_responses response
  join public.blood_requests request on request.id = response.request_id
  join public.ngos ngo on ngo.id = response.ngo_id
  where request.hospital_id = v_hospital_id
  order by response.responded_at desc
  limit 5;
end;
$$;

create or replace function public.update_hospital_ngo_coordination(
  p_response_id uuid,
  p_status text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
  v_old public.ngo_request_responses%rowtype;
  v_new public.ngo_request_responses%rowtype;
begin
  select hospital.id into v_hospital_id
  from public.hospitals hospital
  join public.profiles profile on profile.id = hospital.user_id
    and profile.role = 'hospital'
  where hospital.user_id = auth.uid();
  if v_hospital_id is null then
    raise exception 'A linked hospital profile is required.';
  end if;
  if p_status is null
    or p_status not in ('Coordination in Progress', 'Donation Verified') then
    raise exception 'Unsupported hospital-managed NGO coordination state.';
  end if;

  select response.* into v_old
  from public.ngo_request_responses response
  join public.blood_requests request on request.id = response.request_id
  where response.id = p_response_id
    and request.hospital_id = v_hospital_id
  for update of response;
  if not found then
    raise exception 'NGO response not found for this hospital.';
  end if;
  if v_old.response_type <> 'potential_donor'
    or (
      p_status = 'Coordination in Progress'
      and v_old.status <> 'Awaiting Hospital Coordination'
    )
    or (
      p_status = 'Donation Verified'
      and v_old.status <> 'Coordination in Progress'
    ) then
    raise exception 'This NGO response cannot enter coordination from its current state.';
  end if;
  if p_status = 'Donation Verified' and not exists (
    select 1
    from public.donation_records donation
    join public.donor_responses donor_response
      on donor_response.request_id = donation.request_id
      and donor_response.donor_id = donation.donor_id
      and donor_response.status = 'Completed'
    where donation.request_id = v_old.request_id
      and donation.hospital_id = v_hospital_id
      and donation.confirmed_by is not null
      and donation.confirmed_at is not null
  ) then
    raise exception 'A hospital-verified donation for this request is required.';
  end if;

  update public.ngo_request_responses
  set status = p_status, updated_at = now()
  where id = p_response_id
  returning * into v_new;
  insert into public.ngo_request_response_audit (
    response_id, changed_by, old_response, new_response
  )
  values (v_new.id, auth.uid(), to_jsonb(v_old), to_jsonb(v_new));
  return v_new.status;
end;
$$;

create or replace function public.save_hospital_acknowledgement(
  p_request_id uuid,
  p_response_id uuid,
  p_message_type text,
  p_recipient_name text,
  p_content text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
  v_recipient_id uuid;
  v_response_request_id uuid;
  v_target_response_id uuid;
  v_donor_id uuid;
  v_verified_recipient_name text;
  v_id uuid;
begin
  select hospital.id into v_hospital_id
  from public.hospitals hospital
  join public.profiles profile on profile.id = hospital.user_id
    and profile.role = 'hospital'
  where hospital.user_id = auth.uid();
  if v_hospital_id is null then
    raise exception 'A linked hospital profile is required.';
  end if;
  if nullif(trim(p_content), '') is null then
    raise exception 'Review and enter the recipient name and message before saving.';
  end if;

  if p_message_type = 'ngo_appreciation' then
    select response.request_id, ngo.user_id, response.id,
      coalesce(nullif(trim(ngo.contact_person), ''), profile.full_name)
    into v_response_request_id, v_recipient_id, v_target_response_id,
      v_verified_recipient_name
    from public.ngo_request_responses response
    join public.ngos ngo on ngo.id = response.ngo_id
    join public.profiles profile on profile.id = ngo.user_id
      and profile.role = 'ngo'
    where response.id = p_response_id
      and response.response_type = 'potential_donor'
      and response.consent_to_share_contact
      and ngo.user_id is not null;
  elsif p_message_type = 'donor_acknowledgement' then
    select response.request_id, donor.id, donor.user_id, response.id,
      profile.full_name
    into v_response_request_id, v_donor_id, v_recipient_id,
      v_target_response_id, v_verified_recipient_name
    from public.donor_responses response
    join public.donors donor on donor.id = response.donor_id
    join public.profiles profile on profile.id = donor.user_id
      and profile.role = 'donor'
    where donor.id = p_response_id
      and response.status = 'Completed'
      and donor.user_id is not null
      and exists (
        select 1 from public.donation_records donation
        where donation.request_id = response.request_id
          and donation.donor_id = response.donor_id
          and donation.hospital_id = v_hospital_id
          and donation.confirmed_by = auth.uid()
      );
  else
    raise exception 'Choose a supported acknowledgement type.';
  end if;

  if v_recipient_id is null
    or nullif(trim(v_verified_recipient_name), '') is null
    or v_response_request_id <> p_request_id then
    raise exception 'The approved recipient does not match this hospital request.';
  end if;
  if not exists (
    select 1 from public.blood_requests request
    where request.id = p_request_id and request.hospital_id = v_hospital_id
  ) then
    raise exception 'This request does not belong to your hospital.';
  end if;

  insert into public.hospital_acknowledgements (
    request_id, response_id, message_type, sender_id, recipient_id,
    recipient_name, content, delivery_status
  )
  values (
    p_request_id, v_target_response_id, p_message_type, auth.uid(), v_recipient_id,
    v_verified_recipient_name, trim(p_content), 'copyable_not_sent'
  )
  on conflict (request_id, response_id, message_type)
  do update set
    sender_id = excluded.sender_id,
    recipient_id = excluded.recipient_id,
    recipient_name = excluded.recipient_name,
    content = excluded.content,
    delivery_status = 'copyable_not_sent',
    approved_at = now(),
    copied_at = null
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.mark_hospital_acknowledgement_copied(
  p_acknowledgement_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  update public.hospital_acknowledgements acknowledgement
  set delivery_status = 'copied', copied_at = now()
  where acknowledgement.id = p_acknowledgement_id
    and acknowledgement.sender_id = auth.uid()
    and exists (
      select 1 from public.blood_requests request
      join public.hospitals hospital on hospital.id = request.hospital_id
      where request.id = acknowledgement.request_id
        and hospital.user_id = auth.uid()
    );
  if not found then
    raise exception 'Acknowledgement not found for this hospital user.';
  end if;
end;
$$;

create or replace function public.guard_hospital_request_fulfillment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
  v_response_count integer;
  v_has_verified_donation boolean;
begin
  if new.status is distinct from old.status and new.status = 'Fulfilled' then
    select hospital.id into v_hospital_id
    from public.hospitals hospital
    join public.profiles profile on profile.id = hospital.user_id
      and profile.role = 'hospital'
    where hospital.user_id = auth.uid();
    if v_hospital_id is null or v_hospital_id <> old.hospital_id then
      raise exception 'Only authorised staff at the request hospital can fulfil it.';
    end if;

    select count(distinct response.donor_id)::integer
    into v_response_count
    from public.donor_responses response
    join public.donors donor on donor.id = response.donor_id
    where response.request_id = old.id
      and response.status in (
        'Response Sent', 'Hospital Confirmed',
        'Coordination in Progress', 'Completed'
      )
      and donor.user_id is not null;

    select exists (
      select 1 from public.donation_records donation
      where donation.request_id = old.id
        and donation.hospital_id = old.hospital_id
        and donation.confirmed_by is not null
        and donation.confirmed_at is not null
    ) into v_has_verified_donation;

    if not v_has_verified_donation then
      raise exception 'At least one actual donation must be verified by hospital staff before fulfilment.';
    end if;
    if v_response_count < 1 then
      raise exception 'Donation verified, but fulfilment needs at least one valid unique donor response; the request remains flagged for review.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_hospital_request_fulfillment
  on public.blood_requests;
create trigger enforce_hospital_request_fulfillment
before update of status on public.blood_requests
for each row execute function public.guard_hospital_request_fulfillment();

create or replace function public.flag_donation_below_response_threshold()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_response_count integer;
begin
  select count(distinct response.donor_id)::integer
  into v_response_count
  from public.donor_responses response
  join public.donors donor on donor.id = response.donor_id
  where response.request_id = new.request_id
    and response.status in (
      'Response Sent', 'Hospital Confirmed',
      'Coordination in Progress', 'Completed'
    )
    and donor.user_id is not null;

  if v_response_count < 1 then
    insert into public.hospital_fulfillment_reviews (
      request_id, donation_id, donor_response_count
    )
    values (new.request_id, new.id, v_response_count)
    on conflict (donation_id) do update
      set donor_response_count = excluded.donor_response_count,
          status = 'needs_more_valid_responses',
          updated_at = now();
  else
    insert into public.hospital_fulfillment_reviews (
      request_id, donation_id, donor_response_count, status
    )
    values (new.request_id, new.id, v_response_count, 'ready')
    on conflict (donation_id) do update
      set donor_response_count = excluded.donor_response_count,
          status = 'ready',
          updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists flag_donation_below_response_threshold
  on public.donation_records;
create trigger flag_donation_below_response_threshold
after insert on public.donation_records
for each row execute function public.flag_donation_below_response_threshold();

create or replace function public.sync_hospital_fulfillment_review()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request_id uuid;
  v_response_count integer;
begin
  if tg_op = 'DELETE' then
    v_request_id := old.request_id;
  else
    v_request_id := new.request_id;
  end if;

  select count(distinct response.donor_id)::integer
  into v_response_count
  from public.donor_responses response
  join public.donors donor on donor.id = response.donor_id
  where response.request_id = v_request_id
    and response.status in (
      'Response Sent', 'Hospital Confirmed',
      'Coordination in Progress', 'Completed'
    )
    and donor.user_id is not null;

  update public.hospital_fulfillment_reviews review
  set donor_response_count = v_response_count,
      status = case when v_response_count >= 1
        then 'ready' else 'needs_more_valid_responses' end,
      updated_at = now()
  where review.request_id = v_request_id
    and review.status <> 'closed';

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_hospital_fulfillment_review
  on public.donor_responses;
create trigger sync_hospital_fulfillment_review
after insert or update of status or delete on public.donor_responses
for each row execute function public.sync_hospital_fulfillment_review();

update public.hospital_fulfillment_reviews review
set donor_response_count = counts.response_count,
    status = case when counts.response_count >= 1
      then 'ready' else 'needs_more_valid_responses' end,
    updated_at = now()
from (
  select review_rows.id,
    count(distinct response.donor_id)::integer as response_count
  from public.hospital_fulfillment_reviews review_rows
  left join public.donor_responses response
    on response.request_id = review_rows.request_id
    and response.status in (
      'Response Sent', 'Hospital Confirmed',
      'Coordination in Progress', 'Completed'
    )
  left join public.donors donor
    on donor.id = response.donor_id and donor.user_id is not null
  where review_rows.status <> 'closed'
    and (response.id is null or donor.id is not null)
  group by review_rows.id
) counts
where review.id = counts.id;

-- NGOs can never change the global request status to Fulfilled.
create or replace function public.complete_ngo_blood_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'NGOs cannot fulfil hospital requests. A hospital user must verify the actual donation and satisfy the response threshold.';
end;
$$;

revoke all on function public.submit_ngo_request_response(uuid, text, integer, text, text, boolean, text) from public;
revoke all on function public.get_ngo_request_contributions() from public;
revoke all on function public.get_hospital_ngo_responses(uuid) from public;
revoke all on function public.get_hospital_ngo_coordination_summary(timestamptz, timestamptz) from public;
revoke all on function public.get_hospital_recent_ngo_responses() from public;
revoke all on function public.update_hospital_ngo_coordination(uuid, text) from public;
revoke all on function public.save_hospital_acknowledgement(uuid, uuid, text, text, text) from public;
revoke all on function public.mark_hospital_acknowledgement_copied(uuid) from public;
revoke all on function public.guard_hospital_request_fulfillment() from public;
revoke all on function public.flag_donation_below_response_threshold() from public;
revoke all on function public.sync_hospital_fulfillment_review() from public;
grant execute on function public.submit_ngo_request_response(uuid, text, integer, text, text, boolean, text) to authenticated;
grant execute on function public.get_ngo_request_contributions() to authenticated;
grant execute on function public.get_hospital_ngo_responses(uuid) to authenticated;
grant execute on function public.get_hospital_ngo_coordination_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.get_hospital_recent_ngo_responses() to authenticated;
grant execute on function public.update_hospital_ngo_coordination(uuid, text) to authenticated;
grant execute on function public.save_hospital_acknowledgement(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.mark_hospital_acknowledgement_copied(uuid) to authenticated;
