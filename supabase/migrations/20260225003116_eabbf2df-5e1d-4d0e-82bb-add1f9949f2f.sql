
-- ============================================
-- MyMedic MVP Database Schema
-- ============================================

-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('patient', 'professional', 'admin');

-- 2. User Roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Profiles table
CREATE TABLE public.profiles (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Verification Requests
CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- 5. Availability Slots
CREATE TABLE public.availability_slots (
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
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- 6. Time Off Blocks
CREATE TABLE public.time_off_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.time_off_blocks ENABLE ROW LEVEL SECURITY;

-- 7. Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) NOT NULL,
  professional_id UUID REFERENCES auth.users(id) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_mins INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'completed', 'cancelled')),
  consultation_notes TEXT,
  meet_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 8. Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 9. Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id),
  patient_id UUID REFERENCES auth.users(id) NOT NULL,
  professional_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paystack_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 10. Wallets
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- 11. Payout Requests
CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Security Definer Functions
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
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

CREATE OR REPLACE FUNCTION public.is_appointment_confirmed(_appointment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = _appointment_id AND status = 'confirmed'
  )
$$;

-- ============================================
-- Triggers
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'patient')::app_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create wallet for professionals
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

CREATE TRIGGER on_role_created_wallet
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_professional_wallet();

-- ============================================
-- RLS Policies
-- ============================================

-- user_roles policies
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- profiles policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read verified professionals" ON public.profiles
  FOR SELECT TO authenticated
  USING (is_verified = true AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = profiles.user_id AND role = 'professional'
  ));

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_verified = (SELECT is_verified FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- verification_requests policies
CREATE POLICY "Professionals can read own verification" ON public.verification_requests
  FOR SELECT TO authenticated
  USING (professional_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Professionals can create verification request" ON public.verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'professional')
    AND professional_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage verifications" ON public.verification_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- availability_slots policies
CREATE POLICY "Anyone can read availability of verified professionals" ON public.availability_slots
  FOR SELECT TO authenticated
  USING (professional_id IN (SELECT id FROM public.profiles WHERE is_verified = true));

CREATE POLICY "Professionals can manage own slots" ON public.availability_slots
  FOR ALL TO authenticated
  USING (professional_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (professional_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- time_off_blocks policies
CREATE POLICY "Professionals can manage own time off" ON public.time_off_blocks
  FOR ALL TO authenticated
  USING (professional_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (professional_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can read time off" ON public.time_off_blocks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- appointments policies
CREATE POLICY "Users can read own appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR professional_id = auth.uid());

CREATE POLICY "Admins can read all appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients can create appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'patient')
    AND patient_id = auth.uid()
  );

CREATE POLICY "Participants can update appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (patient_id = auth.uid() OR professional_id = auth.uid());

CREATE POLICY "Admins can manage appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- messages policies
CREATE POLICY "Participants can read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_appointment_participant(appointment_id, auth.uid()));

CREATE POLICY "Participants can send messages in confirmed appointments" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_appointment_participant(appointment_id, auth.uid())
    AND public.is_appointment_confirmed(appointment_id)
  );

CREATE POLICY "Admins can read all messages" ON public.messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- transactions policies
CREATE POLICY "Users can read own transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR professional_id = auth.uid());

CREATE POLICY "Admins can manage transactions" ON public.transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- wallets policies
CREATE POLICY "Professionals can read own wallet" ON public.wallets
  FOR SELECT TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "Admins can manage wallets" ON public.wallets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- payout_requests policies
CREATE POLICY "Professionals can read own payouts" ON public.payout_requests
  FOR SELECT TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "Professionals can request payouts" ON public.payout_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'professional')
    AND professional_id = auth.uid()
  );

CREATE POLICY "Admins can manage payouts" ON public.payout_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Enable Realtime for messages
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
