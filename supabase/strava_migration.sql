-- ── Strava Integration Migration ──────────────────────────────────────────────
-- Adds:
--   runs.elevation_gain         — vertical gain in feet (nullable, all sources)
--   pending_runs.elevation_gain_feet — vert from watch/strava before user reviews

-- 1. Add elevation_gain to runs table (feet, integer, nullable)
ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS elevation_gain integer;

-- 2. Add elevation_gain_feet to pending_runs table
ALTER TABLE public.pending_runs
  ADD COLUMN IF NOT EXISTS elevation_gain_feet integer;
