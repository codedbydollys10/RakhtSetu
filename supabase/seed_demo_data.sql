-- Synthetic, test-only dataset: 50 hospitals, 70 NGOs, 200 donors.
-- Run only in a dedicated non-production Supabase project after the Auth
-- accounts are provisioned by `npm run seed:demo:users`.
-- The 50 localities below provide 20 Mumbai and 30 wider-MMR hospital sites.
-- Every row is keyed through Auth-trigger-created profiles using
-- raw_user_meta_data.demo_dataset_id; no auth.users or profile FK is fabricated.
-- Verification flags remain false to avoid claiming demo organisations or
-- donors are real or reviewed. The prototype matching workflow does not gate
-- access or discovery on those flags.
-- Seed identifiers are hospital-001..050, ngo-001..070, donor-001..200.
-- Phone values are non-routable placeholders and email identities use
-- example.invalid. Coordinates/PIN codes are approximate locality fixtures.
-- Demo requests and donation history are not created: request triggers can
-- generate notifications, and recovery rules are pending until qualified
-- medical approval.

begin;

create temporary table demo_seed_localities (
  place_no integer primary key,
  locality text not null,
  city text not null,
  latitude double precision not null,
  longitude double precision not null,
  pin_code text not null
) on commit drop;

insert into demo_seed_localities values
  (1, 'Colaba', 'Mumbai', 18.9100, 72.8100, '400005'),
  (2, 'Byculla', 'Mumbai', 18.9800, 72.8300, '400011'),
  (3, 'Dadar', 'Mumbai', 19.0200, 72.8400, '400014'),
  (4, 'Sion', 'Mumbai', 19.0400, 72.8600, '400022'),
  (5, 'Bandra', 'Mumbai', 19.0600, 72.8400, '400050'),
  (6, 'Khar', 'Mumbai', 19.0700, 72.8300, '400052'),
  (7, 'Andheri East', 'Mumbai', 19.1200, 72.8700, '400069'),
  (8, 'Andheri West', 'Mumbai', 19.1300, 72.8300, '400058'),
  (9, 'Powai', 'Mumbai', 19.1200, 72.9100, '400076'),
  (10, 'Ghatkopar', 'Mumbai', 19.0800, 72.9100, '400077'),
  (11, 'Kurla', 'Mumbai', 19.0700, 72.8800, '400070'),
  (12, 'Chembur', 'Mumbai', 19.0500, 72.9000, '400071'),
  (13, 'Vikhroli', 'Mumbai', 19.1100, 72.9300, '400079'),
  (14, 'Mulund', 'Mumbai', 19.1700, 72.9600, '400080'),
  (15, 'Goregaon', 'Mumbai', 19.1600, 72.8500, '400062'),
  (16, 'Malad', 'Mumbai', 19.1900, 72.8400, '400064'),
  (17, 'Kandivali', 'Mumbai', 19.2100, 72.8500, '400067'),
  (18, 'Borivali', 'Mumbai', 19.2300, 72.8600, '400092'),
  (19, 'Santacruz', 'Mumbai', 19.0800, 72.8400, '400054'),
  (20, 'Worli', 'Mumbai', 19.0000, 72.8200, '400018'),
  (21, 'Thane City', 'Thane', 19.2000, 72.9700, '400601'),
  (22, 'Manpada', 'Thane', 19.2200, 72.9700, '400610'),
  (23, 'Ghodbunder Road', 'Thane', 19.2600, 72.9700, '400615'),
  (24, 'Kalwa', 'Thane', 19.1900, 73.0000, '400605'),
  (25, 'Majiwada', 'Thane', 19.2200, 72.9900, '400601'),
  (26, 'Kalyan', 'Thane', 19.2400, 73.1300, '421301'),
  (27, 'Dombivli', 'Thane', 19.2200, 73.0900, '421201'),
  (28, 'Bhiwandi', 'Thane', 19.3000, 73.0600, '421302'),
  (29, 'Ulhasnagar', 'Thane', 19.2200, 73.1600, '421003'),
  (30, 'Vashi', 'Navi Mumbai', 19.0800, 72.9900, '400703'),
  (31, 'Nerul', 'Navi Mumbai', 19.0300, 73.0200, '400706'),
  (32, 'Belapur', 'Navi Mumbai', 19.0200, 73.0400, '400614'),
  (33, 'Airoli', 'Navi Mumbai', 19.1600, 72.9900, '400708'),
  (34, 'Ghansoli', 'Navi Mumbai', 19.1200, 73.0000, '400701'),
  (35, 'Koparkhairane', 'Navi Mumbai', 19.1000, 73.0100, '400709'),
  (36, 'Kharghar', 'Navi Mumbai', 19.0500, 73.0700, '410210'),
  (37, 'Panvel', 'Navi Mumbai', 18.9900, 73.1100, '410206'),
  (38, 'Seawoods', 'Navi Mumbai', 19.0200, 73.0200, '400706'),
  (39, 'Mira Road', 'Mira-Bhayandar', 19.2800, 72.8700, '401107'),
  (40, 'Bhayandar East', 'Mira-Bhayandar', 19.3000, 72.8500, '401105'),
  (41, 'Bhayandar West', 'Mira-Bhayandar', 19.2900, 72.8400, '401101'),
  (42, 'Kashimira', 'Mira-Bhayandar', 19.2700, 72.8700, '401107'),
  (43, 'Uttan', 'Mira-Bhayandar', 19.2800, 72.7900, '401106'),
  (44, 'Dahisar Check Naka', 'Mira-Bhayandar', 19.2600, 72.8600, '401107'),
  (45, 'Vasai East', 'Vasai-Virar', 19.3900, 72.8400, '401208'),
  (46, 'Vasai West', 'Vasai-Virar', 19.3700, 72.8000, '401201'),
  (47, 'Nalasopara East', 'Vasai-Virar', 19.4200, 72.8200, '401209'),
  (48, 'Nalasopara West', 'Vasai-Virar', 19.4200, 72.8000, '401203'),
  (49, 'Virar East', 'Vasai-Virar', 19.4600, 72.8100, '401305'),
  (50, 'Virar West', 'Vasai-Virar', 19.4600, 72.7900, '401303');

