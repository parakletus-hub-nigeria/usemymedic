-- MyMedic Seed Script: Admin & Test Professional
-- Purpose: Create initial users and verify triggers for profiles, roles, and wallets.
-- Run this in the Supabase SQL Editor AFTER running init_schema.sql.

-- Ensure pgcrypto is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  admin_id UUID := '00000000-0000-0000-0000-000000000001';
  pro_id UUID := '00000000-0000-0000-0000-000000000002';
  -- Use default supabase instance_id
  inst_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- 1. Create Super Admin
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'mymedicng@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, is_super_admin
    )
    VALUES (
      inst_id,
      admin_id,
      'authenticated',
      'authenticated',
      'mymedicng@gmail.com',
      extensions.crypt('60647065@Medic', extensions.gen_salt('bf', 10)),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Super Admin", "role": "admin"}',
      now(),
      now(),
      '', '', '',
      FALSE
    );
  END IF;

  -- 2. Create Test Professional
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'evander.ikechukwu@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, is_super_admin
    )
    VALUES (
      inst_id,
      pro_id,
      'authenticated',
      'authenticated',
      'evander.ikechukwu@gmail.com',
      extensions.crypt('TestPassword123!', extensions.gen_salt('bf', 10)),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Dr. Evander Ikechukwu", "role": "professional"}',
      now(),
      now(),
      '', '', '',
      FALSE
    );
  END IF;

  -- 3. Mark profiles as complete
  UPDATE public.profiles SET is_profile_complete = true WHERE user_id IN (admin_id, pro_id);

END $$;

-- 3. Verification Query
SELECT 
    u.email,
    p.full_name AS profile_name,
    ur.role AS assigned_role,
    CASE WHEN w.id IS NOT NULL THEN 'Created' ELSE 'N/A' END AS wallet_status,
    w.balance AS wallet_balance
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.wallets w ON u.id = w.professional_id
WHERE u.email IN ('mymedicng@gmail.com', 'evander.ikechukwu@gmail.com');
