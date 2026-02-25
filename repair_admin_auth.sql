-- MyMedic Diagnostic & Repair Script (v3 - Hardened)
-- Purpose: Clear broken schema metadata and force-reset Admin credentials.

-- 1. Schema Hardening (Clear potential introspection blockers)
DROP VIEW IF EXISTS public.user_profiles;
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);
DROP FUNCTION IF EXISTS public.has_role(public.app_role, UUID);

-- 2. Re-create has_role with correct signature (Align with types.ts)
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 3. Re-create Explicit View
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
    p.id, p.user_id, p.full_name, p.avatar_url, p.phone, p.specialty,
    p.bio, p.years_of_experience, p.license_number, p.license_expiry,
    p.is_profile_complete, p.is_verified, p.consultation_fee,
    p.timezone, p.created_at, p.updated_at, ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id;

-- 4. Admin Recovery
DO $$
DECLARE
  target_email TEXT := 'mymedicng@gmail.com';
  target_pass TEXT := '60647065@Medic';
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = target_email;

  IF admin_id IS NOT NULL THEN
    -- Update Auth
    UPDATE auth.users 
    SET 
      encrypted_password = public.crypt(target_pass, public.gen_salt('bf', 10)),
      email_confirmed_at = now(),
      raw_user_meta_data = '{"full_name": "Super Admin", "role": "admin"}',
      raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'
    WHERE id = admin_id;

    -- Update Role
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = admin_id) THEN
      UPDATE public.user_roles SET role = 'admin' WHERE user_id = admin_id;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin');
    END IF;

    -- Update Profile
    IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = admin_id) THEN
      UPDATE public.profiles SET 
        full_name = 'Super Admin',
        is_profile_complete = true,
        is_verified = true
      WHERE user_id = admin_id;
    ELSE
      INSERT INTO public.profiles (user_id, full_name, is_profile_complete, is_verified)
      VALUES (admin_id, 'Super Admin', true, true);
    END IF;

    RAISE NOTICE 'Schema hardened and Admin updated: %', admin_id;
  ELSE
    RAISE WARNING 'Admin user NOT found.';
  END IF;
END $$;
