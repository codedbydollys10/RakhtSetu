drop function if exists public.get_hospital_ngo_coordination_summary(
  timestamptz, timestamptz
);

create function public.get_hospital_ngo_coordination_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  response_count bigint,
  donor_response_count bigint,
  potential_donor_count bigint,
  potential_people_count bigint,
  awaiting_coordination bigint,
  coordination_in_progress bigint,
  donations_verified bigint,
  unable_to_help bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
begin
  select hospital.id into v_hospital_id
  from public.hospitals hospital
  join public.profiles profile
    on profile.id = hospital.user_id and profile.role = 'hospital'
  where hospital.user_id = auth.uid();
  if v_hospital_id is null then
    raise exception 'A linked hospital profile is required.';
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'The report date range is invalid.';
  end if;

  return query
  with ngo_responses as (
    select response.status, response.response_type,
      response.potential_donor_count
    from public.ngo_request_responses response
    join public.blood_requests request on request.id = response.request_id
    where request.hospital_id = v_hospital_id
      and (p_from is null or response.responded_at >= p_from)
      and (p_to is null or response.responded_at <= p_to)
  ),
  donor_responses as (
    select response.request_id, response.donor_id, response.status,
      exists (
        select 1 from public.donation_records donation
        where donation.request_id = response.request_id
          and donation.donor_id = response.donor_id
          and donation.hospital_id = v_hospital_id
          and donation.confirmed_by is not null
          and donation.confirmed_at is not null
      ) as donation_verified
    from public.donor_responses response
    join public.blood_requests request on request.id = response.request_id
    join public.donors donor on donor.id = response.donor_id
    join public.profiles donor_profile
      on donor_profile.id = donor.user_id and donor_profile.role = 'donor'
    where request.hospital_id = v_hospital_id
      and response.status in (
        'Response Sent', 'Hospital Confirmed',
        'Coordination in Progress', 'Completed'
      )
      and (p_from is null or response.responded_at >= p_from)
      and (p_to is null or response.responded_at <= p_to)
  )
  select
    (select count(*) from ngo_responses)::bigint,
    (select count(*) from donor_responses)::bigint,
    (select count(*) from ngo_responses
      where response_type = 'potential_donor')::bigint,
    coalesce((select sum(potential_donor_count) from ngo_responses
      where response_type = 'potential_donor'), 0)::bigint,
    (
      (select count(*) from ngo_responses
        where status = 'Awaiting Hospital Coordination')
      + (select count(*) from donor_responses where status = 'Response Sent')
    )::bigint,
    (
      (select count(*) from ngo_responses
        where status = 'Coordination in Progress')
      + (select count(*) from donor_responses
        where status in ('Hospital Confirmed', 'Coordination in Progress')
          or (status = 'Completed' and not donation_verified))
    )::bigint,
    (
      (select count(*) from ngo_responses where status = 'Donation Verified')
      + (select count(*) from donor_responses
        where status = 'Completed' and donation_verified)
    )::bigint,
    (select count(*) from ngo_responses where status = 'Unable to Help')::bigint;
end;
$$;

revoke all on function public.get_hospital_ngo_coordination_summary(
  timestamptz, timestamptz
) from public;
grant execute on function public.get_hospital_ngo_coordination_summary(
  timestamptz, timestamptz
) to authenticated;

notify pgrst, 'reload schema';
