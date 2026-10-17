alter table public.donors
  add column if not exists area text,
  add column if not exists emergency_contact text;

create or replace function public.update_donor_profile(
  p_full_name text,
  p_phone text,
  p_blood_group text,
  p_city text,
  p_area text,
  p_emergency_contact text,
  p_latitude double precision,
  p_longitude double precision,
  p_map_location text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_donor_id uuid;
begin
  if nullif(trim(p_full_name), '') is null then
    raise exception 'A donor name is required.';
  end if;

  if (p_latitude is null) <> (p_longitude is null)
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180 then
    raise exception 'The donor location coordinates are invalid.';
  end if;

  select d.id into v_donor_id
  from public.donors d
  where d.user_id = auth.uid()
  for update;

  if v_donor_id is null then
    raise exception 'A donor profile is required.';
  end if;

  update public.donors
  set full_name = trim(p_full_name),
      phone = nullif(trim(p_phone), ''),
      blood_group = p_blood_group,
      city = nullif(trim(p_city), ''),
      area = nullif(trim(p_area), ''),
      emergency_contact = nullif(trim(p_emergency_contact), ''),
      approximate_latitude = case
        when p_latitude is null then null
        else round(p_latitude::numeric, 2)::double precision
      end,
      approximate_longitude = case
        when p_longitude is null then null
        else round(p_longitude::numeric, 2)::double precision
      end,
      map_location = nullif(trim(p_map_location), '')
  where id = v_donor_id;

  update public.profiles
  set full_name = trim(p_full_name),
      phone = nullif(trim(p_phone), ''),
      city = nullif(trim(p_city), '')
  where id = auth.uid();

  if not found then
    raise exception 'The donor account profile could not be updated.';
  end if;
end;
$$;

revoke all on function public.update_donor_profile(
  text, text, text, text, text, text, double precision, double precision, text
) from public;
grant execute on function public.update_donor_profile(
  text, text, text, text, text, text, double precision, double precision, text
) to authenticated;

notify pgrst, 'reload schema';
