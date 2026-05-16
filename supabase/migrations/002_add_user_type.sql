-- Add B2C / B2B persona on profiles (nullable for existing users → onboarding)
ALTER TABLE profiles
  ADD COLUMN user_type text;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IS NULL OR user_type IN ('candidate', 'recruiter'));