create temporary table demo_seed_accounts (
  role text not null,
  demo_number integer not null,
  demo_id text not null unique,
  user_id uuid not null unique,
  email text not null,
  primary key (role, demo_number)
) on commit drop;

insert into demo_seed_accounts (role, demo_number, demo_id, user_id, email)
select
  auth_user.raw_user_meta_data->>'role',
  substring(auth_user.raw_user_meta_data->>'demo_dataset_id' from '[0-9]+$')::integer,
  auth_user.raw_user_meta_data->>'demo_dataset_id',
  auth_user.id,
  auth_user.email
from auth.users auth_user
where auth_user.raw_user_meta_data->>'demo_synthetic' = 'true'
  and auth_user.raw_user_meta_data->>'demo_dataset_id' ~
    '^(hospital-(00[1-9]|0[1-4][0-9]|050)|ngo-(00[1-9]|0[1-6][0-9]|070)|donor-(0[0-9]{2}|1[0-9]{2}|200))$';

do $$
declare
  hospital_count integer;
  ngo_count integer;
  donor_count integer;
begin
  select count(*) into hospital_count
  from demo_seed_accounts where role = 'hospital';
  select count(*) into ngo_count
  from demo_seed_accounts where role = 'ngo';
  select count(*) into donor_count
  from demo_seed_accounts where role = 'donor';

  if hospital_count <> 50 or ngo_count <> 70 or donor_count <> 200 then
    raise exception
      'Expected exactly 50 hospital, 70 NGO, and 200 donor Auth fixtures; found %, %, %. Provision the accounts first.',
      hospital_count, ngo_count, donor_count;
  end if;

  if exists (
    select 1
    from demo_seed_accounts account
    left join public.profiles profile on profile.id = account.user_id
    where profile.id is null or profile.role <> account.role
  ) then
    raise exception 'Demo Auth fixtures are missing trigger-created role profiles.';
  end if;

  if (select count(*) from demo_seed_localities) <> 50 then
    raise exception 'Expected exactly 50 locality fixtures.';
  end if;
end;
$$;

create temporary table demo_seed_sites on commit drop as
select
  account.role,
  account.demo_number,
  account.demo_id,
  account.user_id,
  account.email,
  locality.locality,
  locality.city,
  locality.pin_code,
  locality.latitude
    + ((account.demo_number % 5) - 2) * 0.0007 as latitude,
  locality.longitude
    + ((account.demo_number % 7) - 3) * 0.0007 as longitude
from demo_seed_accounts account
join demo_seed_localities locality
  on locality.place_no = case account.role
    when 'hospital' then account.demo_number
    when 'ngo' then ((account.demo_number * 7 - 1) % 50) + 1
    else ((account.demo_number * 13 - 1) % 50) + 1
  end;

