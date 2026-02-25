

# Bug Fixes & Robustness Patches — Implementation Plan

Six targeted fixes addressing state machine gaps, financial logic errors, timezone handling, chat lifecycle, and UX guards.

---

## Fix 1: Abandoned Booking — AWAITING_PAYMENT State Machine (Critical)

**Problem:** Professional accepts → status jumps straight to CONFIRMED before payment. Patient never pays → slot permanently blocked.

**Solution:**

### Database Changes
- Add `payment_expires_at` column (timestamptz, nullable) to `appointments` table
- Update the professional accept flow to set status to `awaiting_payment` instead of `confirmed`, and set `payment_expires_at = now() + 15 minutes`
- The Paystack webhook already transitions to `confirmed` on payment success — no change needed there

### New Edge Function: `expire-unpaid-appointments`
- Queries appointments WHERE `status = 'awaiting_payment'` AND `payment_expires_at < now()`
- Sets those to `cancelled`
- Runs on a cron schedule every 2 minutes via `pg_cron` + `pg_net`

### Frontend Changes
- **ProfessionalAppointments.tsx**: When professional clicks "Accept", set status to `awaiting_payment` instead of `confirmed`
- **PatientAppointments.tsx**: Show `awaiting_payment` status with a countdown timer and "Pay Now" button
- **ProfessionalProfile.tsx**: Exclude `awaiting_payment` appointments from slot blocking (they're soft-locked but will auto-cancel)
- Add `awaiting_payment` to statusColors maps

### Calendar Slot Logic
- `awaiting_payment` appointments DO block the slot for 15 minutes (included in overlap check)
- After expiry, the cron function cancels them and the slot frees up

---

## Fix 2: Payout Lockout Trap (High)

**Problem:** Cooldown triggers on ANY payout request regardless of outcome. Rejected payouts lock professionals out for 7 days.

**Solution:**

### Database Changes
- Add `rejection_reason` column (text, nullable) to `payout_requests` table

### Frontend Changes — ProfessionalWallet.tsx
- Change cooldown logic: only count the last payout with `status = 'paid'` (not all payouts)
- Current: `const lastPayout = payouts[0]` — checks most recent regardless of status
- Fixed: `const lastPaidPayout = payouts.find(p => p.status === 'paid')`
- Show rejected payouts with a red badge and the rejection reason

### Frontend Changes — AdminPayouts.tsx
- Add a "Reject" button alongside "Mark as Paid"
- Rejection flow: set status to `rejected`, refund the wallet balance (add amount back), and store rejection reason
- Show a text input for rejection reason before confirming

### Edge Function — process-payout
- Already handles the "paid" path; add a "rejected" path that refunds wallet balance

---

## Fix 3: Timezone Collision (High)

**Problem:** Times stored as local strings; no timezone awareness. Users in different timezones see wrong appointment times.

**Analysis of current state:**
- `appointments.scheduled_at` is already `timestamptz` — this is correct and stores UTC
- `availability_slots` uses `time without time zone` for `start_time`/`end_time` — these are intentionally timezone-agnostic (they represent the professional's recurring weekly schedule in their local time)
- The real bug is in the **frontend**: `ProfessionalProfile.tsx` constructs the `scheduledAt` date using `setHours(h, m)` from the slot's local time, but doesn't account for the professional's timezone

**Solution:**
- Add a `timezone` column (text, default `'Africa/Lagos'`) to `profiles` table
- Professional settings page gets a timezone selector
- When booking: the frontend reads the professional's timezone from their profile. The slot time (e.g., "09:00") is interpreted as being in that timezone, then converted to UTC before inserting into `appointments.scheduled_at`
- When displaying: the frontend converts `scheduled_at` from UTC to the viewer's local timezone using `Intl.DateTimeFormat` or `date-fns-tz`
- For MVP scope, we use the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` for display and the professional's stored timezone for booking conversion

---

## Fix 4: Google Calendar Cancellation (Medium)

**Analysis:** The current implementation uses client-side `.ics` file downloads — there is no server-side Google Calendar API integration. The `.ics` download is a one-time action; there's no stored calendar event ID to delete.

**Pragmatic Solution (no Google API key required):**
- When an appointment is cancelled, generate a cancellation `.ics` file (with `METHOD:CANCEL` and matching `UID`) that the user can import to remove the event
- Add a "Download Cancellation" button on cancelled appointments
- Update `src/lib/ics.ts` to support cancellation events

**Why not full Google Calendar API:** It would require OAuth consent screen setup, Google Cloud project, and per-user token management — far beyond MVP scope. The `.ics` cancellation method is the standard approach used by most booking platforms.

---

## Fix 5: Chat Gatekeeper — 24-Hour Grace Period (Medium)

**Problem:** Chat only accessible for `confirmed` appointments. Once completed, chat locks immediately — professional can't send post-care notes.

**Solution:**

### Database Changes
- Add `completed_at` column (timestamptz, nullable) to `appointments`
- When status changes to `completed`, set `completed_at = now()`

### RLS Policy Update
- Modify the `is_appointment_confirmed` function (or create a new `is_chat_accessible` function) to return true if:
  - Status is `confirmed`, OR
  - Status is `completed` AND `completed_at > now() - interval '24 hours'`

### Frontend Changes
- **SecureChat.tsx**: Accept a `readOnly` prop. When the appointment is completed and past the 24-hour window, show messages but disable the input
- **PatientMessages.tsx / ProfessionalMessages.tsx**: Include `completed` appointments in the thread list (not just `confirmed`). Pass `readOnly` flag based on the 24-hour check
- Show a banner: "This chat is read-only. The 24-hour post-consultation window has closed."

---

## Fix 6: Zero-Balance Payout Guard (Low/UX)

**Current state:** Already fixed! The wallet page at line 78 already has:
```tsx
disabled={loading || isCooldown || !wallet || Number(wallet?.balance) <= 0}
```
This correctly disables the button when balance is zero. No changes needed.

---

## Technical Details

### Migration SQL
```text
-- Fix 1: Payment expiry
ALTER TABLE appointments ADD COLUMN payment_expires_at timestamptz;

-- Fix 2: Payout rejection
ALTER TABLE payout_requests ADD COLUMN rejection_reason text;

-- Fix 3: Timezone
ALTER TABLE profiles ADD COLUMN timezone text NOT NULL DEFAULT 'Africa/Lagos';

-- Fix 5: Completed timestamp
ALTER TABLE appointments ADD COLUMN completed_at timestamptz;

-- Fix 5: Updated chat access function
CREATE OR REPLACE FUNCTION public.is_chat_accessible(_appointment_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = _appointment_id
    AND (
      status = 'confirmed'
      OR (status = 'completed' AND completed_at > now() - interval '24 hours')
    )
  )
$$;

-- Update RLS policy on messages to use new function
-- (drop old INSERT policy, recreate with is_chat_accessible)
```

### New Edge Function
```text
supabase/functions/expire-unpaid-appointments/index.ts
```
- Called by pg_cron every 2 minutes
- Queries and cancels expired `awaiting_payment` appointments

### Cron Setup (via insert tool, not migration)
```text
pg_cron job: every 2 minutes → HTTP POST to expire-unpaid-appointments
```

### Files Modified
```text
src/pages/professional/ProfessionalAppointments.tsx  — awaiting_payment status
src/pages/patient/PatientAppointments.tsx             — pay now button, countdown
src/pages/patient/ProfessionalProfile.tsx             — slot blocking for awaiting_payment
src/pages/professional/ProfessionalWallet.tsx         — cooldown only on paid
src/pages/admin/AdminPayouts.tsx                      — reject button + reason
src/pages/patient/PatientMessages.tsx                 — include completed threads
src/pages/professional/ProfessionalMessages.tsx       — include completed threads
src/components/chat/SecureChat.tsx                    — readOnly mode
src/lib/ics.ts                                       — cancellation support
src/pages/professional/ProfessionalSettings.tsx       — timezone selector
supabase/functions/process-payout/index.ts            — rejection path
```

### Implementation Order
1. Database migration (all schema changes in one migration)
2. Edge function: `expire-unpaid-appointments` + cron setup
3. Fix 1 frontend (awaiting_payment state machine)
4. Fix 2 frontend (payout rejection flow)
5. Fix 3 frontend (timezone handling)
6. Fix 4 (ics cancellation support)
7. Fix 5 frontend (chat grace period)

