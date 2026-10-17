-- Run only after all project migrations and the 12/20 test seed have been
-- applied to a dedicated test project. Every request/notification/response
-- made by this test is rolled back at the end.
begin;

create temporary table hospital_donor_test_accounts (
  role text not null,
  fixture_id text not null,
  user_id uuid not null,
  primary key (role, fixture_id)
) on commit drop;

insert into hospital_donor_test_accounts
select
  auth_user.raw_user_meta_data ->> 'role',
  auth_user.raw_user_meta_data ->> 'network_test_id',
  auth_user.id
from auth.users auth_user
where auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true'
  and auth_user.raw_user_meta_data ->> 'network_test_id' ~
    '^(hospital-(0[1-9]|1[0-2])|donor-(0[1-9]|1[0-9]|20))$';

do $$
begin
  if (select count(*) from hospital_donor_test_accounts where role = 'hospital') <> 12
     or (select count(*) from hospital_donor_test_accounts where role = 'donor') <> 20 then
    raise exception 'Integration tests require exactly 12 hospital and 20 donor fixtures.';
  end if;
end;
$$;

create temporary table hospital_donor_test_coordinates (
  fixture_id text primary key,
  user_id uuid not null,
  latitude double precision,
  longitude double precision
) on commit drop;

insert into hospital_donor_test_coordinates
select account.fixture_id, hospital.user_id, hospital.latitude, hospital.longitude
from hospital_donor_test_accounts account
join public.hospitals hospital on hospital.user_id = account.user_id
where account.role = 'hospital';

create temporary table hospital_donor_test_requests (
  scenario text primary key,
  request_id uuid not null,
  expected_donors text[] not null
) on commit drop;

grant select on hospital_donor_test_accounts,
  hospital_donor_test_coordinates, hospital_donor_test_requests to authenticated;

do $$
declare
  hospital_user uuid;
  donor_user uuid;
  fixture_number integer;
  request_group text;
  request_radius integer;
  request_component text;
  request_scenario text;
  expected_donors text[];
  actual_donors text[];
  actual_notifications text[];
  request_key uuid;
  response_result text;
  response_count integer;
  feed_count integer;
  feed_request uuid;
