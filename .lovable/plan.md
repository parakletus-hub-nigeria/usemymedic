

# E2E Debugging Audit — MyMedic Platform

## Current State Summary

The codebase and database are in much better shape after prior fixes. Here is what I found:

---

## Issue 1: 5 Orphaned Users — No Profiles or Roles (BLOCKER)

Five users registered before the database triggers were attached. They have no `profiles` or `user_roles` rows, which means:
- They cannot log in successfully (role fetch returns null → stuck on "Verifying access..." spinner)
- They cannot access any dashboard

**Users affected:**
| Email | Role (from metadata) |
|---|---|
| graceudeh02@gmail.com | professional |
| paralearn.io@gmail.com | professional |
| olaolajumokefavour@gmail.com | professional |
| editor.ijsds@gmail.com | patient |
| evander.ikechukwu@gmail.com | professional |

**Fix:** Run a migration to backfill `profiles` and `user_roles` for these 5 users using their `raw_user_meta_data`.

---

## Issue 2: `ProtectedRoute` Infinite Spinner When Role is Null

When `role === null` and `allowedRoles` is set, `ProtectedRoute` shows "Verifying access..." forever. This happens when a user exists in `auth.users` but has no `user_roles` row.

**Fix:** Add a timeout or fallback — after role fetch completes with null, redirect to login with an error message instead of spinning indefinitely. The `useAuth` hook sets `loading = false` after fetch, so the issue is that `role` is null but `user` exists. The current code (line 27-36) catches this case and shows a spinner forever.

**Fix:** Change `ProtectedRoute` so that when `loading` is false, `user` exists, but `role` is null, it redirects to `/login` with a toast explaining the issue.

---

## Issue 3: `ProfessionalProfile` — Appointment Query Mismatch

In `ProfessionalProfile.tsx`:
- Line 40: Fetches existing appointments with `.eq("professional_id", id)` where `id` is `profiles.id`
- Line 134: Inserts appointment with `professional_id: profile.user_id`

These are different UUIDs. The appointment fetch on the booking page uses `profiles.id`, but the actual appointment stores `profile.user_id`. This means:
- The slot-blocking logic (line 105-109) will never find existing appointments, allowing **double bookings**
- The professional's dashboard (which queries by `user.id` = `user_id`) will correctly show the appointment

**Fix:** Change line 40 to query appointments by `profile.user_id` instead of `id` (the route param is `profiles.id`, but we need to use `profile.user_id` for appointment lookups). This requires fetching the profile first, then using its `user_id`.

---

## Issue 4: `availability_slots` RLS — Uses `profiles.id` as Professional ID

The `availability_slots` and `time_off_blocks` tables use `profiles.id` as `professional_id`, while `appointments` uses `profiles.user_id`. This is a conscious design choice in the schema but creates confusion. The RLS policies correctly reference `profiles.id` for these tables. No change needed here — the code in `ProfessionalSchedule.tsx` correctly fetches `profile.id` and uses it for slot operations.

---

## Issue 5: Missing `profiles` INSERT RLS Policy

The `profiles` table has no INSERT policy. The `handle_new_user` trigger uses `SECURITY DEFINER` so it bypasses RLS. However, if the trigger ever fails or if we need to manually create profiles, inserts will be blocked. The backfill migration (Issue 1) should also use a direct SQL insert which bypasses RLS.

No frontend code change needed, but the migration should handle this.

---

## Issue 6: "Learn More" Link Points to `/about` (404)

On the landing page (line 196), the "Learn More" button links to `/about` which has no route defined — it will hit the `NotFound` page.

**Fix:** Change to `/register` or remove the link.

---

## Implementation Plan

### Step 1: Database Migration — Backfill Orphaned Users
Insert `profiles` and `user_roles` for 5 orphaned users using their metadata.

### Step 2: Fix `ProtectedRoute` — Handle Null Role Gracefully
When loading is done and user exists but role is null, redirect to `/login` with an error toast instead of spinning forever.

### Step 3: Fix `ProfessionalProfile` — Appointment Query
Change the appointment fetch to use `profile.user_id` (fetched from the profile query) instead of the route param `id` (which is `profiles.id`). This prevents double bookings.

### Step 4: Fix Landing Page Dead Link
Change `/about` to `/register` or `/#features`.

---

## Files Modified

```text
Database migration (new)                    — Backfill 5 orphaned users
src/components/auth/ProtectedRoute.tsx      — Redirect on null role instead of infinite spinner
src/pages/patient/ProfessionalProfile.tsx   — Fix appointment query to use user_id
src/pages/Index.tsx                         — Fix dead /about link
```

