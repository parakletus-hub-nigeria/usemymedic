-- MyMedic MVP: Comprehensive Database Initialization Script
-- Designed for Supabase SQL Editor
-- Features: Recursion-free RLS, Professional Wallets, Auth Triggers, and HIPAA-ready structure.

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1. Custom Types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('patient', 'professional', 'admin');
    END IF;
END $$;

-- 2. Tables

-- User Roles: Decoupled role management to prevent RLS recursion
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Profiles: Core user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  specialty TEXT,
  bio TEXT,
  years_of_experience INTEGER,
  license_number TEXT,
  license_expiry DATE,
  bank_name TEXT,
  bank_account_number TEXT,
  is_profile_complete BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  consultation_fee NUMERIC(10,2) DEFAULT 0,
  timezone TEXT NOT NULL DEFAULT 'Africa/Lagos',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wallets: Financial tracking for professionals
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Appointments: Booking records
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_mins INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_payment', 'confirmed', 'declined', 'completed', 'cancelled')),
  consultation_notes TEXT,
  meet_link TEXT,
  payment_expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages: In-app chat
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions: Payment records
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paystack_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Availability & Blocks
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_mins INTEGER NOT NULL DEFAULT 30,
  buffer_mins INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_off_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Requests
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);

-- 3. Security Definer Functions

-- Crucial: Get user role without querying profiles directly (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_appointment_participant(_appointment_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = _appointment_id
    AND (patient_id = _user_id OR professional_id = _user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_chat_accessible(_appointment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = _appointment_id
    AND (
      status = 'confirmed'
      OR status = 'awaiting_payment'
      OR (status = 'completed' AND completed_at > now() - interval '24 hours')
    )
  )
$$;

-- 4. Row Level Security Policies

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- User Roles Policies
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Profiles Policies (RECURSION-FREE)
DROP POLICY IF EXISTS "Public read for verified professionals" ON public.profiles;
CREATE POLICY "Public read for verified professionals" ON public.profiles
  FOR SELECT USING (
    is_verified = true 
    AND public.get_user_role(user_id) = 'professional'
  );

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

-- Wallets Policies
DROP POLICY IF EXISTS "Professionals can read own wallet" ON public.wallets;
CREATE POLICY "Professionals can read own wallet" ON public.wallets 
  FOR SELECT USING (professional_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage wallets" ON public.wallets;
CREATE POLICY "Admins can manage wallets" ON public.wallets 
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Appointments Policies
DROP POLICY IF EXISTS "Users can read own appointments" ON public.appointments;
CREATE POLICY "Users can read own appointments" ON public.appointments
  FOR SELECT USING (patient_id = auth.uid() OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all" ON public.appointments;
CREATE POLICY "Admins can read all" ON public.appointments
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
CREATE POLICY "Patients can create appointments" ON public.appointments
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'patient' AND patient_id = auth.uid());

DROP POLICY IF EXISTS "Participants can update appointments" ON public.appointments;
CREATE POLICY "Participants can update appointments" ON public.appointments
  FOR UPDATE USING (patient_id = auth.uid() OR professional_id = auth.uid());

-- Messages Policies
DROP POLICY IF EXISTS "Participants can read messages" ON public.messages;
CREATE POLICY "Participants can read messages" ON public.messages
  FOR SELECT USING (public.is_appointment_participant(appointment_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() 
    AND public.is_appointment_participant(appointment_id, auth.uid())
    AND public.is_chat_accessible(appointment_id)
  );

-- Transactions Policies
DROP POLICY IF EXISTS "Users can read own transactions" ON public.transactions;
CREATE POLICY "Users can read own transactions" ON public.transactions
  FOR SELECT USING (patient_id = auth.uid() OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage transactions" ON public.transactions;
CREATE POLICY "Admins can manage transactions" ON public.transactions
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Availability & Schedule Policies
DROP POLICY IF EXISTS "Public read for availability" ON public.availability_slots;
CREATE POLICY "Public read for availability" ON public.availability_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Professionals manage own slots" ON public.availability_slots;
CREATE POLICY "Professionals manage own slots" ON public.availability_slots FOR ALL 
  USING (professional_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Professionals manage own time off" ON public.time_off_blocks;
CREATE POLICY "Professionals manage own time off" ON public.time_off_blocks FOR ALL 
  USING (professional_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Request Policies
DROP POLICY IF EXISTS "Professionals read own verification" ON public.verification_requests;
CREATE POLICY "Professionals read own verification" ON public.verification_requests FOR SELECT
  USING (professional_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage verifications" ON public.verification_requests;
CREATE POLICY "Admins manage verifications" ON public.verification_requests FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Professionals read own payouts" ON public.payout_requests;
CREATE POLICY "Professionals read own payouts" ON public.payout_requests FOR SELECT USING (professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals request payouts" ON public.payout_requests;
CREATE POLICY "Professionals request payouts" ON public.payout_requests FOR INSERT
  WITH CHECK (professional_id = auth.uid() AND public.get_user_role(auth.uid()) = 'professional');

DROP POLICY IF EXISTS "Admins manage payouts" ON public.payout_requests;
CREATE POLICY "Admins manage payouts" ON public.payout_requests FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin');

-- 5. Triggers & Automation

-- Function: Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'patient')::public.app_role);
  
  RETURN NEW;
END;
$$;

-- Trigger: New user onboarding (profile + role)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: Auto-create wallet for professionals
CREATE OR REPLACE FUNCTION public.handle_professional_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'professional' THEN
    INSERT INTO public.wallets (professional_id) VALUES (NEW.user_id)
    ON CONFLICT (professional_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: Professional wallet creation
DROP TRIGGER IF EXISTS on_role_created_wallet ON public.user_roles;
CREATE TRIGGER on_role_created_wallet
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_professional_wallet();

-- Function: Standard updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers: Updated_at updates
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_wallets_updated_at ON public.wallets;
CREATE TRIGGER set_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
