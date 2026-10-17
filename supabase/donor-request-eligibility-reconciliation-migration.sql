-- Reconcile donor request eligibility and inbox delivery against the current
-- blood-group and geographic matching rules.

create or replace function public.is_eligible_blood_request(
  p_request_id uuid,
  p_donor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.blood_requests request
    join public.hospitals hospital on hospital.id = request.hospital_id
    join public.donors donor on donor.id = p_donor_id
    where request.id = p_request_id
      and request.component = 'WHOLE_BLOOD'
      and request.status in (
        'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
        'Donor Confirmed', 'Hospital Confirmation'
      )
      and donor.available
      and donor.consent
      and not public.is_donor_recovery_restricted(donor.id)
      and upper(trim(request.blood_group)) = upper(trim(donor.blood_group))
      and (
        (
          request.latitude is not null
          and request.longitude is not null
          and donor.approximate_latitude is not null
          and donor.approximate_longitude is not null
          and 6371 * 2 * asin(sqrt(least(
            1.0::double precision,
            greatest(
              0.0::double precision,
              power(sin(radians(
                donor.approximate_latitude - request.latitude
              ) / 2), 2)
                + cos(radians(request.latitude))
                * cos(radians(donor.approximate_latitude))
                * power(sin(radians(
                  donor.approximate_longitude - request.longitude
                ) / 2), 2)
            )
          ))) <= least(
            coalesce(request.search_radius_km, 25),
            coalesce(
              donor.radius_km,
              donor.radius,
              request.search_radius_km,
              25
            )
          )
        )
        or exists (
          select 1
          from (values (request.area), (hospital.city))
            as request_location(location_text)
          cross join (values (donor.area), (donor.city))
            as donor_location(location_text)
          where nullif(trim(request_location.location_text), '') is not null
            and nullif(trim(donor_location.location_text), '') is not null
            and regexp_replace(
              lower(regexp_replace(
                split_part(trim(request_location.location_text), ',', 1),
                '\s+(city|district)$',
                '',
                'i'
              )),
              '[[:space:][:punct:]]+',
              '',
              'g'
            ) = regexp_replace(
              lower(regexp_replace(
                split_part(trim(donor_location.location_text), ',', 1),
                '\s+(city|district)$',
                '',
                'i'
              )),
              '[[:space:][:punct:]]+',
              '',
              'g'
            )
        )
      )
  );
$$;

