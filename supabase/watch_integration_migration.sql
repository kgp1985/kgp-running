-- ── Watch Integration Migration ───────────────────────────────────────────────
-- Adds:
--   watch_connections — stores OAuth tokens per user per watch provider
--   pending_runs      — runs pushed from watch, awaiting user review
--   profiles.avatar_url — Supabase Storage URL for profile picture

-- ── 1. profiles: avatar URL ───────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- ── 2. watch_connections ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watch_connections (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider          text NOT NULL,          -- 'garmin' | 'coros'
  provider_user_id  text NOT NULL,          -- user ID in the provider's system
  access_token      text NOT NULL,
  token_secret      text,                   -- Garmin OAuth 1.0a only
  refresh_token     text,                   -- Coros OAuth 2.0 only
  token_expires_at  timestamptz,            -- Coros token expiry
  created_at        timestamptz DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.watch_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watch connections"
  ON public.watch_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watch connections"
  ON public.watch_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watch connections"
  ON public.watch_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watch connections"
  ON public.watch_connections FOR DELETE
  USING (auth.uid() = user_id);

-- ── 3. pending_runs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pending_runs (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider          text NOT NULL,          -- 'garmin' | 'coros' | 'fit_file'
  external_id       text,                   -- provider's activity ID (null for file uploads)
  date              date NOT NULL,
  distance_meters   numeric NOT NULL,
  duration_seconds  integer NOT NULL,
  heart_rate        integer,                -- average HR, nullable
  status            text NOT NULL DEFAULT 'pending', -- 'pending' | 'saved' | 'dismissed'
  raw_data          jsonb,                  -- full activity payload for debugging
  created_at        timestamptz DEFAULT now(),
  UNIQUE (provider, external_id)            -- prevent duplicate webhook pushes
);

ALTER TABLE public.pending_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending runs"
  ON public.pending_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pending runs"
  ON public.pending_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending runs"
  ON public.pending_runs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pending runs"
  ON public.pending_runs FOR DELETE
  USING (auth.uid() = user_id);

-- ── 4. Supabase Storage bucket for avatars ────────────────────────────────────
-- Run this separately if using Supabase dashboard Storage UI,
-- or uncomment if your Supabase project supports storage via SQL.
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS (only needed if creating bucket via SQL above):
-- CREATE POLICY "Avatar images are publicly readable"
--   ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Users can upload their own avatar"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can update their own avatar"
--   ON storage.objects FOR UPDATE
--   USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
