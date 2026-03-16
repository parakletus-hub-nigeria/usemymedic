

## Fix: Admin Login + Edge Function Build Errors

### 1. Insert missing admin data
Use the data insert tool to add the missing `profiles` and `user_roles` rows for user `47916a3c-d97f-4efa-b531-3f1bfcb9a1c2`:

```sql
INSERT INTO public.profiles (user_id, full_name, is_profile_complete, is_verified)
VALUES ('47916a3c-d97f-4efa-b531-3f1bfcb9a1c2', 'Super Admin', true, true)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('47916a3c-d97f-4efa-b531-3f1bfcb9a1c2', 'admin')
ON CONFLICT DO NOTHING;
```

### 2. Fix edge function build errors (4 errors)

**expire-unpaid-appointments/index.ts:**
- Line 45: `err` is `unknown` → cast to `(err as Error).message`

**paystack-webhook/index.ts:**
- Line 2: `createHmac` doesn't exist in `deno.land/std@0.224.0/crypto/mod.ts` → use Web Crypto API (`crypto.subtle`) with HMAC-SHA512 instead
- Line 77: `err` is `unknown` → cast to `(err as Error).message`

**process-payout/index.ts:**
- Line 89: `err` is `unknown` → cast to `(err as Error).message`

### 3. No schema or frontend changes needed
The `useAuth` hook and `Login.tsx` already correctly query `user_roles.role` — not `profiles.role`. The `has_role()` function is SECURITY DEFINER, preventing RLS recursion. No code changes needed for auth logic.

### Files Modified
- `supabase/functions/expire-unpaid-appointments/index.ts` — fix `unknown` error type
- `supabase/functions/paystack-webhook/index.ts` — replace `createHmac` with Web Crypto API, fix `unknown` error type
- `supabase/functions/process-payout/index.ts` — fix `unknown` error type

