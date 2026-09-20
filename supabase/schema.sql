create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('hospital', 'ngo', 'donor')),
  full_name text not null,
  email text not null,
  phone text,
  city text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hospitals (
  id uuid primary key references public.profiles(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete cascade,
  hospital_name text not null,
  hospital_type text,
  registration_id text,
  contact_person text,
  phone text,
  email text,
  street_address text,
  city text,
  map_location text,
  blood_bank text,
  operating_hours text
);

create table if not exists public.ngos (
  id uuid primary key references public.profiles(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete cascade,
  organisation_name text not null,
  registration_number text,
  organisation_type text,
  contact_person text,
  email text,
  phone text,
  street_address text,
  city text,
  map_location text,
  areas_served text
);

create table if not exists public.donors (
  id uuid primary key references public.profiles(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  blood_group text not null check (blood_group in ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')),
  age integer,
  category text,
  gender text,
  aadhaar text,
  map_location text,
  city text,
  radius integer,
  consent boolean not null default false,
  available boolean not null default true,
  radius_km integer,
  last_donation_date date,
  donations_count integer not null default 0
);

create table if not exists public.blood_requests (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  blood_group text not null check (blood_group in ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')),
  units integer not null check (units > 0),
  urgency text not null check (urgency in ('CRITICAL', 'URGENT', 'NORMAL')),
  status text not null default 'Verification Pending',
  area text,
  patient_age integer,
  notes text,
  verified_by uuid references public.ngos(id),
  matched_donor uuid references public.donors(id),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.hospitals add column if not exists user_id uuid;
alter table public.hospitals add column if not exists phone text;
alter table public.hospitals add column if not exists email text;
alter table public.hospitals add column if not exists street_address text;
alter table public.hospitals add column if not exists city text;
alter table public.hospitals add column if not exists map_location text;
alter table public.hospitals add column if not exists registration_certificate text;
alter table public.hospitals add column if not exists registration_certificate_url text;
alter table public.ngos add column if not exists user_id uuid;
alter table public.ngos add column if not exists email text;
alter table public.ngos add column if not exists phone text;
alter table public.ngos add column if not exists street_address text;
alter table public.ngos add column if not exists city text;
alter table public.ngos add column if not exists map_location text;
alter table public.ngos add column if not exists registration_certificate text;
alter table public.ngos add column if not exists registration_certificate_url text;
alter table public.donors add column if not exists user_id uuid;
alter table public.donors add column if not exists full_name text;
alter table public.donors add column if not exists email text;
alter table public.donors add column if not exists phone text;
alter table public.donors add column if not exists category text;
alter table public.donors add column if not exists aadhaar text;
alter table public.donors add column if not exists map_location text;
alter table public.donors add column if not exists city text;
alter table public.donors add column if not exists radius integer;
alter table public.donors add column if not exists consent boolean default false;
alter table public.donors add column if not exists available boolean not null default true;

create unique index if not exists hospitals_user_id_key on public.hospitals(user_id);
create unique index if not exists hospitals_registration_id_key on public.hospitals(registration_id) where registration_id is not null;
create unique index if not exists ngos_user_id_key on public.ngos(user_id);
create unique index if not exists ngos_registration_number_key on public.ngos(registration_number) where registration_number is not null;
create unique index if not exists donors_user_id_key on public.donors(user_id);

insert into storage.buckets (id, name, public)
values
  ('ngo-documents', 'ngo-documents', false),
  ('hospital-documents', 'hospital-documents', false),
  ('registration-certificates', 'registration-certificates', false)
on conflict (id) do update set public = false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text := new.raw_user_meta_data ->> 'role';
begin
  if user_role is null or user_role not in ('hospital', 'ngo', 'donor') then
    raise exception 'Invalid or missing user role';
  end if;

  if coalesce(new.raw_user_meta_data ->> 'full_name', '') = ''
     or coalesce(new.email, '') = '' then
    raise exception 'Missing required profile registration data';
  end if;

  insert into public.profiles (id, role, full_name, email, phone)
  values (
    new.id,
    user_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  );

  if user_role = 'hospital' then
    if coalesce(new.raw_user_meta_data ->> 'hospital_name', '') = '' then
      raise exception 'Missing hospital registration data';
    end if;
    insert into public.hospitals (
      id, user_id, hospital_name, hospital_type, registration_id,
      contact_person, phone, email, street_address, city, map_location,
      blood_bank, operating_hours, registration_certificate
    )
    values (
      new.id,
      new.id,
      coalesce(new.raw_user_meta_data ->> 'hospital_name', new.raw_user_meta_data ->> 'full_name'),
      new.raw_user_meta_data ->> 'hospital_type',
      new.raw_user_meta_data ->> 'registration_id',
      new.raw_user_meta_data ->> 'contact_person',
      new.raw_user_meta_data ->> 'phone',
      new.email,
      new.raw_user_meta_data ->> 'street_address',
      new.raw_user_meta_data ->> 'city',
      new.raw_user_meta_data ->> 'map_location',
      new.raw_user_meta_data ->> 'blood_bank',
      new.raw_user_meta_data ->> 'operating_hours',
      new.raw_user_meta_data ->> 'registration_certificate'
    );
  elsif user_role = 'ngo' then
    if coalesce(new.raw_user_meta_data ->> 'organisation_name', '') = '' then
      raise exception 'Missing NGO registration data';
    end if;
    insert into public.ngos (
      id, user_id, organisation_name, registration_number, organisation_type,
      contact_person, email, phone, street_address, city, map_location,
      areas_served, registration_certificate_url
    )
    values (
      new.id,
      new.id,
      coalesce(new.raw_user_meta_data ->> 'organisation_name', new.raw_user_meta_data ->> 'full_name'),
      new.raw_user_meta_data ->> 'registration_number',
      new.raw_user_meta_data ->> 'organisation_type',
      new.raw_user_meta_data ->> 'contact_person',
      new.email,
      new.raw_user_meta_data ->> 'phone',
      new.raw_user_meta_data ->> 'street_address',
      new.raw_user_meta_data ->> 'city',
      new.raw_user_meta_data ->> 'map_location',
      new.raw_user_meta_data ->> 'areas_served',
      new.raw_user_meta_data ->> 'registration_certificate'
    );
  else
    if coalesce(new.raw_user_meta_data ->> 'blood_group', '') = '' then
      raise exception 'Missing donor registration data';
    end if;
    insert into public.donors (
      id, user_id, full_name, email, phone, blood_group, age, category,
      gender, aadhaar, map_location, city, radius, consent, radius_km
    )
    values (
      new.id,
      new.id,
      new.raw_user_meta_data ->> 'full_name',
      new.email,
      new.raw_user_meta_data ->> 'phone',
      new.raw_user_meta_data ->> 'blood_group',
      nullif(new.raw_user_meta_data ->> 'age', '')::integer,
      new.raw_user_meta_data ->> 'category',
      new.raw_user_meta_data ->> 'gender',
      new.raw_user_meta_data ->> 'aadhaar',
      new.raw_user_meta_data ->> 'map_location',
      new.raw_user_meta_data ->> 'city',
      nullif(regexp_replace(new.raw_user_meta_data ->> 'radius', '[^0-9]', '', 'g'), '')::integer,
      coalesce(nullif(new.raw_user_meta_data ->> 'consent', '')::boolean, false),
      nullif(regexp_replace(new.raw_user_meta_data ->> 'radius_km', '[^0-9]', '', 'g'), '')::integer
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.ensure_donor_record()
returns void
language plpgsql
security definer set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  account auth.users%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select * into account
  from auth.users
  where id = current_user_id;

  if account.id is null or account.raw_user_meta_data ->> 'role' <> 'donor' then
    return;
  end if;

  if coalesce(account.raw_user_meta_data ->> 'blood_group', '') = '' then
    raise exception 'Missing donor registration data';
  end if;

  insert into public.donors (
    id, user_id, full_name, email, phone, age, category, gender, aadhaar,
    blood_group, map_location, city, radius, consent, radius_km
  )
  values (
    account.id,
    account.id,
    account.raw_user_meta_data ->> 'full_name',
    account.email,
    account.raw_user_meta_data ->> 'phone',
    nullif(account.raw_user_meta_data ->> 'age', '')::integer,
    account.raw_user_meta_data ->> 'category',
    account.raw_user_meta_data ->> 'gender',
    account.raw_user_meta_data ->> 'aadhaar',
    account.raw_user_meta_data ->> 'blood_group',
    account.raw_user_meta_data ->> 'map_location',
    account.raw_user_meta_data ->> 'city',
    nullif(regexp_replace(account.raw_user_meta_data ->> 'radius', '[^0-9]', '', 'g'), '')::integer,
    coalesce(nullif(account.raw_user_meta_data ->> 'consent', '')::boolean, false),
    nullif(regexp_replace(account.raw_user_meta_data ->> 'radius_km', '[^0-9]', '', 'g'), '')::integer
  )
  on conflict (id) do update set
    user_id = excluded.user_id,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    age = excluded.age,
    category = excluded.category,
    gender = excluded.gender,
    aadhaar = excluded.aadhaar,
    blood_group = excluded.blood_group,
    map_location = excluded.map_location,
    city = excluded.city,
    radius = excluded.radius,
    consent = excluded.consent,
    radius_km = excluded.radius_km;
end;
$$;

grant execute on function public.ensure_donor_record() to authenticated;

alter table public.profiles enable row level security;
alter table public.hospitals enable row level security;
alter table public.ngos enable row level security;
alter table public.donors enable row level security;
alter table public.blood_requests enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create policy "Users can read their profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can create their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can manage their hospital record" on public.hospitals;
create policy "Users can manage their hospital record" on public.hospitals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage their NGO record" on public.ngos;
create policy "Users can manage their NGO record" on public.ngos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage their donor record" on public.donors;
create policy "Users can manage their donor record" on public.donors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Authenticated users can read requests" on public.blood_requests for select to authenticated using (true);
create policy "Hospitals can create requests" on public.blood_requests for insert to authenticated with check (auth.uid() = hospital_id);
create policy "Hospitals can update their requests" on public.blood_requests for update to authenticated using (auth.uid() = hospital_id) with check (auth.uid() = hospital_id);
create policy "Participants can read messages" on public.messages for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can send messages" on public.messages for insert to authenticated with check (auth.uid() = sender_id);
create policy "Users can manage their notifications" on public.notifications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "NGOs can upload their registration documents" on storage.objects;
create policy "NGOs can upload their registration documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'ngo-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "NGOs can read their registration documents" on storage.objects;
create policy "NGOs can read their registration documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'ngo-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "NGOs can update their registration documents" on storage.objects;
create policy "NGOs can update their registration documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'ngo-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'ngo-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "NGOs can delete their registration documents" on storage.objects;
create policy "NGOs can delete their registration documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'ngo-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Hospitals can upload their registration documents" on storage.objects;
create policy "Hospitals can upload their registration documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'hospital-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Hospitals can read their registration documents" on storage.objects;
create policy "Hospitals can read their registration documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'hospital-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Hospitals can update their registration documents" on storage.objects;
create policy "Hospitals can update their registration documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'hospital-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'hospital-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Hospitals can delete their registration documents" on storage.objects;
create policy "Hospitals can delete their registration documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'hospital-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can upload their registration certificates" on storage.objects;
create policy "Users can upload their registration certificates"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'registration-certificates'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can read their registration certificates" on storage.objects;
create policy "Users can read their registration certificates"
on storage.objects for select to authenticated
using (
  bucket_id = 'registration-certificates'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can update their registration certificates" on storage.objects;
create policy "Users can update their registration certificates"
on storage.objects for update to authenticated
using (
  bucket_id = 'registration-certificates'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'registration-certificates'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can delete their registration certificates" on storage.objects;
create policy "Users can delete their registration certificates"
on storage.objects for delete to authenticated
using (
  bucket_id = 'registration-certificates'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

select
  u.id as auth_user_id,
  u.email,
  u.raw_user_meta_data ->> 'role' as auth_role,
  p.id as profile_id,
  p.role as profile_role,
  d.user_id as donor_user_id,
  d.full_name as donor_name,
  d.blood_group,
  d.city,
  d.age,
  d.category
from auth.users u
left join public.profiles p on p.id = u.id
left join public.donors d on d.user_id = u.id
order by u.created_at desc;

select
  u.id as auth_user_id,
  u.email,
  u.raw_user_meta_data ->> 'role' as auth_role,
  p.id as profile_id,
  p.role as profile_role,
  n.user_id as ngo_user_id,
  n.organisation_name,
  n.registration_number,
  n.contact_person,
  n.city,
  n.registration_certificate,
  n.registration_certificate_url
from auth.users u
left join public.profiles p on p.id = u.id
left join public.ngos n on n.user_id = u.id
order by u.created_at desc;

select
  u.id as auth_user_id,
  u.email,
  u.raw_user_meta_data ->> 'role' as auth_role,
  p.id as profile_id,
  p.role as profile_role,
  h.user_id as hospital_user_id,
  h.hospital_name,
  h.hospital_type,
  h.registration_id,
  h.contact_person,
  h.city,
  h.registration_certificate,
  h.registration_certificate_url
from auth.users u
left join public.profiles p on p.id = u.id
left join public.hospitals h on h.user_id = u.id
order by u.created_at desc;