revoke all on function public.is_eligible_blood_request(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.get_eligible_blood_requests()
returns table (
  id uuid,
  hospital_id uuid,
  hospital_name text,
  blood_group text,
  units integer,
  urgency text,
  status text,
  area text,
  required_by timestamptz,
  created_at timestamptz,
  verified_by uuid,
  distance_km integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_donor_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  select donor.id into v_donor_id
  from public.donors donor
  join public.profiles profile
    on profile.id = donor.user_id
    and profile.role = 'donor'
  where donor.user_id = auth.uid();

  if v_donor_id is null then
    raise exception 'A linked donor profile is required.';
  end if;

  return query
  select request.id,
    request.hospital_id,
    hospital.hospital_name,
    request.blood_group,
    request.units,
    request.urgency,
    request.status,
    coalesce(
      nullif(trim(request.area), ''),
      nullif(trim(hospital.city), ''),
      'Nearby'
    ),
    request.required_by,
    request.created_at,
    request.verified_by,
    case
      when request.latitude is not null
        and request.longitude is not null
        and donor.approximate_latitude is not null
        and donor.approximate_longitude is not null
      then round((6371 * 2 * asin(sqrt(
        power(sin(radians(
          donor.approximate_latitude - request.latitude
        ) / 2), 2)
          + cos(radians(request.latitude))
          * cos(radians(donor.approximate_latitude))
          * power(sin(radians(
            donor.approximate_longitude - request.longitude
          ) / 2), 2)
      )))::numeric)::integer
      else null
    end
  from public.blood_requests request
  join public.hospitals hospital on hospital.id = request.hospital_id
  join public.donors donor on donor.id = v_donor_id
  where public.is_eligible_blood_request(request.id, v_donor_id)
    or exists (
      select 1
      from public.donor_responses response
      where response.request_id = request.id
        and response.donor_id = v_donor_id
        and response.status not in ('Cancelled', 'Completed')
    )
  order by
    case request.urgency
      when 'CRITICAL' then 1
      when 'URGENT' then 2
      else 3
    end,
    request.created_at desc;
end;
$$;

revoke all on function public.get_eligible_blood_requests() from public, anon;
grant execute on function public.get_eligible_blood_requests() to authenticated;

create or replace function public.notify_eligible_donors_on_request()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_hospital_city text;
begin
  if new.status not in (
    'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
    'Donor Confirmed', 'Hospital Confirmation'
  ) then
    return new;
  end if;

  select hospital.city into v_hospital_city
  from public.hospitals hospital
  where hospital.id = new.hospital_id;

  insert into public.notifications (user_id, request_id, type, title, body)
  select donor.user_id,
    new.id,
    'request',
    'A blood request matches you',
    'A ' || lower(new.urgency) || ' request needs ' || new.units
      || ' unit(s) of ' || new.blood_group || ' in '
      || coalesce(
        nullif(trim(new.area), ''),
        nullif(trim(v_hospital_city), ''),
        'your area'
      )
      || case
        when new.required_by is null then '.'
        else ' by ' || to_char(
          new.required_by at time zone 'UTC',
          'DD Mon, HH24:MI'
        ) || ' UTC.'
      end
  from public.donors donor
  join public.profiles profile
    on profile.id = donor.user_id and profile.role = 'donor'
  where public.is_eligible_blood_request(new.id, donor.id)
  on conflict (user_id, request_id, type)
    where request_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists distribute_eligible_donors_on_request
  on public.blood_requests;
create trigger distribute_eligible_donors_on_request
after insert or update of status, blood_group, component, area, latitude,
  longitude, search_radius_km
on public.blood_requests
for each row execute function public.notify_eligible_donors_on_request();

create or replace function public.notify_newly_eligible_donor()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.user_id is null or not new.available or not new.consent then
    return new;
  end if;

  insert into public.notifications (user_id, request_id, type, title, body)
  select new.user_id,
    request.id,
    'request',
    'A blood request matches you',
    'A ' || lower(request.urgency) || ' request needs ' || request.units
      || ' unit(s) of ' || request.blood_group || ' in '
      || coalesce(
        nullif(trim(request.area), ''),
        nullif(trim(hospital.city), ''),
        'your area'
      )
      || case
        when request.required_by is null then '.'
        else ' by ' || to_char(
          request.required_by at time zone 'UTC',
          'DD Mon, HH24:MI'
        ) || ' UTC.'
      end
  from public.blood_requests request
  join public.hospitals hospital on hospital.id = request.hospital_id
  join public.profiles profile
    on profile.id = new.user_id and profile.role = 'donor'
  where public.is_eligible_blood_request(request.id, new.id)
  on conflict (user_id, request_id, type)
    where request_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists notify_newly_eligible_donor on public.donors;
create trigger notify_newly_eligible_donor
after insert or update of user_id, blood_group, available, consent,
  approximate_latitude, approximate_longitude, city, area, radius, radius_km
on public.donors
for each row execute function public.notify_newly_eligible_donor();

delete from public.notifications notification
using public.donors donor
where notification.user_id = donor.user_id
  and notification.type = 'request'
  and notification.request_id is not null
  and not public.is_eligible_blood_request(
    notification.request_id,
    donor.id
  )
  and not exists (
    select 1
    from public.donor_responses response
    where response.request_id = notification.request_id
      and response.donor_id = donor.id
      and response.status not in ('Cancelled', 'Completed')
  );

insert into public.notifications (user_id, request_id, type, title, body)
select donor.user_id,
  request.id,
  'request',
  'A blood request matches you',
  'A ' || lower(request.urgency) || ' request needs ' || request.units
    || ' unit(s) of ' || request.blood_group || ' in '
    || coalesce(
      nullif(trim(request.area), ''),
      nullif(trim(hospital.city), ''),
      'your area'
    )
    || case
      when request.required_by is null then '.'
      else ' by ' || to_char(
        request.required_by at time zone 'UTC',
        'DD Mon, HH24:MI'
      ) || ' UTC.'
    end
from public.blood_requests request
join public.hospitals hospital on hospital.id = request.hospital_id
join public.donors donor
  on public.is_eligible_blood_request(request.id, donor.id)
join public.profiles profile
  on profile.id = donor.user_id and profile.role = 'donor'
on conflict (user_id, request_id, type)
  where request_id is not null do nothing;

select
  request.id as request_id,
  count(donor.id) filter (
    where public.is_eligible_blood_request(request.id, donor.id)
  ) as eligible_donors,
  count(donor.id) filter (
    where public.is_eligible_blood_request(request.id, donor.id)
      and notification.id is not null
  ) as notified_eligible_donors
from public.blood_requests request
left join public.donors donor on donor.user_id is not null
left join public.notifications notification
  on notification.request_id = request.id
  and notification.user_id = donor.user_id
  and notification.type = 'request'
where request.status in (
  'Verification Pending', 'Verified', 'Matching', 'Donors Contacted',
  'Donor Confirmed', 'Hospital Confirmation'
)
group by request.id
order by request.id;

notify pgrst, 'reload schema';
