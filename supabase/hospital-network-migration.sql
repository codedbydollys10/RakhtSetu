create table if not exists public.hospital_request_recipients (
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  recipient_hospital_id uuid not null references public.hospitals(id) on delete cascade,
  shared_by uuid not null references public.hospitals(id) on delete cascade,
  distance_km double precision not null check (distance_km >= 0),
  response_status text not null default 'Pending'
    check (response_status in ('Pending', 'Accepted', 'Declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (request_id, recipient_hospital_id),
  check (recipient_hospital_id <> shared_by)
);

create index if not exists hospital_request_recipients_hospital_idx
  on public.hospital_request_recipients (recipient_hospital_id, created_at desc);

alter table public.hospital_request_recipients enable row level security;

drop policy if exists "Hospitals can read their shared requests"
  on public.hospital_request_recipients;
create policy "Hospitals can read their shared requests"
  on public.hospital_request_recipients
  for select to authenticated
  using (
    recipient_hospital_id = (
      select hospital.id
      from public.hospitals hospital
      where hospital.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.blood_requests request
      where request.id = request_id
        and request.hospital_id = auth.uid()
    )
  );

grant select on public.hospital_request_recipients to authenticated;
revoke insert, update, delete on public.hospital_request_recipients from anon, authenticated;

drop index if exists public.hospitals_verified_coordinates_idx;
create index if not exists hospitals_coordinates_discovery_idx
  on public.hospitals (latitude, longitude)
  where latitude is not null and longitude is not null;

create or replace function public.hospital_network_directory(
  p_radius_km integer default 10,
  p_query text default null,
  p_page_size integer default 50,
  p_page_offset integer default 0
)
returns table (
  hospital_id uuid,
  hospital_name text,
  hospital_type text,
  street_address text,
  location_address text,
  city text,
  phone text,
  email text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_center_lat double precision;
  v_center_lng double precision;
  v_query text := left(trim(coalesce(p_query, '')), 120);
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'hospital'
  ) then
    raise exception 'Only authenticated hospital accounts can search the hospital network.';
  end if;

  if p_radius_km is null or p_radius_km not in (5, 10, 25) then
    raise exception 'Search radius must be 5, 10, or 25 km.';
  end if;

  if p_page_size is null
     or p_page_offset is null
     or p_page_size not between 1 and 50
     or p_page_offset < 0
     or p_page_offset > 100000 then
    raise exception 'Invalid hospital directory pagination.';
  end if;

  select hospital.latitude, hospital.longitude
    into v_center_lat, v_center_lng
  from public.hospitals hospital
  where hospital.user_id = auth.uid();

  if v_center_lat is null or v_center_lng is null
     or v_center_lat not between -90 and 90
     or v_center_lng not between -180 and 180 then
    raise exception 'Save valid registered hospital coordinates before searching the network.';
  end if;

  return query
  with located as (
    select
      hospital.id,
      hospital.hospital_name,
      hospital.hospital_type,
      hospital.street_address,
      hospital.location_address,
      hospital.city,
      null::text as phone,
      null::text as email,
      hospital.latitude,
      hospital.longitude,
      6371 * 2 * asin(sqrt(least(1::double precision, greatest(0::double precision,
        power(sin(radians(hospital.latitude - v_center_lat) / 2), 2)
        + cos(radians(v_center_lat)) * cos(radians(hospital.latitude))
        * power(sin(radians(hospital.longitude - v_center_lng) / 2), 2)
      )))) as distance
    from public.hospitals hospital
    join public.profiles profile on profile.id = hospital.user_id
    where hospital.user_id <> auth.uid()
      and profile.role = 'hospital'
      and hospital.latitude between -90 and 90
      and hospital.longitude between -180 and 180
      and 6371 * 2 * asin(sqrt(least(1::double precision, greatest(0::double precision,
        power(sin(radians(hospital.latitude - v_center_lat) / 2), 2)
        + cos(radians(v_center_lat)) * cos(radians(hospital.latitude))
        * power(sin(radians(hospital.longitude - v_center_lng) / 2), 2)
      )))) <= p_radius_km
      and (
        v_query = ''
        or concat_ws(' ', hospital.hospital_name, hospital.hospital_type,
                     hospital.street_address, hospital.location_address,
                     hospital.city) ilike '%' || v_query || '%'
      )
  )
  select
    located.id,
    located.hospital_name,
    located.hospital_type,
    located.street_address,
    located.location_address,
    located.city,
    located.phone,
    located.email,
    located.latitude,
    located.longitude,
    located.distance,
    count(*) over ()
  from located
  order by located.distance, located.hospital_name
  limit p_page_size
  offset p_page_offset;
end;
$$;

create or replace function public.distribute_hospital_request(
  p_request_id uuid,
  p_radius_km integer
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.blood_requests%rowtype;
  v_source_hospital_id uuid;
  v_center_lat double precision;
  v_center_lng double precision;
  v_source_name text;
  v_shared_count integer := 0;
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'hospital'
  ) then
    raise exception 'Only authenticated hospital accounts can share blood requests.';
  end if;

  if p_radius_km is null or p_radius_km not in (5, 10, 25) then
    raise exception 'Share radius must be 5, 10, or 25 km.';
  end if;

  select request.*
    into v_request
  from public.blood_requests request
  where request.id = p_request_id
    and request.hospital_id = auth.uid();

  if not found then
    raise exception 'The blood request was not found for this hospital.';
  end if;

  if v_request.status in ('Fulfilled', 'Cancelled') then
    raise exception 'Fulfilled or cancelled requests cannot be shared.';
  end if;

  select hospital.id, hospital.latitude, hospital.longitude, hospital.hospital_name
    into v_source_hospital_id, v_center_lat, v_center_lng, v_source_name
  from public.hospitals hospital
  where hospital.user_id = auth.uid();

  if v_center_lat is null or v_center_lng is null
     or v_center_lat not between -90 and 90
     or v_center_lng not between -180 and 180 then
    raise exception 'Save valid registered hospital coordinates before sharing a request.';
  end if;

  with eligible as (
    select
      hospital.id as recipient_id,
      6371 * 2 * asin(sqrt(least(1::double precision, greatest(0::double precision,
        power(sin(radians(hospital.latitude - v_center_lat) / 2), 2)
        + cos(radians(v_center_lat)) * cos(radians(hospital.latitude))
        * power(sin(radians(hospital.longitude - v_center_lng) / 2), 2)
      )))) as distance
    from public.hospitals hospital
    join public.profiles profile on profile.id = hospital.user_id
    where hospital.user_id <> auth.uid()
      and profile.role = 'hospital'
      and hospital.latitude between -90 and 90
      and hospital.longitude between -180 and 180
  ),
  inserted as (
    insert into public.hospital_request_recipients (
      request_id, recipient_hospital_id, shared_by, distance_km
    )
    select p_request_id, eligible.recipient_id, v_source_hospital_id, eligible.distance
    from eligible
    where eligible.distance <= p_radius_km
    on conflict (request_id, recipient_hospital_id) do nothing
    returning recipient_hospital_id
  ),
  notifications_written as (
    insert into public.notifications (user_id, type, title, body)
    select
      hospital.user_id,
      'request',
      'Nearby blood requirement',
      format(
        '%s shared request %s: %s, %s unit(s), %s urgency, within %s km.',
        v_source_name,
        v_request.id,
        v_request.blood_group,
        v_request.units,
        lower(v_request.urgency),
        p_radius_km
      )
    from inserted
    join public.hospitals hospital
      on hospital.id = inserted.recipient_hospital_id
    returning id
  )
  select count(*)::integer
    into v_shared_count
  from inserted;

  return v_shared_count;
end;
$$;

create or replace function public.create_hospital_request_and_share(
  p_blood_group text,
  p_units integer,
  p_urgency text,
  p_area text,
  p_department text,
  p_required_by timestamptz,
  p_patient_age integer,
  p_notes text,
  p_latitude double precision,
  p_longitude double precision,
  p_location_address text,
  p_recipient_radius_km integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.blood_requests%rowtype;
  v_recipient_count integer := 0;
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'hospital'
  ) then
    raise exception 'Only authenticated hospital accounts can create blood requests.';
  end if;

  if p_blood_group is null
     or p_blood_group not in ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')
     or p_units is null
     or p_units <= 0
     or p_units > 20
     or p_urgency is null
     or p_urgency not in ('CRITICAL', 'URGENT', 'NORMAL') then
    raise exception 'Invalid blood request details.';
  end if;

  if (p_latitude is null) <> (p_longitude is null)
     or (p_latitude is not null and (
       p_latitude not between -90 and 90
       or p_longitude not between -180 and 180
     )) then
    raise exception 'Request location coordinates are invalid.';
  end if;

  if p_recipient_radius_km is not null
     and p_recipient_radius_km not in (5, 10, 25) then
    raise exception 'Share radius must be 5, 10, or 25 km.';
  end if;

  if not exists (
    select 1
    from public.hospitals hospital
    where hospital.user_id = auth.uid()
  ) then
    raise exception 'Hospital profile not found.';
  end if;

  insert into public.blood_requests (
    hospital_id, blood_group, units, urgency, status, area, department,
    required_by, patient_age, notes, latitude, longitude, location_address
  )
  values (
    auth.uid(), p_blood_group, p_units, p_urgency, 'Matching',
    nullif(trim(p_area), ''), nullif(trim(p_department), ''), p_required_by,
    p_patient_age, nullif(trim(p_notes), ''), p_latitude, p_longitude,
    nullif(trim(p_location_address), '')
  )
  returning * into v_request;

  if p_recipient_radius_km is not null then
    v_recipient_count := public.distribute_hospital_request(
      v_request.id,
      p_recipient_radius_km
    );
  end if;

  return jsonb_build_object(
    'request_id', v_request.id,
    'recipient_count', v_recipient_count,
    'created_at', v_request.created_at,
    'status', v_request.status
  );
end;
$$;

create or replace function public.hospital_incoming_requests()
returns table (
  request_id uuid,
  source_hospital_name text,
  blood_group text,
  units integer,
  urgency text,
  request_status text,
  area text,
  required_by timestamptz,
  created_at timestamptz,
  response_status text,
  responded_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'hospital'
  ) then
    raise exception 'Only authenticated hospital accounts can view shared requests.';
  end if;

  return query
  select
    request.id,
    source_hospital.hospital_name,
    request.blood_group,
    request.units,
    request.urgency,
    request.status,
    request.area,
    request.required_by,
    request.created_at,
    recipient.response_status,
    recipient.responded_at
  from public.hospital_request_recipients recipient
  join public.blood_requests request on request.id = recipient.request_id
  join public.hospitals source_hospital
    on source_hospital.user_id = request.hospital_id
  where recipient.recipient_hospital_id = (
    select hospital.id
    from public.hospitals hospital
    where hospital.user_id = auth.uid()
  )
  order by recipient.created_at desc
  limit 100;
end;
$$;

create or replace function public.respond_to_hospital_request(
  p_request_id uuid,
  p_response_status text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source_hospital_id uuid;
  v_source_name text;
  v_blood_group text;
  v_request_status text;
  v_current_status text;
  v_response_status text;
begin
  if p_response_status is null or p_response_status not in ('Accepted', 'Declined') then
    raise exception 'Response must be Accepted or Declined.';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'hospital'
  ) then
    raise exception 'Only authenticated hospital accounts can respond to shared requests.';
  end if;

  select recipient.response_status, request.hospital_id, hospital.hospital_name,
         request.blood_group, request.status
    into v_current_status, v_source_hospital_id, v_source_name,
         v_blood_group, v_request_status
  from public.hospital_request_recipients recipient
  join public.blood_requests request on request.id = recipient.request_id
  join public.hospitals hospital on hospital.user_id = request.hospital_id
  where recipient.request_id = p_request_id
    and recipient.recipient_hospital_id = (
      select recipient_hospital.id
      from public.hospitals recipient_hospital
      where recipient_hospital.user_id = auth.uid()
    );

  if not found then
    raise exception 'This request has not been shared with your hospital.';
  end if;

  if v_request_status in ('Fulfilled', 'Cancelled') then
    raise exception 'This request is no longer accepting hospital responses.';
  end if;

  if v_current_status = p_response_status then
    return v_current_status;
  end if;

  if v_current_status <> 'Pending' then
    raise exception 'Your hospital has already responded to this request.';
  end if;

  update public.hospital_request_recipients
  set response_status = p_response_status,
      responded_at = now()
  where request_id = p_request_id
    and recipient_hospital_id = (
      select recipient_hospital.id
      from public.hospitals recipient_hospital
      where recipient_hospital.user_id = auth.uid()
    )
    and response_status = 'Pending';

  if not found then
    raise exception 'The request response changed before it could be saved.';
  end if;

  insert into public.notifications (user_id, type, title, body)
  values (
    v_source_hospital_id,
    'request',
    'Nearby hospital response',
    format(
      '%s responded %s to request %s (%s).',
      v_source_name,
      lower(p_response_status),
      p_request_id,
      v_blood_group
    )
  );

  return p_response_status;
end;
$$;

create or replace function public.hospital_request_network_responses(
  p_request_id uuid
)
returns table (
  hospital_name text,
  response_status text,
  responded_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.blood_requests request
    join public.profiles profile on profile.id = request.hospital_id
    where request.id = p_request_id
      and request.hospital_id = auth.uid()
      and profile.role = 'hospital'
  ) then
    raise exception 'The blood request was not found for this hospital.';
  end if;

  return query
  select hospital.hospital_name, recipient.response_status, recipient.responded_at
  from public.hospital_request_recipients recipient
  join public.hospitals hospital
    on hospital.id = recipient.recipient_hospital_id
  where recipient.request_id = p_request_id
  order by recipient.created_at;
end;
$$;

revoke all on function public.hospital_network_directory(integer, text, integer, integer) from public;
revoke all on function public.distribute_hospital_request(uuid, integer) from public;
revoke all on function public.create_hospital_request_and_share(text, integer, text, text, text, timestamptz, integer, text, double precision, double precision, text, integer) from public;
revoke all on function public.hospital_incoming_requests() from public;
revoke all on function public.respond_to_hospital_request(uuid, text) from public;
revoke all on function public.hospital_request_network_responses(uuid) from public;

grant execute on function public.hospital_network_directory(integer, text, integer, integer) to authenticated;
grant execute on function public.distribute_hospital_request(uuid, integer) to authenticated;
grant execute on function public.create_hospital_request_and_share(text, integer, text, text, text, timestamptz, integer, text, double precision, double precision, text, integer) to authenticated;
grant execute on function public.hospital_incoming_requests() to authenticated;
grant execute on function public.respond_to_hospital_request(uuid, text) to authenticated;
grant execute on function public.hospital_request_network_responses(uuid) to authenticated;

create or replace function public.hospital_nearby_network(
  center_lat double precision,
  center_lng double precision,
  search_radius_km integer,
  blood_group_filter text default null
)
returns table (
  resource_id uuid,
  resource_type text,
  resource_name text,
  latitude double precision,
  longitude double precision,
  blood_groups text[],
  available boolean,
  area text,
  is_verified boolean,
  distance_km double precision
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with resources as (
    select hospital.id, 'hospital'::text as kind, hospital.hospital_name as name,
      hospital.latitude as lat, hospital.longitude as lng,
      hospital.available_blood_groups as groups, true as is_available,
      hospital.city as area, hospital.verified as is_verified
    from public.hospitals hospital
    join public.profiles profile on profile.id = hospital.user_id
    where hospital.user_id <> auth.uid()
      and profile.role = 'hospital'
      and hospital.latitude between -90 and 90
      and hospital.longitude between -180 and 180
    union all
    select hospital.id, 'blood_bank', coalesce(hospital.blood_bank, hospital.hospital_name),
      hospital.latitude, hospital.longitude, hospital.available_blood_groups,
      true, hospital.city, hospital.verified
    from public.hospitals hospital
    join public.profiles profile on profile.id = hospital.user_id
    where hospital.blood_bank is not null
      and hospital.blood_bank not like 'No blood bank%'
      and hospital.user_id <> auth.uid()
      and profile.role = 'hospital'
      and hospital.latitude between -90 and 90
      and hospital.longitude between -180 and 180
    union all
    select donor.id, 'donor', 'Donor', donor.approximate_latitude,
      donor.approximate_longitude, array[donor.blood_group], donor.available,
      donor.city, donor.verified
    from public.donors donor
    where donor.available and donor.consent
      and donor.approximate_latitude between -90 and 90
      and donor.approximate_longitude between -180 and 180
    union all
    select ngo.id, 'ngo', ngo.organisation_name, ngo.latitude, ngo.longitude,
      '{}'::text[], true, ngo.city, ngo.verified
    from public.ngos ngo
    where ngo.latitude between -90 and 90
      and ngo.longitude between -180 and 180
  ),
  located as (
    select resources.*,
      6371 * 2 * asin(sqrt(least(1::double precision, greatest(0::double precision,
        power(sin(radians(lat - center_lat) / 2), 2) +
        cos(radians(center_lat)) * cos(radians(lat)) *
        power(sin(radians(lng - center_lng) / 2), 2)
      )))) as distance
    from resources
    where center_lat between -90 and 90
      and center_lng between -180 and 180
      and search_radius_km between 1 and 50
  )
  select located.id, located.kind, located.name, located.lat, located.lng,
    located.groups, located.is_available, located.area, located.is_verified,
    located.distance
  from located
  where located.distance <= search_radius_km
    and exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid() and profile.role = 'hospital'
    )
    and (blood_group_filter is null or blood_group_filter = any(located.groups))
  order by located.distance
  limit 200;
$$;

revoke all on function public.hospital_nearby_network(double precision, double precision, integer, text) from public;
grant execute on function public.hospital_nearby_network(double precision, double precision, integer, text) to authenticated;
