-- Add B2C / B2B persona on profiles (nullable for existing users → onboarding)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_type_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_user_type_check
      CHECK (user_type IS NULL OR user_type IN ('candidate', 'recruiter'));
  END IF;
END $$;
