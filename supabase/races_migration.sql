-- Races table — stores upcoming and past races for each user
create table public.races (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  name         text not null,
  date         date not null,
  event_type   text not null default 'marathon',
  notes        text,
  created_at   timestamptz default now()
);

-- Row-level security
alter table public.races enable row level security;

create policy "Users can read own races" on public.races
  for select using (auth.uid() = user_id);
create policy "Users can insert own races" on public.races
  for insert with check (auth.uid() = user_id);
create policy "Users can update own races" on public.races
  for update using (auth.uid() = user_id);
create policy "Users can delete own races" on public.races
  for delete using (auth.uid() = user_id);