update public.profiles profile
set full_name = case site.role
      when 'hospital' then 'RakhtSetu Demo Hospital '
      when 'ngo' then 'RakhtSetu Demo NGO '
      else 'RakhtSetu Synthetic Donor '
    end || lpad(site.demo_number::text, 3, '0'),
    city = site.city,
    address = format(
      '%s locality, PIN %s (approximate synthetic demo location)',
      site.locality,
      site.pin_code
    ),
    phone = '0000000000',
    updated_at = now()
from demo_seed_sites site
where profile.id = site.user_id
  and profile.role = site.role;

update public.hospitals hospital
set hospital_name = format(
      'RakhtSetu Demo Hospital %s - %s',
      lpad(site.demo_number::text, 3, '0'),
      site.locality
    ),
    hospital_type = 'Synthetic demo fixture',
    registration_id = 'DEMO-MMR-HOSP-' || lpad(site.demo_number::text, 3, '0'),
    contact_person = 'Synthetic Demo Contact',
    phone = '0000000000',
    email = site.email,
    street_address = format(
      '%s locality, PIN %s (approximate synthetic demo address)',
      site.locality,
      site.pin_code
    ),
    city = site.city,
    map_location = format(
      '%s, %s (%s, %s)',
      site.locality,
      site.city,
      site.latitude,
      site.longitude
    ),
    latitude = site.latitude,
    longitude = site.longitude,
    location_address = site.locality || ', ' || site.city,
    available_blood_groups = '{}',
    verified = false,
    blood_bank = null,
    operating_hours = 'Synthetic demo fixture; not operational'
from demo_seed_sites site
where site.role = 'hospital'
  and hospital.id = site.user_id
  and hospital.user_id = site.user_id;

update public.ngos ngo
set organisation_name = format(
      'RakhtSetu Demo NGO %s - %s',
      lpad(site.demo_number::text, 3, '0'),
      site.locality
    ),
    registration_number = 'DEMO-MMR-NGO-' || lpad(site.demo_number::text, 3, '0'),
    organisation_type = case site.demo_number % 4
      when 0 then 'Synthetic community donor mobilization'
      when 1 then 'Synthetic emergency coordination'
      when 2 then 'Synthetic health outreach'
      else 'Synthetic blood-donation coordination'
    end,
    contact_person = 'Synthetic Demo Contact',
    email = site.email,
    phone = '0000000000',
    street_address = format(
      '%s locality, PIN %s (approximate synthetic demo address)',
      site.locality,
      site.pin_code
    ),
    city = site.city,
    map_location = format(
      '%s, %s (%s, %s)',
      site.locality,
      site.city,
      site.latitude,
      site.longitude
    ),
    latitude = site.latitude,
    longitude = site.longitude,
    areas_served = format(
      '%s; %s MMR (synthetic demo coverage)',
      site.locality,
      site.city
    ),
    verified = false
from demo_seed_sites site
where site.role = 'ngo'
  and ngo.id = site.user_id
  and ngo.user_id = site.user_id;

update public.donors donor
set full_name = 'RakhtSetu Synthetic Donor '
      || lpad(site.demo_number::text, 3, '0'),
    email = site.email,
    phone = '0000000000',
    blood_group = case
      when site.demo_number <= 50 then 'O+'
      when site.demo_number <= 70 then 'O-'
      when site.demo_number <= 105 then 'A+'
      when site.demo_number <= 120 then 'A-'
      when site.demo_number <= 155 then 'B+'
      when site.demo_number <= 170 then 'B-'
      when site.demo_number <= 190 then 'AB+'
      else 'AB-'
    end,
    category = 'Synthetic fixture; eligibility not assessed',
    gender = 'Unknown',
    age = null,
    aadhaar = null,
    map_location = format(
      '%s, %s (%s, %s)',
      site.locality,
      site.city,
      round(site.latitude::numeric, 2),
      round(site.longitude::numeric, 2)
    ),
    approximate_latitude = round(site.latitude::numeric, 2)::double precision,
    approximate_longitude = round(site.longitude::numeric, 2)::double precision,
    city = site.city,
    radius = 50,
    radius_km = 25,
    available = site.demo_number <= 110
      or site.demo_number between 131 and 165,
    consent = site.demo_number <= 140,
    verified = false
from demo_seed_sites site
where site.role = 'donor'
  and donor.id = site.user_id
  and donor.user_id = site.user_id;

