-- Durable candidate practice usage (survives session deletion)
CREATE TABLE usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  billing_period_start timestamptz NOT NULL,
  billing_period_end timestamptz NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id, event_type)
);

CREATE INDEX idx_usage_events_user_period
  ON usage_events (user_id, event_type, billing_period_start);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage events"
  ON usage_events FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates are performed server-side with service role only.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS "practicePlan" text NOT NULL DEFAULT 'free';

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_practice_plan_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_practice_plan_check
  CHECK ("practicePlan" IN ('free', 'starter', 'pro'));
