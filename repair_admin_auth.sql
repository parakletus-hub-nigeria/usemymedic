-- MyMedic Admin Repair Script (v5 - Full Diagnostic + Fix)
-- Run this in the Supabase SQL Editor for project: gxfhgsucjarflwpshfcm
-- It will: check admin user existence, fix password, assign 'admin' role, ensure profile.

DO $$
DECLARE
  target_email TEXT := 'mymedicng@gmail.com';
  target_pass  TEXT := '60647065@Medic';
  admin_id     UUID;
BEGIN
  SET search_path = public, extensions, auth;

  -- STEP 1: Find the admin user
  SELECT id INTO admin_id FROM auth.users WHERE email = target_email;

  IF admin_id IS NULL THEN
    RAISE WARNING 'ADMIN USER NOT FOUND for email: %. Creating a fresh admin account...', target_email;

    -- Create user directly in auth.users
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated', 'authenticated',
      target_email,
      crypt(target_pass, gen_salt('bf', 10)),
      now(),
      '{"full_name": "Super Admin", "role": "admin"}',
      '{"provider": "email", "providers": ["email"]}',
      now(), now(), '', ''
    )
    RETURNING id INTO admin_id;

    RAISE NOTICE 'Created new admin user with id: %', admin_id;
  ELSE
    RAISE NOTICE 'Found existing admin user: %', admin_id;

    -- STEP 2a: Reset password and confirm email
    UPDATE auth.users
    SET
      encrypted_password  = crypt(target_pass, gen_salt('bf', 10)),
      email_confirmed_at  = now(),
      raw_user_meta_data  = '{"full_name": "Super Admin", "role": "admin"}',
      raw_app_meta_data   = '{"provider": "email", "providers": ["email"]}',
      updated_at          = now()
    WHERE id = admin_id;

    RAISE NOTICE 'Password reset and email confirmed for: %', admin_id;
  END IF;

  -- STEP 3: Ensure user_roles row = 'admin'
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = admin_id) THEN
    UPDATE public.user_roles SET role = 'admin' WHERE user_id = admin_id;
    RAISE NOTICE 'user_roles row updated to admin.';
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin');
    RAISE NOTICE 'user_roles row inserted as admin.';
  END IF;

  -- STEP 4: Ensure profile exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = admin_id) THEN
    UPDATE public.profiles
    SET full_name = 'Super Admin', is_profile_complete = true, is_verified = true
    WHERE user_id = admin_id;
  ELSE
    INSERT INTO public.profiles (user_id, full_name, is_profile_complete, is_verified)
    VALUES (admin_id, 'Super Admin', true, true);
  END IF;
  RAISE NOTICE 'Profile ensured for admin.';

  -- FINAL DIAGNOSTIC: Print current state
  RAISE NOTICE '=== FINAL STATE ===';
  RAISE NOTICE 'auth.users: id=%, email=%, confirmed=%',
    admin_id, target_email,
    (SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE id = admin_id);
  RAISE NOTICE 'user_roles: role=%',
    (SELECT role FROM public.user_roles WHERE user_id = admin_id);
  RAISE NOTICE 'profiles: full_name=%, is_verified=%',
    (SELECT full_name FROM public.profiles WHERE user_id = admin_id),
    (SELECT is_verified FROM public.profiles WHERE user_id = admin_id);

END $$;

-- Quick read-back to confirm in the Results tab:
SELECT
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  ur.role,
  p.full_name,
  p.is_verified
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p    ON p.user_id  = u.id
WHERE u.email = 'mymedicng@gmail.com';
