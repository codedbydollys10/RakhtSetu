alter table public.blood_requests
  add column if not exists department text,
  add column if not exists required_by timestamptz,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_address text;

alter table public.hospitals
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_address text,
  add column if not exists available_blood_groups text[] not null default '{}',
  add column if not exists verified boolean not null default false;
alter table public.ngos
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists verified boolean not null default false;
alter table public.donors
  add column if not exists approximate_latitude double precision,
  add column if not exists approximate_longitude double precision,
  add column if not exists consent boolean not null default false,
  add column if not exists verified boolean not null default false;

update public.hospitals
set latitude = (regexp_match(map_location, '\((-?[0-9]+(\.[0-9]+)?),\s*(-?[0-9]+(\.[0-9]+)?)\)\s*$'))[1]::double precision,
    longitude = (regexp_match(map_location, '\((-?[0-9]+(\.[0-9]+)?),\s*(-?[0-9]+(\.[0-9]+)?)\)\s*$'))[3]::double precision,
    location_address = regexp_replace(map_location, '\s*\(-?[0-9]+(\.[0-9]+)?,\s*-?[0-9]+(\.[0-9]+)?\)\s*$', '')
where latitude is null and map_location ~ '\(-?[0-9]+(\.[0-9]+)?,\s*-?[0-9]+(\.[0-9]+)?\)\s*$';

update public.ngos
set latitude = (regexp_match(map_location, '\((-?[0-9]+(\.[0-9]+)?),\s*(-?[0-9]+(\.[0-9]+)?)\)\s*$'))[1]::double precision,
    longitude = (regexp_match(map_location, '\((-?[0-9]+(\.[0-9]+)?),\s*(-?[0-9]+(\.[0-9]+)?)\)\s*$'))[3]::double precision
where latitude is null and map_location ~ '\(-?[0-9]+(\.[0-9]+)?,\s*-?[0-9]+(\.[0-9]+)?\)\s*$';

update public.donors
set approximate_latitude = round(((regexp_match(map_location, '\((-?[0-9]+(\.[0-9]+)?),\s*(-?[0-9]+(\.[0-9]+)?)\)\s*$'))[1]::double precision)::numeric, 2)::double precision,
    approximate_longitude = round(((regexp_match(map_location, '\((-?[0-9]+(\.[0-9]+)?),\s*(-?[0-9]+(\.[0-9]+)?)\)\s*$'))[3]::double precision)::numeric, 2)::double precision
where approximate_latitude is null and map_location ~ '\(-?[0-9]+(\.[0-9]+)?,\s*-?[0-9]+(\.[0-9]+)?\)\s*$';

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  patient_name text not null,
  blood_group text not null check (blood_group in ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')),
  request_id uuid references public.blood_requests(id) on delete set null,
  units_required integer not null check (units_required > 0),
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.hospital_notification_preferences (
  hospital_id uuid primary key references public.hospitals(id) on delete cascade,
  new_donor_response boolean not null default true,
  critical_request boolean not null default true,
  request_verification boolean not null default true,
  request_fulfillment boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.donor_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  donor_id uuid not null references public.donors(id) on delete cascade,
  status text not null default 'Response Sent',
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, donor_id)
);

create index if not exists blood_requests_hospital_created_idx
  on public.blood_requests (hospital_id, created_at desc);
create index if not exists patients_hospital_created_idx
  on public.patients (hospital_id, created_at desc);
create index if not exists donor_responses_request_idx
  on public.donor_responses (request_id, responded_at desc);

alter table public.patients enable row level security;
alter table public.hospital_notification_preferences enable row level security;
alter table public.donor_responses enable row level security;

drop policy if exists "Hospitals can manage their patients" on public.patients;
create policy "Hospitals can manage their patients"
  on public.patients for all to authenticated
  using (exists (
    select 1 from public.hospitals h
    where h.id = public.patients.hospital_id and h.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.hospitals h
    where h.id = public.patients.hospital_id and h.user_id = auth.uid()
  ));

drop policy if exists "Hospitals can manage their notification preferences" on public.hospital_notification_preferences;
create policy "Hospitals can manage their notification preferences"
  on public.hospital_notification_preferences for all to authenticated
  using (exists (
    select 1 from public.hospitals h
    where h.id = public.hospital_notification_preferences.hospital_id
      and h.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.hospitals h
    where h.id = public.hospital_notification_preferences.hospital_id
      and h.user_id = auth.uid()
  ));

drop policy if exists "Donors can manage their own responses" on public.donor_responses;
create policy "Donors can manage their own responses"
  on public.donor_responses for all to authenticated
  using (exists (
    select 1 from public.donors d
    where d.id = donor_id and d.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.donors d
    where d.id = donor_id and d.user_id = auth.uid()
  ));

drop policy if exists "Hospitals can view responses to their requests" on public.donor_responses;
create policy "Hospitals can view responses to their requests"
  on public.donor_responses for select to authenticated
  using (exists (
    select 1 from public.blood_requests r
    join public.hospitals h on h.id = r.hospital_id
    where r.id = request_id and h.user_id = auth.uid()
  ));

grant select, insert, update, delete on public.patients to authenticated;
grant select, insert, update, delete on public.hospital_notification_preferences to authenticated;
grant select, insert, update, delete on public.donor_responses to authenticated;

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
set search_path = public
as $$
  with resources as (
    select h.id as id, 'hospital'::text as kind, h.hospital_name as name,
      h.latitude as lat, h.longitude as lng, h.available_blood_groups as groups,
      true as is_available, h.city as area, h.verified as is_verified
    from public.hospitals h
    where h.user_id <> auth.uid() and h.latitude is not null and h.longitude is not null
    union all
    select h.id, 'blood_bank', coalesce(h.blood_bank, h.hospital_name),
      h.latitude, h.longitude, h.available_blood_groups, true, h.city, h.verified
    from public.hospitals h
    where h.blood_bank is not null and h.user_id <> auth.uid()
      and h.latitude is not null and h.longitude is not null
    union all
    select d.id, 'donor', 'Verified donor', d.approximate_latitude,
      d.approximate_longitude, array[d.blood_group], d.available, d.city, d.verified
    from public.donors d
    where d.available and d.verified and d.consent
      and d.approximate_latitude is not null and d.approximate_longitude is not null
    union all
    select n.id, 'ngo', n.organisation_name, n.latitude, n.longitude,
      '{}'::text[], true, n.city, n.verified
    from public.ngos n
    where n.latitude is not null and n.longitude is not null
  ),
  located as (
    select resources.*,
      6371 * 2 * asin(sqrt(
        power(sin(radians(lat - center_lat) / 2), 2) +
        cos(radians(center_lat)) * cos(radians(lat)) *
        power(sin(radians(lng - center_lng) / 2), 2)
      )) as distance
    from resources
    where center_lat between -90 and 90
      and center_lng between -180 and 180
      and search_radius_km between 1 and 50
      and lat between -90 and 90 and lng between -180 and 180
  )
  select id, kind, name, lat, lng, groups, is_available, area, is_verified, distance
  from located
  where distance <= search_radius_km
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'hospital'
    )
    and (blood_group_filter is null or blood_group_filter = any(groups))
  order by distance
  limit 200;
$$;

revoke all on function public.hospital_nearby_network(double precision, double precision, integer, text) from public;
grant execute on function public.hospital_nearby_network(double precision, double precision, integer, text) to authenticated;
