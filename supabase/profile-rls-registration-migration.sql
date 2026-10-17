alter table public.profiles enable row level security;

drop policy if exists "Users can read their profile"
  on public.profiles;
create policy "Users can read their profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can create their profile"
  on public.profiles;
create policy "Users can create their profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their profile"
  on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, insert, update
  on public.profiles to authenticated;

notify pgrst, 'reload schema';
