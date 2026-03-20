-- Friends/followers system
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- Turtle/Hare reactions on runs
CREATE TABLE IF NOT EXISTS run_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('turtle', 'hare')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(run_id, user_id)
);

-- Comments on runs
CREATE TABLE IF NOT EXISTS run_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_comments ENABLE ROW LEVEL SECURITY;

-- Friendships: users can see their own friendships
CREATE POLICY "Users can manage own friendships" ON friendships
  FOR ALL USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Reactions: anyone logged in can react
CREATE POLICY "Users can manage own reactions" ON run_reactions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read reactions" ON run_reactions
  FOR SELECT USING (true);

-- Comments: anyone can read, only owner can delete
CREATE POLICY "Anyone can read comments" ON run_comments
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments" ON run_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON run_comments
  FOR DELETE USING (auth.uid() = user_id);
