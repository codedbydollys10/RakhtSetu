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
        or (
          (
            r.latitude is null
            or r.longitude is null
            or d.approximate_latitude is null
            or d.approximate_longitude is null
          )
          and nullif(trim(h.city), '') is not null
          and nullif(trim(d.city), '') is not null
          and lower(regexp_replace(
            split_part(trim(d.city), ',', 1),
            '\s+(city|district)$',
            '',
            'i'
          )) = lower(regexp_replace(
            split_part(trim(h.city), ',', 1),
            '\s+(city|district)$',
            '',
            'i'
          ))
        )
      )
  );
$$;

revoke all on function public.is_eligible_blood_request(uuid, uuid) from public;

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
    || coalesce(nullif(hospital.city, ''), 'your area')
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
