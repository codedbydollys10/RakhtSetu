-- Synthetic, isolated request-distribution fixture: 12 hospitals and 20 donors.
-- Provision Auth users with scripts/provision-hospital-donor-test-users.mjs
-- first, then run this only in the explicitly allowlisted test project.
-- Auth metadata supplies the stable fixture marker; all FK values below are
-- read from Auth and its existing profile trigger. No Auth users are created.
-- No blood requests, notification rows, donation history, or recovery dates
-- are created here. One active manual deferral is a labeled test-only gate,
-- not a medical record or an approved recovery interval.

begin;

create temporary table hospital_donor_test_accounts (
  role text not null,
  fixture_number integer not null,
  fixture_id text not null unique,
  user_id uuid not null unique,
  email text not null,
  primary key (role, fixture_number)
) on commit drop;

insert into hospital_donor_test_accounts (
  role, fixture_number, fixture_id, user_id, email
)
select
  account.raw_user_meta_data ->> 'role',
  right(account.raw_user_meta_data ->> 'network_test_id', 2)::integer,
  account.raw_user_meta_data ->> 'network_test_id',
  account.id,
  account.email
from auth.users account
where account.raw_user_meta_data ->> 'network_test_fixture' = 'true'
  and account.raw_user_meta_data ->> 'network_test_id' ~
    '^(hospital-(0[1-9]|1[0-2])|donor-(0[1-9]|1[0-9]|20))$'
  and account.email like '%@example.invalid';

do $$
declare
  hospital_count integer;
  donor_count integer;
begin
  select count(*) into hospital_count
  from hospital_donor_test_accounts where role = 'hospital';
  select count(*) into donor_count
  from hospital_donor_test_accounts where role = 'donor';

  if hospital_count <> 12 or donor_count <> 20 then
    raise exception
      'Expected exactly 12 marked test hospitals and 20 marked test donors; found % and %. Provision the test accounts first.',
      hospital_count, donor_count;
  end if;

  if exists (
    select 1
    from hospital_donor_test_accounts account
    left join public.profiles profile on profile.id = account.user_id
    where profile.id is null
      or profile.role <> account.role
      or account.email not like '%@example.invalid'
  ) then
    raise exception
      'A test Auth account is missing its matching trigger-created profile or synthetic email.';
  end if;

  if exists (
    select 1
    from hospital_donor_test_accounts account
    left join public.hospitals hospital
      on account.role = 'hospital'
      and hospital.id = account.user_id
      and hospital.user_id = account.user_id
    left join public.donors donor
      on account.role = 'donor'
      and donor.id = account.user_id
      and donor.user_id = account.user_id
    where (account.role = 'hospital' and hospital.id is null)
       or (account.role = 'donor' and donor.id is null)
  ) then
    raise exception
      'A test identity does not have its linked role record. Apply the profile migrations and Auth trigger first.';
  end if;

  if exists (
    select 1
    from public.hospitals hospital
    where not exists (
      select 1
      from hospital_donor_test_accounts account
      where account.role = 'hospital'
        and account.user_id = hospital.user_id
    )
  ) or exists (
    select 1
    from public.donors donor
    where not exists (
      select 1
      from hospital_donor_test_accounts account
      where account.role = 'donor'
        and account.user_id = donor.user_id
    )
  ) or exists (select 1 from public.ngos)
     or exists (select 1 from public.blood_requests) then
    raise exception
      'Refusing to seed: use a dedicated test project with no unrelated hospitals, donors, NGOs, or blood requests.';
  end if;
end;
$$;

create temporary table hospital_donor_test_hospitals (
  fixture_number integer primary key,
  locality text not null,
  city text not null,
  latitude double precision,
  longitude double precision
) on commit drop;

