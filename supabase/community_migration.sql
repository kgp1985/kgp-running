-- ── Community Feed Migration ──────────────────────────────────────────────────
-- Adds:
--   profiles.is_public   — user can make their profile visible in the community feed
--   profiles.display_name — user-chosen display name shown on post cards
--   runs.subtitle        — optional custom caption on a run post

-- 1. profiles: public toggle
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 2. profiles: display name
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

-- 3. runs: subtitle / caption
ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS subtitle text;

-- ── RLS for profiles (if not already enabled) ─────────────────────────────────
-- profiles table already has RLS in the initial migration, so we just add
-- a policy that allows anyone to SELECT public profiles.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public profiles are viewable by everyone"
        ON public.profiles
        FOR SELECT
        USING (is_public = true OR auth.uid() = id);
    $policy$;
  END IF;
END
$$;

-- Allow users to update their own profile (display_name, is_public)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can update their own profile"
        ON public.profiles
        FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    $policy$;
  END IF;
END
$$;
