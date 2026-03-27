-- Add username handle (unique, like @instagram)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_widgets jsonb DEFAULT '["recent_runs","mileage_chart","fastest_times"]'::jsonb;

-- Unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- Allow any authenticated user to check if a username is taken (for availability check)
DROP POLICY IF EXISTS "Anyone can search profiles by username" ON public.profiles;
CREATE POLICY "Anyone can search profiles by username" ON public.profiles
  FOR SELECT USING (true);
