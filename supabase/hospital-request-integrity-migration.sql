alter table public.blood_requests
  add column if not exists units integer,
  add column if not exists area text,
  add column if not exists department text,
  add column if not exists notes text,
  add column if not exists patient_age integer,
  add column if not exists required_by timestamptz,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_address text,
  add column if not exists fulfilled_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'blood_requests'
      and column_name = 'units_required'
  ) then
    execute '
      update public.blood_requests
      set units = units_required
      where units is null and units_required is not null
    ';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.blood_requests'::regclass
      and conname = 'blood_requests_units_positive'
  ) then
    alter table public.blood_requests
      add constraint blood_requests_units_positive
      check (units is not null and units > 0) not valid;
  end if;
end;
$$;

create or replace function public.require_organisation_registration_data()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.raw_user_meta_data ->> 'role' = 'hospital'
    and nullif(btrim(new.raw_user_meta_data ->> 'hospital_name'), '') is null then
    raise exception 'Hospital registration requires an organisation name.';
  end if;

  if new.raw_user_meta_data ->> 'role' = 'ngo'
    and nullif(btrim(new.raw_user_meta_data ->> 'organisation_name'), '') is null then
    raise exception 'NGO registration requires an organisation name.';
  end if;

  return new;
end;
$$;

drop trigger if exists require_organisation_registration_data
  on auth.users;
create trigger require_organisation_registration_data
before insert on auth.users
for each row execute function public.require_organisation_registration_data();

update public.hospitals h
set user_id = p.id
from public.profiles p
join auth.users u on u.id = p.id
where h.id = p.id
  and h.user_id is null
  and p.role = 'hospital'
  and u.raw_user_meta_data ->> 'role' = p.role
  and not exists (
    select 1 from public.hospitals linked
    where linked.user_id = p.id
  );

update public.ngos n
set user_id = p.id
from public.profiles p
join auth.users u on u.id = p.id
where n.id = p.id
  and n.user_id is null
  and p.role = 'ngo'
  and u.raw_user_meta_data ->> 'role' = p.role
  and not exists (
    select 1 from public.ngos linked
    where linked.user_id = p.id
  );

insert into public.hospitals (
  id,
  user_id,
  hospital_name,
  hospital_type,
  registration_id,
  contact_person,
  phone,
  email,
  street_address,
  city,
  map_location,
  blood_bank,
  operating_hours
)
select
  p.id,
  u.id,
  btrim(u.raw_user_meta_data ->> 'hospital_name'),
  nullif(btrim(u.raw_user_meta_data ->> 'hospital_type'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'registration_id'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'contact_person'), ''),
  coalesce(nullif(btrim(p.phone), ''), nullif(btrim(u.raw_user_meta_data ->> 'phone'), '')),
  coalesce(nullif(btrim(p.email), ''), u.email),
  nullif(btrim(u.raw_user_meta_data ->> 'street_address'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'city'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'map_location'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'blood_bank'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'operating_hours'), '')
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'hospital'
  and u.raw_user_meta_data ->> 'role' = p.role
  and nullif(btrim(u.raw_user_meta_data ->> 'hospital_name'), '') is not null
  and not exists (
    select 1 from public.hospitals h where h.user_id = u.id
  )
on conflict do nothing;

insert into public.ngos (
  id,
  user_id,
  organisation_name,
  registration_number,
  organisation_type,
  contact_person,
  email,
  phone,
  street_address,
  city,
  map_location,
  areas_served
)
select
  p.id,
  u.id,
  btrim(u.raw_user_meta_data ->> 'organisation_name'),
  nullif(btrim(u.raw_user_meta_data ->> 'registration_number'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'organisation_type'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'contact_person'), ''),
  coalesce(nullif(btrim(p.email), ''), u.email),
  coalesce(nullif(btrim(p.phone), ''), nullif(btrim(u.raw_user_meta_data ->> 'phone'), '')),
  nullif(btrim(u.raw_user_meta_data ->> 'street_address'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'city'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'map_location'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'areas_served'), '')
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'ngo'
  and u.raw_user_meta_data ->> 'role' = p.role
  and nullif(btrim(u.raw_user_meta_data ->> 'organisation_name'), '') is not null
  and not exists (
    select 1 from public.ngos n where n.user_id = u.id
  )
on conflict do nothing;

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

drop policy if exists "Hospitals can manage their patients"
  on public.patients;
create policy "Hospitals can manage their patients"
  on public.patients for all to authenticated
  using (
    exists (
      select 1 from public.hospitals h
      where h.id = public.patients.hospital_id
        and h.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.hospitals h
      where h.id = public.patients.hospital_id
        and h.user_id = auth.uid()
    )
  );

drop policy if exists "Hospitals can manage their notification preferences"
  on public.hospital_notification_preferences;
create policy "Hospitals can manage their notification preferences"
  on public.hospital_notification_preferences for all to authenticated
  using (
    exists (
      select 1 from public.hospitals h
      where h.id = public.hospital_notification_preferences.hospital_id
        and h.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.hospitals h
      where h.id = public.hospital_notification_preferences.hospital_id
        and h.user_id = auth.uid()
    )
  );

drop policy if exists "Hospitals can view responses to their requests"
  on public.donor_responses;
create policy "Hospitals can view responses to their requests"
  on public.donor_responses for select to authenticated
  using (
    exists (
      select 1
      from public.blood_requests r
      join public.hospitals h on h.id = r.hospital_id
      where r.id = public.donor_responses.request_id
        and h.user_id = auth.uid()
    )
  );

select
  p.id as profile_id,
  p.role,
  case
    when p.role = 'hospital'
      and nullif(btrim(u.raw_user_meta_data ->> 'hospital_name'), '') is null
      then 'Missing explicit hospital_name in auth registration metadata'
    when p.role = 'ngo'
      and nullif(btrim(u.raw_user_meta_data ->> 'organisation_name'), '') is null
      then 'Missing explicit organisation_name in auth registration metadata'
    else 'Role record remains missing; check unique registration identifiers and migration errors'
  end as repair_status
from public.profiles p
join auth.users u on u.id = p.id
where p.role in ('hospital', 'ngo')
  and (
    (p.role = 'hospital' and not exists (
      select 1 from public.hospitals h where h.user_id = u.id
    ))
    or
    (p.role = 'ngo' and not exists (
      select 1 from public.ngos n where n.user_id = u.id
    ))
  )
order by p.role, p.id;