begin
  select user_id into hospital_user
  from hospital_donor_test_accounts
  where role = 'hospital' and fixture_id = 'hospital-01';

  perform set_config('request.jwt.claim.sub', hospital_user::text, true);

  for fixture_number in 1..8 loop
    request_group := (array['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'])[fixture_number];
    request_scenario := 'group-' || request_group;
    expected_donors := case request_group
      when 'O+' then array['donor-01', 'donor-02', 'donor-03', 'donor-04']
      when 'O-' then array['donor-05']
      when 'A+' then array['donor-08']
      when 'A-' then array['donor-12']
      when 'B+' then array['donor-13', 'donor-15']
      when 'B-' then array[]::text[]
      when 'AB+' then array['donor-19']
      else array[]::text[]
    end;

    insert into public.blood_requests (
      hospital_id, blood_group, component, search_radius_km, units,
      urgency, status, area, latitude, longitude, location_address
    )
    select hospital_user, request_group, 'WHOLE_BLOOD', 10, 1,
      'URGENT', 'Matching', 'Andheri East', latitude, longitude,
      'Synthetic test location'
    from hospital_donor_test_coordinates
    where fixture_id = 'hospital-01'
    returning id into request_key;

    insert into hospital_donor_test_requests
      (scenario, request_id, expected_donors)
    values (request_scenario, request_key, expected_donors);

    select coalesce(array_agg(auth_user.raw_user_meta_data ->> 'network_test_id'
                              order by auth_user.raw_user_meta_data ->> 'network_test_id'),
                    array[]::text[])
      into actual_donors
    from public.donors donor
    join auth.users auth_user on auth_user.id = donor.user_id
    where auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true'
      and public.is_eligible_blood_request(request_key, donor.id);

    if actual_donors is distinct from expected_donors then
      raise exception '% recipients mismatch: expected %, actual %.',
        request_scenario, expected_donors, actual_donors;
    end if;

    select coalesce(array_agg(auth_user.raw_user_meta_data ->> 'network_test_id'
                              order by auth_user.raw_user_meta_data ->> 'network_test_id'),
                    array[]::text[])
      into actual_notifications
    from public.notifications notification
    join auth.users auth_user on auth_user.id = notification.user_id
    where notification.request_id = request_key
      and notification.type = 'request'
      and auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true'
      and auth_user.raw_user_meta_data ->> 'role' = 'donor';

    if actual_notifications is distinct from expected_donors then
      raise exception '% notification recipients mismatch: expected %, actual %.',
        request_scenario, expected_donors, actual_notifications;
    end if;
  end loop;

  request_group := 'O+';
  for fixture_number in 1..2 loop
    request_radius := case fixture_number when 1 then 5 else 10 end;
    request_scenario := 'O+-radius-' || request_radius;
    expected_donors := case request_radius
      when 5 then array['donor-01', 'donor-02', 'donor-04']
      else array['donor-01', 'donor-02', 'donor-03', 'donor-04']
    end;

    insert into public.blood_requests (
      hospital_id, blood_group, component, search_radius_km, units,
      urgency, status, area, latitude, longitude, location_address
    )
    select hospital_user, request_group, 'WHOLE_BLOOD', request_radius, 1,
      'URGENT', 'Matching', 'Andheri East', latitude, longitude,
      'Synthetic test location'
    from hospital_donor_test_coordinates
    where fixture_id = 'hospital-01'
    returning id into request_key;

    insert into hospital_donor_test_requests
      (scenario, request_id, expected_donors)
    values (request_scenario, request_key, expected_donors);

    select coalesce(array_agg(auth_user.raw_user_meta_data ->> 'network_test_id'
                              order by auth_user.raw_user_meta_data ->> 'network_test_id'),
                    array[]::text[])
      into actual_donors
    from public.donors donor
    join auth.users auth_user on auth_user.id = donor.user_id
    where auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true'
      and public.is_eligible_blood_request(request_key, donor.id);

    if actual_donors is distinct from expected_donors then
      raise exception '% recipients mismatch: expected %, actual %.',
        request_scenario, expected_donors, actual_donors;
    end if;

    select coalesce(array_agg(auth_user.raw_user_meta_data ->> 'network_test_id'
                              order by auth_user.raw_user_meta_data ->> 'network_test_id'),
                    array[]::text[])
      into actual_notifications
    from public.notifications notification
    join auth.users auth_user on auth_user.id = notification.user_id
    where notification.request_id = request_key
      and notification.type = 'request'
      and auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true'
      and auth_user.raw_user_meta_data ->> 'role' = 'donor';

    if actual_notifications is distinct from expected_donors then
      raise exception '% radius notification recipients mismatch: expected %, actual %.',
        request_scenario, expected_donors, actual_notifications;
    end if;
  end loop;

  select request_id into feed_request
  from hospital_donor_test_requests where scenario = 'group-O+';
  select user_id into donor_user
  from hospital_donor_test_accounts
  where role = 'donor' and fixture_id = 'donor-01';
  perform set_config('request.jwt.claim.sub', donor_user::text, true);
  select count(*) into feed_count
  from public.get_eligible_blood_requests()
  where id = feed_request;
  if feed_count <> 1 then
    raise exception 'An eligible O+ donor did not receive the request in their donor feed.';
  end if;

  select user_id into donor_user
  from hospital_donor_test_accounts
  where role = 'donor' and fixture_id = 'donor-05';
  perform set_config('request.jwt.claim.sub', donor_user::text, true);
  select count(*) into feed_count
  from public.get_eligible_blood_requests()
  where id = feed_request;
  if feed_count <> 0 then
    raise exception 'A nonmatching O- donor received an O+ request in their donor feed.';
  end if;

  select request_id into feed_request
  from hospital_donor_test_requests where scenario = 'group-B+';
  select user_id into donor_user
  from hospital_donor_test_accounts
  where role = 'donor' and fixture_id = 'donor-15';
  perform set_config('request.jwt.claim.sub', donor_user::text, true);
  select count(*) into feed_count
  from public.get_eligible_blood_requests()
  where id = feed_request;
  if feed_count <> 1 then
    raise exception 'An otherwise eligible unverified B+ donor did not receive the request in their donor feed.';
  end if;

  request_scenario := 'unsupported-platelets';
  insert into public.blood_requests (
    hospital_id, blood_group, component, search_radius_km, units,
    urgency, status, area, latitude, longitude, location_address
  )
  select hospital_user, 'O+', 'PLATELETS', 10, 1, 'URGENT', 'Matching',
    'Andheri East', latitude, longitude, 'Synthetic test location'
  from hospital_donor_test_coordinates
  where fixture_id = 'hospital-01'
  returning id into request_key;
  insert into hospital_donor_test_requests
    (scenario, request_id, expected_donors)
  values (request_scenario, request_key, array[]::text[]);

  if exists (
    select 1 from public.donors donor
    where public.is_eligible_blood_request(request_key, donor.id)
  ) then
    raise exception 'The current whole-blood eligibility workflow accepted a platelet request.';
  end if;

  -- A synthetic manual deferral must block both distribution and acceptance.
  select request_id into request_key
  from hospital_donor_test_requests where scenario = 'group-A+';
  select user_id into donor_user
  from hospital_donor_test_accounts
  where role = 'donor' and fixture_id = 'donor-09';
  if public.is_eligible_blood_request(
    request_key,
    (select id from public.donors where user_id = donor_user)
  ) then
    raise exception 'The active synthetic deferral did not block new matching.';
  end if;

  update public.donors set phone = '+919000000009' where user_id = donor_user;
  update public.profiles set phone = '+919000000009' where id = donor_user;
  perform set_config('request.jwt.claim.sub', donor_user::text, true);
  begin
    perform public.respond_to_blood_request(request_key);
    raise exception 'Expected the deferred donor response to be rejected.';
  exception
    when others then
      if sqlerrm <> 'This request is not available to your donor profile.' then
        raise;
      end if;
  end;

  -- An eligible donor can respond; repeat submission is idempotent.
  select request_id into request_key
  from hospital_donor_test_requests where scenario = 'group-O+';
  select user_id into donor_user
  from hospital_donor_test_accounts
  where role = 'donor' and fixture_id = 'donor-01';
  perform set_config('request.jwt.claim.sub', donor_user::text, true);
  begin
    perform public.respond_to_blood_request(request_key);
    raise exception 'Expected a donor without a phone number to be rejected.';
  exception
    when others then
      if sqlerrm <> 'Add a valid phone number to your donor profile before responding.' then
        raise;
      end if;
  end;

  update public.donors set phone = '+919000000001' where user_id = donor_user;
  update public.profiles set phone = '+919000000001' where id = donor_user;
  response_result := public.respond_to_blood_request(request_key);
  if response_result <> 'Response Sent' then
    raise exception 'Expected a successful donor response, got %.', response_result;
  end if;
  response_result := public.respond_to_blood_request(request_key);
  if response_result <> 'Response Sent' then
    raise exception 'Repeated response was not idempotent.';
  end if;
  select count(*) into response_count
  from public.donor_responses
  where request_id = request_key
    and donor_id = (select id from public.donors where user_id = donor_user);
  if response_count <> 1 then
    raise exception 'Expected one donor response row, found %.', response_count;
  end if;

  if exists (
    select 1 from public.donation_records
    where request_id = request_key
      and donor_id = (select id from public.donors where user_id = donor_user)
  ) then
    raise exception 'A donor response alone must not create donation history.';
  end if;

  perform set_config('request.jwt.claim.sub', hospital_user::text, true);
  response_result := public.confirm_hospital_donor_response(
    request_key,
    (select id from public.donors where user_id = donor_user)
  );
  if response_result <> 'Hospital Confirmed' then
    raise exception 'Expected hospital acknowledgement, got %.', response_result;
  end if;

  select count(*) into response_count
  from public.get_hospital_donor_responses(request_key) response
  where response.donor_name = 'Synthetic donor test 01'
    and response.donor_phone = '+919000000001'
    and response.donor_blood_group = 'O+'
    and response.donor_city = 'Mumbai'
    and response.donor_area = 'Andheri East'
    and response.response_status = 'Hospital Confirmed'
    and not response.donation_recorded;
  if response_count <> 1 then
    raise exception 'The hospital could not read the responding donor contact details.';
  end if;

  perform public.acknowledge_blood_donation(
    request_key,
    (select id from public.donors where user_id = donor_user),
    'WHOLE_BLOOD',
    now(),
    null
  );
  if not exists (
    select 1 from public.donation_records
    where request_id = request_key
      and donor_id = (select id from public.donors where user_id = donor_user)
  ) then
    raise exception 'Hospital donation acknowledgement did not create the donation record.';
  end if;
  if (select donations_count from public.donors
      where user_id = donor_user) <> 1 then
    raise exception 'Hospital donation acknowledgement did not update donor history.';
  end if;

  perform set_config('request.jwt.claim.sub', donor_user::text, true);
  -- Refreshing donor eligibility cannot duplicate the request notification.
  update public.donors
  set available = available
  where user_id = donor_user;
  select count(*) into response_count
  from public.notifications
  where user_id = donor_user
    and request_id = request_key
    and type = 'request';
  if response_count <> 1 then
    raise exception 'Repeated distribution produced % request notifications.', response_count;
  end if;

  -- A hospital can close its own request; a donor cannot accept the closed one.
  select request_id into request_key
  from hospital_donor_test_requests where scenario = 'group-AB-';
  perform set_config('request.jwt.claim.sub', hospital_user::text, true);
  update public.blood_requests
  set status = 'Cancelled'
  where id = request_key;
  if not found then
    raise exception 'The owning hospital could not cancel its active request.';
  end if;

  select user_id into donor_user
  from hospital_donor_test_accounts
  where role = 'donor' and fixture_id = 'donor-20';
  update public.donors set phone = '+919000000020' where user_id = donor_user;
  update public.profiles set phone = '+919000000020' where id = donor_user;
  perform set_config('request.jwt.claim.sub', donor_user::text, true);
  begin
    perform public.respond_to_blood_request(request_key);
    raise exception 'Expected a cancelled request response to be rejected.';
  exception
    when others then
      if sqlerrm <> 'This request is no longer accepting responses.' then
        raise;
      end if;
  end;