insert into hospital_donor_test_hospitals values
  (1, 'Andheri East', 'Mumbai', 19.1197, 72.8464),
  (2, 'Andheri West', 'Mumbai', 19.1363, 72.8277),
  (3, 'Bandra', 'Mumbai', 19.0600, 72.8295),
  (4, 'Borivali', 'Mumbai', 19.2300, 72.8560),
  (5, 'Dadar', 'Mumbai', 19.0178, 72.8478),
  (6, 'Kurla', 'Mumbai', 19.0726, 72.8845),
  (7, 'Ghatkopar', 'Mumbai', 19.0860, 72.9081),
  (8, 'Powai', 'Mumbai', 19.1176, 72.9060),
  (9, 'Mulund', 'Mumbai', 19.1726, 72.9561),
  (10, 'Thane', 'Thane', 19.2183, 72.9781),
  (11, 'Vashi', 'Navi Mumbai', 19.0771, 72.9980),
  (12, 'Nerul', 'Navi Mumbai', null, null);

create temporary table hospital_donor_test_donors (
  fixture_number integer primary key,
  blood_group text not null,
  locality text,
  city text,
  latitude double precision,
  longitude double precision,
  available boolean not null,
  consent boolean not null,
  scenario text not null
) on commit drop;

insert into hospital_donor_test_donors values
  (1, 'O+', 'Andheri East', 'Mumbai', 19.1205, 72.8505, true, true, 'nearby eligible'),
  (2, 'O+', 'Andheri East', 'Mumbai', 19.1197, 72.8464, true, true, 'inside 5 km boundary'),
  (3, 'O+', 'Andheri East', 'Mumbai', 19.1197, 72.8464, true, true, 'outside 5 km but inside 10 km'),
  (4, 'O+', null, 'Mumbai', null, null, true, true, 'city fallback without coordinates'),
  (5, 'O-', 'Andheri East', 'Mumbai', 19.1210, 72.8500, true, true, 'nearby exact-group eligible'),
  (6, 'O-', 'Andheri East', 'Mumbai', 19.1210, 72.8500, false, true, 'unavailable'),
  (7, 'O-', 'Andheri East', 'Mumbai', 19.1210, 72.8500, true, false, 'request consent not granted'),
  (8, 'A+', 'Andheri East', 'Mumbai', 19.1200, 72.8500, true, true, 'nearby exact-group eligible'),
  (9, 'A+', 'Andheri East', 'Mumbai', 19.1200, 72.8500, true, true, 'synthetic active deferral'),
  (10, 'A+', null, null, null, null, true, true, 'incomplete profile location'),
  (11, 'A-', 'Mulund', 'Mumbai', 19.1726, 72.9561, true, true, 'outside 10 km radius'),
  (12, 'A-', 'Andheri East', 'Mumbai', 19.1210, 72.8500, true, true, 'nearby exact-group eligible'),
  (13, 'B+', 'Bandra', 'Mumbai', 19.0600, 72.8295, true, true, 'nearby exact-group eligible'),
  (14, 'B+', 'Vashi', 'Navi Mumbai', 19.0771, 72.9980, true, true, 'outside 10 km radius'),
  (15, 'B+', 'Andheri West', 'Mumbai', 19.1363, 72.8277, true, true, 'unverified but otherwise eligible'),
  (16, 'B-', null, 'Thane', null, null, true, true, 'missing coordinates and nonmatching city'),
  (17, 'B-', 'Andheri East', 'Mumbai', 19.1210, 72.8500, false, true, 'unavailable'),
  (18, 'AB+', 'Andheri East', 'Mumbai', 19.1210, 72.8500, true, false, 'request consent not granted'),
  (19, 'AB+', 'Andheri East', 'Mumbai', 19.1210, 72.8500, true, true, 'unverified but otherwise eligible'),
  (20, 'AB-', 'Thane', 'Thane', 19.2183, 72.9781, true, true, 'outside 10 km radius');

-- Two coordinates straddle the actual SQL distance predicate's 5 km edge.
update hospital_donor_test_donors donor
set longitude = hospital.longitude + degrees(
  2 * asin(sin((target_km / 6371.0) / 2) / cos(radians(hospital.latitude)))
)
from hospital_donor_test_hospitals hospital,
     (values (2, 4.99::double precision), (3, 5.01::double precision))
       as boundary(fixture_number, target_km)
