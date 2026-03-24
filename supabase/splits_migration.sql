-- Per-mile splits for imported runs
CREATE TABLE IF NOT EXISTS run_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mile_number int NOT NULL,
  split_seconds int NOT NULL,
  cumulative_seconds int NOT NULL,
  cumulative_distance_miles numeric(8,4) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(run_id, mile_number)
);

-- Pre-computed fastest consecutive window per run per event
CREATE TABLE IF NOT EXISTS run_best_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('1_mile','5k','10k','half_marathon','marathon')),
  fastest_seconds int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(run_id, event)
);

ALTER TABLE run_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_best_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own splits" ON run_splits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read splits" ON run_splits FOR SELECT USING (true);
CREATE POLICY "Users can manage own windows" ON run_best_windows FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read best windows" ON run_best_windows FOR SELECT USING (true);