end;
$$;

set local role authenticated;

do $$
declare
  other_hospital uuid;
  owner_hospital uuid;
  owner_request uuid;
  target_donor uuid;
  other_donor uuid;
  visible_count integer;
  changed_count integer;
begin
  select user_id into owner_hospital
  from hospital_donor_test_accounts
  where role = 'hospital' and fixture_id = 'hospital-01';
  select user_id into other_hospital
  from hospital_donor_test_accounts
  where role = 'hospital' and fixture_id = 'hospital-02';
  select request_id into owner_request
  from hospital_donor_test_requests where scenario = 'group-O+';

  perform set_config('request.jwt.claim.sub', other_hospital::text, true);
  select count(*) into visible_count
  from public.blood_requests where id = owner_request;
  if visible_count <> 0 then
    raise exception 'Another hospital can read a private request.';
  end if;

  begin
    perform * from public.get_hospital_donor_responses(owner_request);
    raise exception 'Expected the other hospital contact lookup to be rejected.';
  exception
    when others then
      if sqlerrm <> 'This request does not belong to your hospital.' then
        raise;
      end if;
  end;

  update public.blood_requests
  set notes = 'unauthorized test mutation'
  where id = owner_request;
  get diagnostics changed_count = row_count;
  if changed_count <> 0 then
    raise exception 'Another hospital modified a private request.';
  end if;

  select user_id into target_donor
  from hospital_donor_test_accounts
  where role = 'donor' and fixture_id = 'donor-01';
  select user_id into other_donor
  from hospital_donor_test_accounts
  where role = 'donor' and fixture_id = 'donor-05';
  perform set_config('request.jwt.claim.sub', target_donor::text, true);

  select count(*) into visible_count
  from public.donors where user_id = other_donor;
  if visible_count <> 0 then
    raise exception 'A donor can read another donor role record.';
  end if;

  select count(*) into visible_count
  from public.profiles where id = other_donor;
  if visible_count <> 0 then
    raise exception 'A donor can read another donor account profile.';
  end if;

  select count(*) into visible_count
  from public.notifications
  where user_id = other_donor
    and request_id = owner_request
    and type = 'request';
  if visible_count <> 0 then
    raise exception 'A donor can read another donor notification.';
  end if;

  perform set_config('request.jwt.claim.sub', owner_hospital::text, true);
  select count(*) into visible_count
  from public.blood_requests where id = owner_request;
  if visible_count <> 1 then
    raise exception 'The owning hospital cannot read its own request.';
  end if;
