
-- Fix 1: Payment expiry column for awaiting_payment state machine
ALTER TABLE public.appointments ADD COLUMN payment_expires_at timestamptz;

-- Fix 2: Payout rejection reason
ALTER TABLE public.payout_requests ADD COLUMN rejection_reason text;

-- Fix 3: Timezone for professionals
ALTER TABLE public.profiles ADD COLUMN timezone text NOT NULL DEFAULT 'Africa/Lagos';

-- Fix 5: Completed timestamp for chat grace period
ALTER TABLE public.appointments ADD COLUMN completed_at timestamptz;

-- Fix 5: New function for chat access (confirmed OR completed within 24hrs)
CREATE OR REPLACE FUNCTION public.is_chat_accessible(_appointment_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
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

-- Update messages INSERT policy to use is_chat_accessible instead of is_appointment_confirmed
DROP POLICY IF EXISTS "Participants can send messages in confirmed appointments" ON public.messages;
CREATE POLICY "Participants can send messages in accessible appointments"
ON public.messages
FOR INSERT
WITH CHECK (
  (sender_id = auth.uid())
  AND is_appointment_participant(appointment_id, auth.uid())
  AND is_chat_accessible(appointment_id)
);