insert into public.donor_medical_deferrals (
  donor_id, starts_at, ends_at, reason_code, active
)
select
  site.user_id,
  now() - interval '1 hour',
  now() + interval '30 days',
  'SYNTHETIC_DEMO_REVIEW',
  true
from demo_seed_sites site
where site.role = 'donor'
  and site.demo_number between 101 and 120
  and not exists (
    select 1
    from public.donor_medical_deferrals deferral
    where deferral.donor_id = site.user_id
      and deferral.reason_code = 'SYNTHETIC_DEMO_REVIEW'
  );

do $$
declare
  hospital_count integer;
  ngo_count integer;
  donor_count integer;
begin
  select count(*) into hospital_count
  from demo_seed_accounts account
  join public.hospitals hospital on hospital.id = account.user_id
  where account.role = 'hospital'
    and hospital.user_id = account.user_id;
  select count(*) into ngo_count
  from demo_seed_accounts account
  join public.ngos ngo on ngo.id = account.user_id
  where account.role = 'ngo'
    and ngo.user_id = account.user_id;
  select count(*) into donor_count
  from demo_seed_accounts account
  join public.donors donor on donor.id = account.user_id
  where account.role = 'donor'
    and donor.user_id = account.user_id;

  if hospital_count <> 50 or ngo_count <> 70 or donor_count <> 200 then
    raise exception
      'Role records are incomplete (hospital %, NGO %, donor %); verify the Auth creation trigger and rerun.',
      hospital_count, ngo_count, donor_count;
  end if;
end;
$$;

-- Verification: counts are for marked demo identities, not whole-table totals.
select account.role, count(*) as demo_count
from demo_seed_accounts account
group by account.role
order by account.role;

select
  count(*) filter (
    where account.demo_number <= 20 and hospital.city = 'Mumbai'
  ) as designated_mumbai_hospitals,
  count(distinct hospital.city) as hospital_cities,
  count(distinct hospital.location_address) as hospital_localities,
  count(*) filter (where hospital.verified) as marked_verified
from demo_seed_accounts account
join public.hospitals hospital on hospital.id = account.user_id
where account.role = 'hospital';

select
  count(*) as total_demo_hospitals,
  count(*) filter (where hospital.latitude is not null
    and hospital.longitude is not null) as located_for_network_discovery,
  count(*) filter (where account.demo_number <= 20) as designated_mumbai_group
from demo_seed_accounts account
join public.hospitals hospital on hospital.id = account.user_id
where account.role = 'hospital';

select donor.blood_group, count(*) as demo_donors
from demo_seed_accounts account
join public.donors donor on donor.id = account.user_id
where account.role = 'donor'
group by donor.blood_group
order by donor.blood_group;

select
  count(*) filter (where donor.available and donor.consent) as available_with_consent,
  count(*) filter (where not donor.available) as unavailable,
  count(*) filter (where not donor.consent) as opted_out,
  count(*) filter (where donor.verified) as marked_verified,
  count(*) filter (where deferral.id is not null) as with_demo_review_deferral
from demo_seed_accounts account
join public.donors donor on donor.id = account.user_id
left join public.donor_medical_deferrals deferral
  on deferral.donor_id = donor.id
  and deferral.reason_code = 'SYNTHETIC_DEMO_REVIEW'
  and deferral.active
  and deferral.starts_at <= now()
  and (deferral.ends_at is null or deferral.ends_at > now())
where account.role = 'donor';

select account.role, account.demo_id, count(*) as duplicate_count
from demo_seed_accounts account
group by account.role, account.demo_id
having count(*) > 1;

select count(*) as broken_profile_links
from demo_seed_accounts account
left join public.profiles profile on profile.id = account.user_id
left join auth.users auth_user on auth_user.id = account.user_id
left join public.hospitals hospital
  on account.role = 'hospital' and hospital.id = account.user_id
left join public.ngos ngo
  on account.role = 'ngo' and ngo.id = account.user_id
left join public.donors donor
  on account.role = 'donor' and donor.id = account.user_id
where auth_user.id is null
   or profile.id is null
   or (account.role = 'hospital' and hospital.id is null)
   or (account.role = 'ngo' and ngo.id is null)
   or (account.role = 'donor' and donor.id is null);

select count(*) as demo_donation_records
from demo_seed_accounts account
join public.donation_records donation
  on account.role = 'donor'
  and donation.donor_id = account.user_id;

commit;