where hospital.fixture_number = 1
  and donor.fixture_number = boundary.fixture_number
  and donor.latitude = hospital.latitude;

update public.profiles profile
set full_name = format('Synthetic %s test %s',
      account.role, lpad(account.fixture_number::text, 2, '0')),
    email = account.email,
    phone = null,
    city = case
      when account.role = 'hospital' then hospital_fixture.city
      else donor_fixture.city
    end,
    address = case
      when account.role = 'hospital'
        then hospital_fixture.locality || ', ' || hospital_fixture.city
          || ' (synthetic locality fixture)'
      else null
    end,
    updated_at = now()
from hospital_donor_test_accounts account
left join hospital_donor_test_donors donor_fixture
  on account.role = 'donor'
  and donor_fixture.fixture_number = account.fixture_number
left join hospital_donor_test_hospitals hospital_fixture
  on account.role = 'hospital'
  and hospital_fixture.fixture_number = account.fixture_number
where profile.id = account.user_id
  and profile.role = account.role;

update public.hospitals hospital
set hospital_name = format('RakhtSetu Synthetic Hospital %s - %s',
      lpad(account.fixture_number::text, 2, '0'), fixture.locality),
    hospital_type = 'Synthetic test fixture',
    registration_id = 'SYNTHETIC-TEST-HOSPITAL-' || lpad(account.fixture_number::text, 2, '0'),
    contact_person = 'Synthetic Test Contact',
    phone = null,
    email = account.email,
    street_address = fixture.locality || ', ' || fixture.city
      || ' (approximate synthetic locality)',
    city = fixture.city,
    map_location = case when fixture.latitude is null then null else
      format('%s, %s (%s, %s)', fixture.locality, fixture.city,
        fixture.latitude, fixture.longitude) end,
    latitude = fixture.latitude,
    longitude = fixture.longitude,
    location_address = case when fixture.latitude is null then null else
      fixture.locality || ', ' || fixture.city end,
    available_blood_groups = '{}',
    verified = false,
    blood_bank = null,
    operating_hours = 'Synthetic fixture - not operational'
from hospital_donor_test_accounts account
join hospital_donor_test_hospitals fixture
  on fixture.fixture_number = account.fixture_number
where account.role = 'hospital'
  and hospital.id = account.user_id
  and hospital.user_id = account.user_id;

update public.donors donor
set full_name = format('Synthetic donor test %s',
      lpad(account.fixture_number::text, 2, '0')),
    email = account.email,
    phone = null,
    blood_group = fixture.blood_group,
    age = null,
    category = 'Synthetic test fixture; eligibility is not medical clearance',
    gender = null,
    aadhaar = null,
    map_location = case when fixture.latitude is null then null else
      format('%s, %s (%s, %s)', fixture.locality, fixture.city,
        fixture.latitude, fixture.longitude) end,
    approximate_latitude = fixture.latitude,
    approximate_longitude = fixture.longitude,
    verified = false,
    city = fixture.city,
    area = fixture.locality,
    emergency_contact = null,
    radius = 25,
    radius_km = 25,
    consent = fixture.consent,
    available = fixture.available,
    last_donation_date = null,
    donations_count = 0
from hospital_donor_test_accounts account
join hospital_donor_test_donors fixture
  on fixture.fixture_number = account.fixture_number
where account.role = 'donor'
  and donor.id = account.user_id
  and donor.user_id = account.user_id;

insert into public.donor_medical_deferrals (
  donor_id, starts_at, ends_at, reason_code, active
)
select account.user_id, now() - interval '1 minute', null,
  'SYNTHETIC_NETWORK_TEST', true
from hospital_donor_test_accounts account
where account.role = 'donor'
  and account.fixture_number = 9
  and not exists (
    select 1
    from public.donor_medical_deferrals deferral
    where deferral.donor_id = account.user_id
      and deferral.reason_code = 'SYNTHETIC_NETWORK_TEST'
  );

