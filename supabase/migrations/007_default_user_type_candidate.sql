-- Default new signups to candidate; backfill existing null personas (onboarding skipped)

UPDATE profiles
SET user_type = 'candidate'
WHERE user_type IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id  uuid;
  proj_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'candidate'
  )
  ON CONFLICT (id) DO UPDATE SET
    name      = coalesce(excluded.name, profiles.name),
    avatar    = coalesce(excluded.avatar, profiles.avatar),
    user_type = coalesce(profiles.user_type, excluded.user_type, 'candidate');

  org_id  := gen_random_uuid();
  proj_id := gen_random_uuid();

  INSERT INTO public.organizations (id, name, slug, "ownerId")
  VALUES (org_id, 'Personal', 'personal-' || NEW.id::text, NEW.id)
  ON CONFLICT (slug) DO NOTHING;

  IF FOUND THEN
    INSERT INTO public.organization_members ("workspaceId", "userId", role)
    VALUES (org_id, NEW.id, 'OWNER');

    INSERT INTO public.projects (id, "organizationId", name, "createdBy")
    VALUES (proj_id, org_id, 'Default', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
