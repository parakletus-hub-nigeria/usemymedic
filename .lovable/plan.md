

# Comprehensive E2E Audit — MyMedic Platform

## Critical Findings

### Bug 1: Stale Backend Connection (BLOCKER)
`src/integrations/supabase/client.ts` has hardcoded fallback credentials pointing to an old instance (`gxfhgsucjarflwpshfcm`). The `.env` file points to the correct Lovable Cloud instance (`onwoeygmqkogxynvftcy`). If env vars fail to load, all API calls go to the wrong backend. The file also has a comment saying "MANUALLY OVERRIDDEN – do not let auto-sync revert this file" which prevents auto-correction.

**Fix:** Remove the stale fallbacks and the manual override comment. Let it use only env vars (which are always available in the build).

### Bug 2: All RLS Policies Are RESTRICTIVE (BLOCKER)
Every single RLS policy on every table is marked `Permissive: No` (i.e., RESTRICTIVE). In PostgreSQL, RESTRICTIVE policies require ALL of them to pass for a given command. This means for `profiles` SELECT, a user must simultaneously satisfy:
- `user_id = auth.uid()` AND
- `has_role(auth.uid(), 'admin')` AND
- `is_verified = true AND EXISTS(user_roles...)`

This is impossible for any non-admin user. A patient can never read their own profile because the admin policy also applies and blocks them. Same problem affects `appointments`, `messages`, etc.

**Fix:** Database migration to drop all RESTRICTIVE policies and recreate them as PERMISSIVE (the default). Permissive policies use OR logic — any one matching policy grants access.

### Bug 3: Missing Database Triggers
The `handle_new_user()` and `handle_new_user_role()` functions exist but have no triggers attached. New user signups will NOT get profile rows or role assignments, breaking the entire post-registration flow.

**Fix:** Create triggers on `auth.users` for AFTER INSERT.

### Bug 4: `profiles` Table Missing INSERT Policy
The profiles table has no INSERT policy (`Can't INSERT records`). Even if the trigger fires (once fixed), it uses SECURITY DEFINER so it bypasses RLS. But any direct client insert would fail. The trigger approach is correct here — no code change needed, just the trigger attachment.

### Bug 5: Admin Bypass Uses Hardcoded Credentials (SECURITY)
`Login.tsx` has plaintext `email === "mymedicng@gmail.com" && password === "60647065@Medic"` with `localStorage`-based admin bypass. This is a critical security vulnerability — anyone reading the source code gets admin access.

**Fix:** Remove the hardcoded bypass entirely. The admin user exists in the database with proper `user_roles` entry. Normal auth flow should work once RLS is fixed.

### Bug 6: `isCooldown` Type Mismatch
In `ProfessionalWallet.tsx` line 27: `const isCooldown = cooldownEnd && isAfter(cooldownEnd, new Date())` returns `Date | false | null` rather than `boolean`. The `disabled` prop on the Button expects boolean. This can cause React warnings.

**Fix:** Add explicit boolean cast: `!!cooldownEnd && isAfter(cooldownEnd, new Date())`.

### Bug 7: `availability_slots` RLS References `profiles.id` Not `profiles.user_id`
The "Anyone can read availability" policy checks `professional_id IN (SELECT profiles.id FROM profiles WHERE is_verified = true)`. The "Professionals can manage own slots" policy checks `professional_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())`. This uses `profiles.id` (the profile row UUID) as the `professional_id` — but `appointments` uses `professional_id = user_id`. This mismatch means `ProfessionalProfile.tsx` inserts appointments with `professional_id: profile.user_id` but the booking page fetches slots by `professional_id: profile.id`. These are different UUIDs, causing slot lookups to potentially fail or show wrong data.

**Fix:** The booking flow in `ProfessionalProfile.tsx` line 134 correctly uses `profile.user_id` for the appointment. But the availability_slots and time_off_blocks use `profile.id`. This is a design inconsistency — appointments reference `user_id` while availability/time-off reference `profile.id`. The fetch on line 37 uses `id` as the professional_id for slots, which is correct for that table. The insert on line 134 uses `profile.user_id`. So the data model is split: slots key off `profile.id`, appointments key off `profile.user_id`. This is confusing but functionally correct as long as the code is consistent. No code change needed, but the professional dashboard's appointment query at line 29 uses `user.id` which equals `profile.user_id`, so it correctly finds appointments.

---

## Implementation Plan

### Step 1: Database Migration — Fix RLS Policies + Add Triggers

Single migration to:
1. Drop all RESTRICTIVE policies on all 8 tables
2. Recreate them as PERMISSIVE (default) with identical logic
3. Attach triggers for `handle_new_user` and `handle_new_user_role` on `auth.users` AFTER INSERT
4. Add INSERT policy for `profiles` (the trigger uses SECURITY DEFINER, but having a policy for the trigger's function schema is good practice)

### Step 2: Fix `client.ts` — Remove Stale Fallbacks

Remove the manual override comment and stale hardcoded URLs. Use only env vars.

### Step 3: Remove Admin Bypass — Security Fix

Remove the hardcoded credential check from `Login.tsx` and the `forceAdminAuth` function from `useAuth.tsx`. Remove all `localStorage` bypass logic. The admin should authenticate through normal auth flow.

### Step 4: Fix `isCooldown` Type

Cast to boolean in `ProfessionalWallet.tsx`.

---

## Files Modified

```text
Database migration (new)     — Fix all RLS policies from RESTRICTIVE to PERMISSIVE + add triggers
src/integrations/supabase/client.ts — Remove stale fallback URLs
src/pages/auth/Login.tsx            — Remove hardcoded admin bypass
src/hooks/useAuth.tsx               — Remove forceAdminAuth and localStorage bypass
src/components/auth/ProtectedRoute.tsx — Remove VITE_BYPASS_ADMIN_AUTH check
src/pages/professional/ProfessionalWallet.tsx — Fix isCooldown type
```

### What This Fixes End-to-End

After these changes:
- New user registration → trigger creates profile + role → user can log in and see their dashboard
- Admin login via normal auth → role fetched from `user_roles` → routed to `/admin/dashboard`
- Patient can read their own profile, book appointments, view messages
- Professional can manage their schedule, appointments, and wallet
- All API calls go to the correct backend instance

