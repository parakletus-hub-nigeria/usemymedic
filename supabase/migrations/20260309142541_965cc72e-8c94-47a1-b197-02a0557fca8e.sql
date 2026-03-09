
-- ============================================
-- Step 1: Drop ALL existing RESTRICTIVE policies
-- ============================================

-- profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read verified professionals" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;

-- appointments
DROP POLICY IF EXISTS "Admins can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can read all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Participants can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can read own appointments" ON public.appointments;

-- messages
DROP POLICY IF EXISTS "Admins can read all messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can read messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages in accessible appointments" ON public.messages;

-- payout_requests
DROP POLICY IF EXISTS "Admins can manage payouts" ON public.payout_requests;
DROP POLICY IF EXISTS "Professionals can read own payouts" ON public.payout_requests;
DROP POLICY IF EXISTS "Professionals can request payouts" ON public.payout_requests;

-- wallets
DROP POLICY IF EXISTS "Admins can manage wallets" ON public.wallets;
DROP POLICY IF EXISTS "Professionals can read own wallet" ON public.wallets;

-- transactions
DROP POLICY IF EXISTS "Admins can manage transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can read own transactions" ON public.transactions;

-- availability_slots
DROP POLICY IF EXISTS "Anyone can read availability of verified professionals" ON public.availability_slots;
DROP POLICY IF EXISTS "Professionals can manage own slots" ON public.availability_slots;

-- time_off_blocks
DROP POLICY IF EXISTS "Admins can read time off" ON public.time_off_blocks;
DROP POLICY IF EXISTS "Professionals can manage own time off" ON public.time_off_blocks;

-- verification_requests
DROP POLICY IF EXISTS "Admins can manage verifications" ON public.verification_requests;
DROP POLICY IF EXISTS "Professionals can create verification request" ON public.verification_requests;
DROP POLICY IF EXISTS "Professionals can read own verification" ON public.verification_requests;

-- ============================================
-- Step 2: Recreate ALL policies as PERMISSIVE
-- ============================================

-- profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can read verified professionals" ON public.profiles FOR SELECT TO authenticated USING (is_verified = true AND EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = profiles.user_id AND user_roles.role = 'professional'::app_role));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- appointments
CREATE POLICY "Admins can manage appointments" ON public.appointments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own appointments" ON public.appointments FOR SELECT TO authenticated USING (patient_id = auth.uid() OR professional_id = auth.uid());
CREATE POLICY "Participants can update appointments" ON public.appointments FOR UPDATE TO authenticated USING (patient_id = auth.uid() OR professional_id = auth.uid());
CREATE POLICY "Patients can create appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'patient'::app_role) AND patient_id = auth.uid());

-- messages
CREATE POLICY "Admins can read all messages" ON public.messages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Participants can read messages" ON public.messages FOR SELECT TO authenticated USING (is_appointment_participant(appointment_id, auth.uid()));
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND is_appointment_participant(appointment_id, auth.uid()) AND is_chat_accessible(appointment_id));

-- payout_requests
CREATE POLICY "Admins can manage payouts" ON public.payout_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Professionals can read own payouts" ON public.payout_requests FOR SELECT TO authenticated USING (professional_id = auth.uid());
CREATE POLICY "Professionals can request payouts" ON public.payout_requests FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'professional'::app_role) AND professional_id = auth.uid());

-- wallets
CREATE POLICY "Admins can manage wallets" ON public.wallets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Professionals can read own wallet" ON public.wallets FOR SELECT TO authenticated USING (professional_id = auth.uid());

-- transactions
CREATE POLICY "Admins can manage transactions" ON public.transactions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own transactions" ON public.transactions FOR SELECT TO authenticated USING (patient_id = auth.uid() OR professional_id = auth.uid());

-- availability_slots
CREATE POLICY "Anyone can read availability of verified professionals" ON public.availability_slots FOR SELECT TO authenticated USING (professional_id IN (SELECT profiles.id FROM profiles WHERE profiles.is_verified = true));
CREATE POLICY "Professionals can manage own slots" ON public.availability_slots FOR ALL TO authenticated USING (professional_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())) WITH CHECK (professional_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- time_off_blocks
CREATE POLICY "Admins can read time off" ON public.time_off_blocks FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Professionals can manage own time off" ON public.time_off_blocks FOR ALL TO authenticated USING (professional_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())) WITH CHECK (professional_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- verification_requests
CREATE POLICY "Admins can manage verifications" ON public.verification_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Professionals can create verification request" ON public.verification_requests FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'professional'::app_role) AND professional_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));
CREATE POLICY "Professionals can read own verification" ON public.verification_requests FOR SELECT TO authenticated USING (professional_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- ============================================
-- Step 3: Add triggers on auth.users
-- ============================================

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ============================================
-- Step 4: Add wallet trigger on user_roles
-- ============================================

CREATE OR REPLACE TRIGGER on_professional_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_professional_wallet();
