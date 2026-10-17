-- Fulfilment requires at least one valid unique donor response and enough verified
-- donation records to cover the request's required units.
alter table public.hospital_fulfillment_reviews
  add column if not exists verified_donation_count integer not null default 0,
  add column if not exists required_units integer not null default 1;

alter table public.hospital_fulfillment_reviews
  drop constraint if exists hospital_fulfillment_reviews_status_check;
alter table public.hospital_fulfillment_reviews
  add constraint hospital_fulfillment_reviews_status_check
  check (status in (
    'needs_more_valid_responses',
    'needs_more_verified_donations',
    'ready',
    'closed'
  ));

create table if not exists public.blood_request_fulfillment_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  previous_status text not null,
  previous_fulfilled_at timestamptz,
  valid_unique_response_count integer not null,
  verified_donation_count integer not null,
  required_units integer not null,
  reason text not null,
  reconciled_at timestamptz not null default now()
);

alter table public.blood_request_fulfillment_audit enable row level security;
revoke all on public.blood_request_fulfillment_audit from anon, authenticated;

create or replace function public.blood_request_fulfillment_state(
  p_request_id uuid
)
returns table (
  valid_unique_response_count integer,
  verified_donation_count integer,
  required_units integer,
  donation_completed_and_verified boolean,
  fulfillment_qualified boolean,
  donation_completed_at timestamptz,
  donation_verified_by uuid
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with request_row as (
    select request.id, request.hospital_id, request.units
    from public.blood_requests request
    where request.id = p_request_id
  ),
  response_count as (
    select count(distinct response.donor_id)::integer as total
    from public.donor_responses response
    join public.donors donor on donor.id = response.donor_id
    join public.profiles profile
      on profile.id = donor.user_id and profile.role = 'donor'
    where response.request_id = p_request_id
      and response.status in (
        'Response Sent', 'Hospital Confirmed',
        'Coordination in Progress', 'Completed'
      )
      and donor.user_id is not null
  ),
  donation_summary as (
    select count(distinct donation.donor_id)::integer as total,
      max(donation.confirmed_at) as latest_confirmation,
      (array_agg(donation.confirmed_by order by donation.confirmed_at desc))[1]
        as latest_verifier
    from public.donation_records donation
    join request_row request
      on request.id = donation.request_id
      and request.hospital_id = donation.hospital_id
    join public.donor_responses response
      on response.request_id = donation.request_id
      and response.donor_id = donation.donor_id
      and response.status = 'Completed'
    join public.donors donor on donor.id = donation.donor_id
    join public.profiles profile
      on profile.id = donor.user_id and profile.role = 'donor'
    where donation.confirmed_by is not null
      and donation.confirmed_at is not null
  )
  select
    coalesce(response_count.total, 0),
    coalesce(donation_summary.total, 0),
    coalesce(request_row.units, 0),
    coalesce(donation_summary.total, 0) >= coalesce(request_row.units, 1),
    coalesce(response_count.total, 0) >= 1
      and coalesce(donation_summary.total, 0) >= coalesce(request_row.units, 1),
    donation_summary.latest_confirmation,
    donation_summary.latest_verifier
  from request_row
  cross join response_count
  cross join donation_summary;
$$;

create or replace function public.get_hospital_request_fulfillment(
  p_request_id uuid default null
)
returns table (
  request_id uuid,
  valid_unique_response_count integer,
  verified_donation_count integer,
  required_units integer,
  donation_completed_and_verified boolean,
  fulfillment_qualified boolean,
  donation_completed_at timestamptz,
  donation_verified_by uuid,
  fulfillment_review_required boolean
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
  if p_request_id is not null and not exists (
    select 1 from public.blood_requests request
    where request.id = p_request_id
      and request.hospital_id = v_hospital_id
  ) then
    raise exception 'This request does not belong to your hospital.';
  end if;

  return query
  select request.id,
    state.valid_unique_response_count,
    state.verified_donation_count,
    state.required_units,
    state.donation_completed_and_verified,
    state.fulfillment_qualified,
    state.donation_completed_at,
    state.donation_verified_by,
    state.verified_donation_count > 0 and not state.fulfillment_qualified
  from public.blood_requests request
  cross join lateral public.blood_request_fulfillment_state(request.id) state
  where request.hospital_id = v_hospital_id
    and (p_request_id is null or request.id = p_request_id);
end;
$$;

create or replace function public.update_hospital_blood_request_status(
  p_request_id uuid,
  p_status text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
  v_request public.blood_requests%rowtype;
  v_state record;
begin
  select hospital.id into v_hospital_id
  from public.hospitals hospital
  join public.profiles profile
    on profile.id = hospital.user_id and profile.role = 'hospital'
  where hospital.user_id = auth.uid();

  if v_hospital_id is null then
    raise exception 'A linked hospital profile is required.';
  end if;
  if p_status is null or p_status not in ('Fulfilled', 'Cancelled') then
    raise exception 'Only fulfilment and cancellation status changes are supported here.';
  end if;

  select request.* into v_request
  from public.blood_requests request
  where request.id = p_request_id
    and request.hospital_id = v_hospital_id
  for update;
  if not found then
    raise exception 'This request does not belong to your hospital.';
  end if;
  if v_request.status in ('Fulfilled', 'Cancelled') then
    raise exception 'A closed blood request cannot change status.';
  end if;

  select * into v_state
  from public.blood_request_fulfillment_state(p_request_id);

  if p_status = 'Cancelled' then
    if v_request.status in ('Donor Confirmed', 'Hospital Confirmation') then
      raise exception 'A request with an acknowledged donor cannot be cancelled.';
    end if;
  else
    if v_request.status not in (
      'Verified', 'Verification Pending', 'Donor Confirmed',
      'Hospital Confirmation', 'Matching', 'Donors Contacted'
    ) then
      raise exception 'The request is not in a state that can be fulfilled.';
    end if;

    if not coalesce(v_state.fulfillment_qualified, false) then
      raise exception
        'Fulfilment requires at least one valid unique donor response and verified donation records for all % requested unit(s). Current: % response(s), % / % verified donations.',
        v_state.required_units,
        v_state.valid_unique_response_count,
        v_state.verified_donation_count,
        v_state.required_units;
    end if;
  end if;

  update public.blood_requests
  set status = p_status,
      fulfilled_at = case when p_status = 'Fulfilled'
        then v_state.donation_completed_at else null end
  where id = p_request_id;

  return p_status;
end;
$$;

create or replace function public.guard_hospital_request_fulfillment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_hospital_id uuid;
  v_state record;
begin
  if new.status = 'Fulfilled' then
    select hospital.id into v_hospital_id
    from public.hospitals hospital
    join public.profiles profile
      on profile.id = hospital.user_id and profile.role = 'hospital'
    where hospital.user_id = auth.uid();

    if v_hospital_id is null or v_hospital_id <> old.hospital_id then
      raise exception 'Only authorised staff at the request hospital can fulfil it.';
    end if;

    select * into v_state
    from public.blood_request_fulfillment_state(old.id);
    if not coalesce(v_state.fulfillment_qualified, false) then
      raise exception
        'Fulfilment requires at least one valid unique donor response and verified donation records for all % requested unit(s). Current: % response(s), % / % verified donations.',
        v_state.required_units,
        v_state.valid_unique_response_count,
        v_state.verified_donation_count,
        v_state.required_units;
    end if;

    new.fulfilled_at := v_state.donation_completed_at;
  end if;
  return new;
end;
$$;

-- A completed donor response is donation evidence only; it cannot close a
-- request. Hospital staff must use the guarded status RPC after the rule is met.
create or replace function public.sync_blood_request_from_donor_response()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  next_donor_id uuid;
begin
  if new.status = 'Completed' then
    return new;
  end if;

  if new.status = 'Cancelled' then
    if tg_op = 'UPDATE' and old.status is distinct from 'Cancelled' then
      select response.donor_id into next_donor_id
      from public.donor_responses response
      where response.request_id = new.request_id
        and response.id <> new.id
        and response.status <> 'Cancelled'
      order by response.responded_at
      limit 1;

      update public.blood_requests request
      set matched_donor = case
            when request.matched_donor = old.donor_id then next_donor_id
            else request.matched_donor
          end,
          status = case
            when request.matched_donor = old.donor_id and next_donor_id is null
              then 'Matching'
            when request.matched_donor = old.donor_id
              then 'Donor Confirmed'
            else request.status
          end
      where request.id = new.request_id
        and request.status not in ('Fulfilled', 'Cancelled');
    end if;
    return new;
  end if;

  update public.blood_requests request
  set status = case new.status
        when 'Hospital Confirmed' then 'Hospital Confirmation'
        when 'Coordination in Progress' then 'Matching'
        else 'Donor Confirmed'
      end,
      matched_donor = coalesce(request.matched_donor, new.donor_id)
  where request.id = new.request_id
    and request.status not in ('Fulfilled', 'Cancelled')
    and (request.matched_donor is null or request.matched_donor = new.donor_id);

  return new;
end;
$$;

create or replace function public.flag_donation_below_response_threshold()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state record;
begin
  select * into v_state
  from public.blood_request_fulfillment_state(new.request_id);

  insert into public.hospital_fulfillment_reviews (
    request_id, donation_id, donor_response_count,
    verified_donation_count, required_units, status
  )
  values (
    new.request_id, new.id, v_state.valid_unique_response_count,
    v_state.verified_donation_count, v_state.required_units,
    case
      when v_state.fulfillment_qualified then 'ready'
      when v_state.valid_unique_response_count < 1
        then 'needs_more_valid_responses'
      else 'needs_more_verified_donations'
    end
  )
  on conflict (donation_id) do update
    set donor_response_count = excluded.donor_response_count,
        verified_donation_count = excluded.verified_donation_count,
        required_units = excluded.required_units,
        status = case
          when excluded.status = 'ready' then 'ready'
          when excluded.status = 'needs_more_valid_responses'
            then 'needs_more_valid_responses'
          else 'needs_more_verified_donations'
        end,
        updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_hospital_fulfillment_review()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request_id uuid;
  v_state record;
begin
  if tg_op = 'DELETE' then
    v_request_id := old.request_id;
  else
    v_request_id := new.request_id;
  end if;

  select * into v_state
  from public.blood_request_fulfillment_state(v_request_id);

  update public.hospital_fulfillment_reviews review
  set donor_response_count = v_state.valid_unique_response_count,
      verified_donation_count = v_state.verified_donation_count,
      required_units = v_state.required_units,
      status = case
        when v_state.fulfillment_qualified then 'ready'
        when v_state.valid_unique_response_count < 1
          then 'needs_more_valid_responses'
        else 'needs_more_verified_donations'
      end,
      updated_at = now()
  where review.request_id = v_request_id
    and review.status <> 'closed';

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Audit and reopen legacy fulfilled requests without inventing donation evidence.
insert into public.blood_request_fulfillment_audit (
  request_id, previous_status, previous_fulfilled_at,
  valid_unique_response_count, verified_donation_count,
  required_units, reason
)
select request.id, request.status, request.fulfilled_at,
  state.valid_unique_response_count, state.verified_donation_count,
  state.required_units,
  'Legacy Fulfilled status did not satisfy the current response and verified-donation rule.'
from public.blood_requests request
cross join lateral public.blood_request_fulfillment_state(request.id) state
where request.status = 'Fulfilled'
  and not state.fulfillment_qualified
  and not exists (
    select 1 from public.blood_request_fulfillment_audit audit
    where audit.request_id = request.id
      and audit.reason like 'Legacy Fulfilled status did not satisfy%'
  );

do $$
declare
  v_trigger_enabled "char";
begin
  select trigger_row.tgenabled into v_trigger_enabled
  from pg_catalog.pg_trigger trigger_row
  where trigger_row.tgrelid = 'public.blood_requests'::regclass
    and trigger_row.tgname = 'guard_blood_request_workflow'
    and not trigger_row.tgisinternal;
  if not found then
    raise exception 'The blood-request workflow guard trigger is missing.';
  end if;

  execute 'alter table public.blood_requests disable trigger guard_blood_request_workflow';
  update public.blood_requests request
  set status = 'Donors Contacted',
      fulfilled_at = null
  where request.status = 'Fulfilled'
    and not exists (
      select 1 from public.blood_request_fulfillment_state(request.id) state
      where state.fulfillment_qualified
    );
  if v_trigger_enabled = 'A' then
    execute 'alter table public.blood_requests enable always trigger guard_blood_request_workflow';
  elsif v_trigger_enabled = 'R' then
    execute 'alter table public.blood_requests enable replica trigger guard_blood_request_workflow';
  elsif v_trigger_enabled = 'O' then
    execute 'alter table public.blood_requests enable trigger guard_blood_request_workflow';
  end if;
end;
$$;

update public.hospital_fulfillment_reviews review
set donor_response_count = state.valid_unique_response_count,
    verified_donation_count = state.verified_donation_count,
    required_units = state.required_units,
    status = case
      when state.fulfillment_qualified then 'ready'
      when state.valid_unique_response_count < 1
        then 'needs_more_valid_responses'
      else 'needs_more_verified_donations'
    end,
    updated_at = now()
from public.blood_requests request
cross join lateral public.blood_request_fulfillment_state(request.id) state
where request.id = review.request_id
  and review.status <> 'closed';

insert into public.hospital_fulfillment_reviews (
  request_id, donation_id, donor_response_count,
  verified_donation_count, required_units, status
)
select donation.request_id, donation.id,
  state.valid_unique_response_count,
  state.verified_donation_count,
  state.required_units,
  case
    when state.fulfillment_qualified then 'ready'
    when state.valid_unique_response_count < 1
      then 'needs_more_valid_responses'
    else 'needs_more_verified_donations'
  end
from public.donation_records donation
cross join lateral public.blood_request_fulfillment_state(donation.request_id) state
where donation.confirmed_by is not null
  and donation.confirmed_at is not null
on conflict (donation_id) do update
  set donor_response_count = excluded.donor_response_count,
      verified_donation_count = excluded.verified_donation_count,
      required_units = excluded.required_units,
      status = excluded.status,
      updated_at = now()
  where public.hospital_fulfillment_reviews.status <> 'closed';

revoke all on function public.blood_request_fulfillment_state(uuid) from public;
revoke all on function public.get_hospital_request_fulfillment(uuid) from public;
revoke all on function public.update_hospital_blood_request_status(uuid, text) from public;
revoke all on function public.guard_hospital_request_fulfillment() from public;
revoke all on function public.flag_donation_below_response_threshold() from public;
revoke all on function public.sync_hospital_fulfillment_review() from public;
grant execute on function public.get_hospital_request_fulfillment(uuid) to authenticated;
grant execute on function public.update_hospital_blood_request_status(uuid, text) to authenticated;
