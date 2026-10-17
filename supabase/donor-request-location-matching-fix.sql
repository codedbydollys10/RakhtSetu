create or replace function public.is_eligible_blood_request(
  p_request_id uuid,
  p_donor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blood_requests r
    join public.hospitals h on h.id = r.hospital_id
    join public.donors d on d.id = p_donor_id
    where r.id = p_request_id
      and r.component = 'WHOLE_BLOOD'
      and r.status in (
        'Verification Pending', 'Verified', 'Matching', 'Donors Contacted'
      )
      and d.available
      and d.consent
      and not public.is_donor_recovery_restricted(d.id)
      and upper(trim(r.blood_group)) = upper(trim(d.blood_group))
      and (
        (
          r.latitude is not null
          and r.longitude is not null
          and d.approximate_latitude is not null
          and d.approximate_longitude is not null
          and 6371 * 2 * asin(sqrt(least(1.0::double precision, greatest(
            0.0::double precision,
            power(sin(radians(d.approximate_latitude - r.latitude) / 2), 2)
              + cos(radians(r.latitude))
              * cos(radians(d.approximate_latitude))
              * power(sin(radians(d.approximate_longitude - r.longitude) / 2), 2)
          )))) <= least(
            coalesce(r.search_radius_km, 25),
            coalesce(d.radius_km, d.radius, r.search_radius_km, 25)
          )
        )
        or exists (
          select 1
          from (values (r.area), (h.city)) as request_location(location_text)
          cross join (values (d.area), (d.city)) as donor_location(location_text)
          where nullif(trim(request_location.location_text), '') is not null
            and nullif(trim(donor_location.location_text), '') is not null
            and lower(regexp_replace(
              split_part(trim(request_location.location_text), ',', 1),
              '\s+(city|district)$',
              '',
              'i'
            )) = lower(regexp_replace(
              split_part(trim(donor_location.location_text), ',', 1),
              '\s+(city|district)$',
              '',
              'i'
            ))
        )
      )
  );
$$;

revoke all on function public.is_eligible_blood_request(uuid, uuid) from public;

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
set search_path = public
as $$
declare
  v_donor_id uuid;
begin
  select d.id into v_donor_id
  from public.donors d
  where d.user_id = auth.uid();

  if v_donor_id is null then
    raise exception 'A donor profile is required.';
  end if;

  return query
    select r.id,
      r.hospital_id,
      h.hospital_name,
      r.blood_group,
      r.units,
      r.urgency,
      r.status,
      coalesce(nullif(trim(r.area), ''), nullif(trim(h.city), ''), 'Nearby'),
      r.required_by,
      r.created_at,
      r.verified_by,
      case
        when r.latitude is not null
          and r.longitude is not null
          and d.approximate_latitude is not null
          and d.approximate_longitude is not null
        then round((6371 * 2 * asin(sqrt(
          power(sin(radians(d.approximate_latitude - r.latitude) / 2), 2)
          + cos(radians(r.latitude))
          * cos(radians(d.approximate_latitude))
          * power(sin(radians(d.approximate_longitude - r.longitude) / 2), 2)
        )))::numeric)::integer
        else null
      end
    from public.blood_requests r
    join public.hospitals h on h.id = r.hospital_id
    join public.donors d on d.id = v_donor_id
    where public.is_eligible_blood_request(r.id, v_donor_id)
      or exists (
        select 1
        from public.donor_responses dr
        where dr.request_id = r.id
          and dr.donor_id = v_donor_id
      )
    order by
      case r.urgency when 'CRITICAL' then 1 when 'URGENT' then 2 else 3 end,
      r.created_at desc;
end;
$$;

revoke all on function public.get_eligible_blood_requests() from public;
grant execute on function public.get_eligible_blood_requests() to authenticated;

create or replace function public.notify_eligible_donors_on_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hospital_city text;
begin
  if new.status not in (
    'Verification Pending', 'Verified', 'Matching', 'Donors Contacted'
  ) then
    return new;
  end if;

  select h.city into hospital_city
  from public.hospitals h
  where h.id = new.hospital_id;

  insert into public.notifications (user_id, request_id, type, title, body)
  select d.user_id, new.id, 'request', 'A blood request matches you',
    'A ' || lower(new.urgency) || ' request needs ' || new.units
      || ' unit(s) of ' || new.blood_group || ' in '
      || coalesce(nullif(trim(new.area), ''), nullif(trim(hospital_city), ''), 'your area')
      || case when new.required_by is null then '.' else
        ' by ' || to_char(new.required_by at time zone 'UTC', 'DD Mon, HH24:MI')
        || ' UTC.' end
  from public.donors d
  where d.user_id is not null
    and public.is_eligible_blood_request(new.id, d.id)
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
set search_path = public
as $$
begin
  if new.user_id is null or not new.available or not new.consent then
    return new;
  end if;

  insert into public.notifications (user_id, request_id, type, title, body)
  select new.user_id, r.id, 'request', 'A blood request matches you',
    'A ' || lower(r.urgency) || ' request needs ' || r.units
      || ' unit(s) of ' || r.blood_group || ' in '
      || coalesce(nullif(trim(r.area), ''), nullif(trim(h.city), ''), 'your area')
      || case when r.required_by is null then '.' else
        ' by ' || to_char(r.required_by at time zone 'UTC', 'DD Mon, HH24:MI')
        || ' UTC.' end
  from public.blood_requests r
  join public.hospitals h on h.id = r.hospital_id
  where r.status in (
    'Verification Pending', 'Verified', 'Matching', 'Donors Contacted'
  )
    and public.is_eligible_blood_request(r.id, new.id)
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
select donor.user_id, request.id, 'request', 'A blood request matches you',
  'A ' || lower(request.urgency) || ' request needs ' || request.units
    || ' unit(s) of ' || request.blood_group || ' in '
    || coalesce(nullif(trim(request.area), ''), nullif(trim(hospital.city), ''), 'your area')
    || case when request.required_by is null then '.' else
      ' by ' || to_char(
        request.required_by at time zone 'UTC',
        'DD Mon, HH24:MI'
      ) || ' UTC.' end
from public.blood_requests request
join public.hospitals hospital on hospital.id = request.hospital_id
join public.donors donor
  on public.is_eligible_blood_request(request.id, donor.id)
where donor.user_id is not null
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
where request.status in ('Matching', 'Donors Contacted')
group by request.id
order by request.id;

notify pgrst, 'reload schema';
