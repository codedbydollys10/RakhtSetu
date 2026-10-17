create table if not exists public.hospital_notification_preferences (
  hospital_id uuid primary key references public.hospitals(id) on delete cascade,
  new_donor_response boolean not null default true,
  critical_request boolean not null default true,
  request_verification boolean not null default true,
  request_fulfillment boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.hospital_notification_preferences enable row level security;

drop policy if exists "Hospitals can manage their notification preferences"
  on public.hospital_notification_preferences;
create policy "Hospitals can manage their notification preferences"
  on public.hospital_notification_preferences
  for all to authenticated
  using (auth.uid() = hospital_id)
  with check (auth.uid() = hospital_id);

grant select, insert, update, delete
  on public.hospital_notification_preferences to authenticated;

create or replace function public.normalize_hospital_registration_location()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_coordinates text[];
  v_latitude double precision;
  v_longitude double precision;
begin
  if new.map_location is null then
    return new;
  end if;

  v_coordinates := regexp_match(
    new.map_location,
    '\(?\s*(-?[0-9]+(\.[0-9]+)?)\s*,\s*(-?[0-9]+(\.[0-9]+)?)\s*\)?\s*$'
  );

  if v_coordinates is null then
    return new;
  end if;

  v_latitude := v_coordinates[1]::double precision;
  v_longitude := v_coordinates[3]::double precision;

  if v_latitude not between -90 and 90
     or v_longitude not between -180 and 180 then
    return new;
  end if;

  new.latitude := coalesce(new.latitude, v_latitude);
  new.longitude := coalesce(new.longitude, v_longitude);
  new.location_address := coalesce(
    nullif(new.location_address, ''),
    nullif(
      trim(regexp_replace(
        new.map_location,
        '\s*\(?\s*-?[0-9]+(\.[0-9]+)?\s*,\s*-?[0-9]+(\.[0-9]+)?\s*\)?\s*$',
        ''
      )),
      ''
    )
  );

  return new;
end;
$$;

drop trigger if exists normalize_hospital_registration_location
  on public.hospitals;
create trigger normalize_hospital_registration_location
  before insert or update
  on public.hospitals
  for each row
  execute function public.normalize_hospital_registration_location();

update public.hospitals as target
set latitude = coalesce(target.latitude, parsed.latitude),
    longitude = coalesce(target.longitude, parsed.longitude),
    location_address = coalesce(
      nullif(target.location_address, ''),
      nullif(parsed.location_address, '')
    )
from (
  select
    hospital.id,
    (regexp_match(
      hospital.map_location,
      '\(?\s*(-?[0-9]+(\.[0-9]+)?)\s*,\s*(-?[0-9]+(\.[0-9]+)?)\s*\)?\s*$'
    ))[1]::double precision as latitude,
    (regexp_match(
      hospital.map_location,
      '\(?\s*(-?[0-9]+(\.[0-9]+)?)\s*,\s*(-?[0-9]+(\.[0-9]+)?)\s*\)?\s*$'
    ))[3]::double precision as longitude,
    trim(regexp_replace(
      hospital.map_location,
      '\s*\(?\s*-?[0-9]+(\.[0-9]+)?\s*,\s*-?[0-9]+(\.[0-9]+)?\s*\)?\s*$',
      ''
    )) as location_address
  from public.hospitals hospital
  where hospital.map_location ~
    '\(?\s*-?[0-9]+(\.[0-9]+)?\s*,\s*-?[0-9]+(\.[0-9]+)?\s*\)?\s*$'
) as parsed
where target.id = parsed.id
  and (parsed.latitude between -90 and 90)
  and (parsed.longitude between -180 and 180)
  and (
    target.latitude is null
    or target.longitude is null
    or target.location_address is null
  );

notify pgrst, 'reload schema';
