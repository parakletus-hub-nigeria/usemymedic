

# MyMedic — Remaining Implementation Gap Analysis & Plan

## Current State Assessment

After thorough review of all pages, database schema, edge functions, and routing, here is what has been completed and what remains:

### Completed (Items 1-3 + scaffolding of 4-6)
- Design system with brand tokens, Inter font, layout components
- Auth flow: Register (with role selector), Login, Forgot Password, Reset Password, role-based ProtectedRoute
- Database schema: All 10 tables with RLS policies and helper functions (`has_role`, `is_appointment_participant`, `is_appointment_confirmed`)
- Scaffold pages for all three dashboards with basic data fetching

### Critical Gaps Found

**1. Database Triggers Not Attached**
The functions `handle_new_user`, `handle_new_user_role`, `handle_professional_wallet`, and `update_updated_at_column` exist but the database reports **zero triggers**. Registration will fail silently — no profile, no role, no wallet gets created.

**2. Professional Profile Detail Page + Booking Flow (Missing entirely)**
- No `/patient/professional/:id` route or page exists
- Patients cannot view a professional's full profile, see available time slots, or request an appointment
- The "View Profile" button on DiscoverProfessionals links to a non-existent route

**3. Real-Time Secure Messaging (Placeholder only)**
- Both `PatientMessages.tsx` and `ProfessionalMessages.tsx` are empty placeholder screens
- No message sending/receiving, no appointment-scoped chat threads, no Realtime subscription
- Messages table exists but Realtime publication is not enabled

**4. Paystack Integration (Not started)**
- No `paystack-webhook` edge function
- No checkout UI or payment trigger after professional confirms an appointment
- No `process-payout` edge function for admin-triggered payouts

**5. Google Calendar .ics Generation (Not started)**
- No .ics file generation for confirmed appointments

**6. Missing UI polish items**
- Patient appointments list doesn't show professional name (only raw data)
- Admin finance/payouts show truncated UUIDs instead of professional names
- No consultation notes UI on appointment detail
- No meet link sharing in chat

---

## Implementation Plan

### Phase A: Fix Database Triggers (Critical — auth is broken without this)
Create a migration to attach all four triggers:
- `on_auth_user_created` → calls `handle_new_user()` (creates profile)
- `on_auth_user_created_role` → calls `handle_new_user_role()` (assigns role)
- `on_user_role_created` → calls `handle_professional_wallet()` (creates wallet for professionals)
- `on_updated_at` → calls `update_updated_at_column()` on profiles, wallets, appointments

### Phase B: Professional Profile + Booking Flow
**New file:** `src/pages/patient/ProfessionalProfile.tsx`
- Fetches professional profile by ID
- Displays bio, specialty, years of experience, consultation fee, verified badge
- Shows available time slots from `availability_slots` table, rendered as a calendar/date picker
- Excludes slots that overlap with existing appointments or time-off blocks
- "Request Appointment" button creates an appointment with status `pending`

**New route:** `/patient/professional/:id` added to `App.tsx`

### Phase C: Real-Time Secure Messaging
**New component:** `src/components/chat/SecureChat.tsx`
- Takes an `appointmentId` prop
- Fetches messages for the appointment, subscribes to Realtime inserts
- Input field to send messages (only if appointment is confirmed)
- Displays sender name, timestamp, message content
- Professional can paste a Google Meet link which renders as a clickable card

**Enable Realtime:** Migration to add `messages` table to `supabase_realtime` publication

**Update:** Both `PatientMessages.tsx` and `ProfessionalMessages.tsx` to:
- List confirmed appointments as chat threads
- Open `SecureChat` component for selected appointment

### Phase D: Paystack Integration
**New edge function:** `supabase/functions/paystack-webhook/index.ts`
- Validates Paystack webhook signature
- On `charge.success`: updates transaction status to `success`, credits professional wallet (amount minus platform fee), updates appointment to `confirmed`
- Requires `PAYSTACK_SECRET_KEY` secret

**New edge function:** `supabase/functions/process-payout/index.ts`
- Admin-triggered: validates admin role, marks payout as `paid`, deducts wallet balance

**Payment UI:** Add a Paystack inline checkout component triggered when a patient needs to pay for a confirmed appointment

### Phase E: Google Calendar .ics Generation
**New utility:** `src/lib/ics.ts`
- Function to generate `.ics` file content from appointment data
- Download button on confirmed appointments in both patient and professional views

### Phase F: UI Polish & Data Enrichment
- Join professional names into patient appointment cards
- Join professional names into admin finance/payout views
- Add consultation notes textarea on professional appointment detail
- Add meet link field on professional confirmed appointment cards
- Mobile responsiveness pass on all dashboard pages
- Loading skeletons instead of plain text loading states
- Error boundary handling

---

## Technical Details

### Migration SQL for Triggers (Phase A)
```text
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_role  
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE TRIGGER on_user_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_professional_wallet();

-- updated_at triggers on relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### Realtime Migration (Phase C)
```text
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

### New Files Created
```text
src/pages/patient/ProfessionalProfile.tsx    — Profile + booking page
src/components/chat/SecureChat.tsx            — Realtime chat component
src/lib/ics.ts                               — .ics calendar file generator
supabase/functions/paystack-webhook/index.ts — Payment webhook
supabase/functions/process-payout/index.ts   — Payout processor
```

### Files Modified
```text
src/App.tsx                                  — Add /patient/professional/:id route
src/pages/patient/PatientMessages.tsx        — Full chat thread UI
src/pages/professional/ProfessionalMessages.tsx — Full chat thread UI
src/pages/patient/PatientAppointments.tsx    — Add pro name, .ics download
src/pages/professional/ProfessionalAppointments.tsx — Add notes, meet link, patient name
src/pages/admin/AdminFinance.tsx             — Show professional names
src/pages/admin/AdminPayouts.tsx             — Show professional names
```

### Implementation Order
1. Phase A first (triggers) — without this, no new user can register successfully
2. Phase B (profile + booking) — core patient flow completion
3. Phase C (messaging) — enables consultation delivery
4. Phase D (Paystack) — requires secret key from user, will prompt
5. Phase E (.ics) — quick utility addition
6. Phase F (polish) — woven throughout

This is a large implementation spanning multiple files. I will execute it in batches, starting with the critical trigger fix and the professional profile/booking page.

