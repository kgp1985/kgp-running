-- Migration: Training Plans entity
-- Creates a `plans` table and adds `plan_id` to `planned_runs`
-- Run this in the Supabase SQL editor for project qjnkxgmyjptpyghlfhha

-- ── 1. Plans table ────────────────────────────────────────────────────────────
create table if not exists public.plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  race_distance text,           -- '5k' | '10k' | 'half' | 'marathon'
  race_date     date,
  plan_style    text,           -- 'coach' | 'custom'
  coach_style   text,           -- 'balanced' | 'pfitzinger' | 'daniels'
  days_per_week integer,
  peak_mileage  integer,
  total_weeks   integer,
  created_at    timestamptz not null default now()
);

-- Row-level security
alter table public.plans enable row level security;

create policy "Users manage their own plans"
  on public.plans
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 2. Add plan_id to planned_runs ────────────────────────────────────────────
alter table public.planned_runs
  add column if not exists plan_id uuid references public.plans(id) on delete set null;

create index if not exists idx_planned_runs_plan_id on public.planned_runs(plan_id);
