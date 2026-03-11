-- Store a user's goal VDOT (set from the Race Calculator page)
-- One row per user; upsert on conflict.
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id          uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  goal_vdot        numeric,
  goal_race_dist   text,     -- e.g. "Marathon"
  goal_race_time   text,     -- e.g. "3:30:00"
  updated_at       timestamptz DEFAULT now(),
  PRIMARY KEY (user_id)
);

-- Row-level security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON public.user_settings FOR DELETE
  USING (auth.uid() = user_id);
