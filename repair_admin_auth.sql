-- MyMedic Diagnostic & Repair Script (v2)
-- Purpose: Verify auth state and force-reset the Admin credentials to ensure login success.

DO $$
DECLARE
  target_email TEXT := 'mymedicng@gmail.com';
  target_pass TEXT := '60647065@Medic';
  admin_id UUID;
BEGIN
  -- 1. Find the existing user
  SELECT id INTO admin_id FROM auth.users WHERE email = target_email;

  IF admin_id IS NOT NULL THEN
    -- 2. Force update password and confirm email
    UPDATE auth.users 
    SET 
      encrypted_password = extensions.crypt(target_pass, extensions.gen_salt('bf', 10)),
      email_confirmed_at = now(),
      raw_user_meta_data = '{"full_name": "Super Admin", "role": "admin"}',
      raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'
    WHERE id = admin_id;

    -- 3. Ensure role is assigned (Robust version without relying on ON CONFLICT if constraint is missing)
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = admin_id) THEN
      UPDATE public.user_roles SET role = 'admin' WHERE user_id = admin_id;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin');
    END IF;

    -- 4. Ensure profile exists
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

    RAISE NOTICE 'Admin user found and updated: %', admin_id;
  ELSE
    RAISE WARNING 'Admin user NOT found. Please run seed_test_data.sql first.';
  END IF;
END $$;

-- 5. Verification Check
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    ur.role as role_in_db,
    (u.raw_user_meta_data->>'role') as role_in_metadata
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'mymedicng@gmail.com';
