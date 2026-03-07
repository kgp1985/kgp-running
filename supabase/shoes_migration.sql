-- Add shoe_id to runs table
alter table public.runs
add column shoe_id uuid references public.shoes(id) on delete set null;

-- Shoes table
create table public.shoes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  added_date date not null default current_date,
  retired boolean default false,
  retired_date date,
  created_at timestamptz default now()
);

-- Security rules
alter table public.shoes enable row level security;

create policy "Users can read own shoes" on public.shoes
  for select using (auth.uid() = user_id);
create policy "Users can insert own shoes" on public.shoes
  for insert with check (auth.uid() = user_id);
create policy "Users can update own shoes" on public.shoes
  for update using (auth.uid() = user_id);
create policy "Users can delete own shoes" on public.shoes
  for delete using (auth.uid() = user_id);