end;
$$;

do $$
declare
  center record;
  expected_ids uuid[];
  marker_ids uuid[];
  directory_ids uuid[];
  map_ids uuid[];
  private_fields integer;
begin
  for center in
    select fixture_id, user_id, latitude, longitude
    from hospital_donor_test_coordinates
    where latitude is not null and longitude is not null
    order by fixture_id
  loop
    perform set_config('request.jwt.claim.sub', center.user_id::text, true);

    select coalesce(array_agg(result.hospital_id order by result.hospital_id),
                    array[]::uuid[]),
           coalesce(array_agg(distinct result.hospital_id order by result.hospital_id),
                    array[]::uuid[]),
           count(*) filter (where result.phone is not null or result.email is not null)
      into directory_ids, marker_ids, private_fields
    from public.hospital_network_directory(5, null, 50, 0) result;

    select coalesce(array_agg(candidate.user_id order by candidate.user_id),
                    array[]::uuid[])
      into expected_ids
    from hospital_donor_test_coordinates candidate
    where candidate.fixture_id <> center.fixture_id
      and candidate.latitude between -90 and 90
      and candidate.longitude between -180 and 180
      and 6371 * 2 * asin(sqrt(least(1::double precision, greatest(
        0::double precision,
        power(sin(radians(candidate.latitude - center.latitude) / 2), 2)
        + cos(radians(center.latitude)) * cos(radians(candidate.latitude))
        * power(sin(radians(candidate.longitude - center.longitude) / 2), 2)
      )))) <= 5;

    if directory_ids is distinct from expected_ids then
      raise exception 'Directory radius mismatch for %: expected %, actual %.',
        center.fixture_id, expected_ids, directory_ids;
    end if;
    if marker_ids is distinct from directory_ids then
      raise exception 'Directory returned duplicate hospital markers for %.',
        center.fixture_id;
    end if;
    if private_fields <> 0 then
      raise exception 'Hospital network directory exposed contact details.';
    end if;

    select coalesce(array_agg(result.resource_id order by result.resource_id),
                    array[]::uuid[])
      into map_ids
    from public.hospital_nearby_network(
      center.latitude, center.longitude, 5, null
    ) result
    where result.resource_type = 'hospital';

    if map_ids is distinct from expected_ids then
      raise exception 'Map radius mismatch for %: expected %, actual %.',
        center.fixture_id, expected_ids, map_ids;
    end if;

    if exists (
      select 1
      from public.hospital_network_directory(5, null, 50, 0) result
      where result.hospital_id = any(expected_ids)
        and result.hospital_type <> 'Synthetic test fixture'
    ) then
      raise exception 'Unexpected hospital fixture details for %.', center.fixture_id;
    end if;
  end loop;

  if exists (
    select 1
    from public.hospital_network_directory(25, null, 50, 0) result
    join hospital_donor_test_coordinates missing
      on missing.user_id = result.hospital_id
    where missing.latitude is null or missing.longitude is null
  ) then
    raise exception 'A hospital without coordinates appeared in network discovery.';
  end if;
end;
$$;

reset role;

select scenario, expected_donors,
  array(
    select auth_user.raw_user_meta_data ->> 'network_test_id'
    from public.donors donor
    join auth.users auth_user on auth_user.id = donor.user_id
    where auth_user.raw_user_meta_data ->> 'network_test_fixture' = 'true'
      and public.is_eligible_blood_request(test_request.request_id, donor.id)
    order by auth_user.raw_user_meta_data ->> 'network_test_id'
  ) as actual_eligible_donors
from hospital_donor_test_requests test_request
order by scenario;

select 'hospital-network-directory' as check_name,
  count(*) as test_hospitals_with_coordinates
from hospital_donor_test_coordinates
where latitude is not null and longitude is not null;

rollback;
