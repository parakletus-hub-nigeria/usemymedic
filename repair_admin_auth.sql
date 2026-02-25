-- MyMedic Diagnostic & Repair Script (v4 - Schema Fixed)
-- Purpose: Force-reset Admin credentials with correct schema-agnostic function calls.

DO $$
DECLARE
  target_email TEXT := 'mymedicng@gmail.com';
  target_pass TEXT := '60647065@Medic';
  admin_id UUID;
BEGIN
  -- Set search path to include extensions where crypt/gen_salt live
  SET search_path = public, extensions, auth;

  -- 1. Find the existing user
  SELECT id INTO admin_id FROM auth.users WHERE email = target_email;

  IF admin_id IS NOT NULL THEN
    -- 2. Force update password (using generic names, search_path handles the rest)
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(target_pass, gen_salt('bf', 10)),
      email_confirmed_at = now(),
      raw_user_meta_data = '{"full_name": "Super Admin", "role": "admin"}',
      raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'
    WHERE id = admin_id;

    -- 3. Ensure role is assigned
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