do $$
declare
  hospital_count integer;
  donor_count integer;
  counts_by_group text;
begin
  select count(*) into hospital_count
  from hospital_donor_test_accounts account
  join public.hospitals hospital
    on hospital.id = account.user_id
   and hospital.user_id = account.user_id
  where account.role = 'hospital';

  select count(*) into donor_count
  from hospital_donor_test_accounts account
  join public.donors donor
    on donor.id = account.user_id
   and donor.user_id = account.user_id
  where account.role = 'donor';

  if hospital_count <> 12 or donor_count <> 20 then
    raise exception 'Fixture role-record count mismatch: hospitals %, donors %.',
      hospital_count, donor_count;
  end if;

  select string_agg(format('%s=%s', blood_group, group_count), ', ' order by blood_group)
  into counts_by_group
  from (
    select donor.blood_group, count(*) as group_count
    from hospital_donor_test_accounts account
    join public.donors donor on donor.user_id = account.user_id
    where account.role = 'donor'
    group by donor.blood_group
  ) grouped;

  raise notice 'Synthetic fixture verified: 12 hospitals; 20 donors; groups %.',
    counts_by_group;
end;
$$;

-- The owner-scoped transaction makes reseeding repeatable and safe to inspect.
-- Keep the synthetic deferral when re-running; do not create real recovery data.
commit;

select account.role, count(*) as fixture_count
from auth.users auth_user
join public.profiles profile on profile.id = auth_user.id
join lateral (
  select auth_user.raw_user_meta_data ->> 'role' as role
) account on true
where auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true'
  and auth_user.raw_user_meta_data ->> 'network_test_id' ~
    '^(hospital-(0[1-9]|1[0-2])|donor-(0[1-9]|1[0-9]|20))$'
group by account.role
order by account.role;

select
  (select count(*) from public.hospitals) as all_hospitals,
  (select count(*)
   from public.hospitals hospital
   join auth.users auth_user on auth_user.id = hospital.user_id
   where auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true')
    as test_hospitals,
  (select count(*) from public.donors) as all_donors,
  (select count(*)
   from public.donors donor
   join auth.users auth_user on auth_user.id = donor.user_id
   where auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true')
    as test_donors;

select donor.blood_group, count(*) as test_donors
from public.donors donor
join auth.users auth_user on auth_user.id = donor.user_id
where auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true'
  and auth_user.raw_user_meta_data ->> 'network_test_id' ~ '^donor-(0[1-9]|1[0-9]|20)$'
group by donor.blood_group
order by donor.blood_group;

select
  auth_user.raw_user_meta_data ->> 'network_test_id' as fixture_id,
  hospital.hospital_name,
  hospital.city,
  hospital.latitude,
  hospital.longitude,
  hospital.verified
from public.hospitals hospital
join auth.users auth_user on auth_user.id = hospital.user_id
where auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true'
  and auth_user.raw_user_meta_data ->> 'network_test_id' ~ '^hospital-(0[1-9]|1[0-2])$'
order by fixture_id;

select
  auth_user.raw_user_meta_data ->> 'network_test_id' as fixture_id,
  donor.blood_group,
  donor.city,
  donor.area,
  donor.approximate_latitude,
  donor.approximate_longitude,
  donor.available,
  donor.consent,
  donor.verified,
  exists (
    select 1
    from public.donor_medical_deferrals deferral
    where deferral.donor_id = donor.id
      and deferral.reason_code = 'SYNTHETIC_NETWORK_TEST'
      and deferral.active
      and deferral.starts_at <= now()
      and (deferral.ends_at is null or deferral.ends_at > now())
  ) as synthetic_test_deferral
from public.donors donor
join auth.users auth_user on auth_user.id = donor.user_id
where auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true'
  and auth_user.raw_user_meta_data ->> 'network_test_id' ~ '^donor-(0[1-9]|1[0-9]|20)$'
order by fixture_id;
