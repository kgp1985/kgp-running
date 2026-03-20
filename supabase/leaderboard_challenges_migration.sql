-- Awards (medals and trophies earned by users)
CREATE TABLE IF NOT EXISTS awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('medal', 'trophy')),
  category text NOT NULL, -- 'mileage', '5k', '10k', 'half_marathon', 'full_marathon', 'challenge'
  label text, -- e.g. "March 2026 Top Miler", "2026 Marathon Champion"
  awarded_at timestamptz DEFAULT now(),
  month int, -- 1-12, null if annual
  year int NOT NULL
);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('race_event', 'mileage')),
  -- For race_event: target_distance_km is the race distance
  -- For mileage: target_distance_km is the total mileage target (or just use end_date)
  target_distance_km numeric,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'active', 'completed')),
  created_at timestamptz DEFAULT now()
);

-- Challenge participants
CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
  result_miles numeric, -- filled in when challenge completes
  created_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- RLS
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own awards" ON awards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own challenges" ON challenges FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "Anyone can read challenges" ON challenges FOR SELECT USING (true);
CREATE POLICY "Users can manage own participation" ON challenge_participants FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read challenge participants" ON challenge_participants FOR SELECT USING (true);
CREATE POLICY "Service role can insert awards" ON awards FOR INSERT WITH CHECK (true);
