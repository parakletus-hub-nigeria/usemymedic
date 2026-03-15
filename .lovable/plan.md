

# Fix: Blank Page on Published Site

## Root Cause

`src/integrations/supabase/client.ts` reads `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with no fallback values. The preview injects these from `.env`, but the published build may not have them available, causing `createClient(undefined, undefined)` to throw — crashing the app before any UI renders.

**Important note:** This file is auto-generated and should not be manually edited. The previous edit that removed the hardcoded fallbacks (which pointed to the correct instance) may have caused this regression. The correct fix is to **re-publish the project** so the build picks up the current `.env` values.

## Fix

Since `src/integrations/supabase/client.ts` is auto-generated and should not be edited, the solution is to **re-publish the project**. The current `.env` file has the correct values — the published build just needs to be rebuilt with them.

If re-publishing doesn't resolve the issue (because the auto-generated `client.ts` still lacks fallbacks), then we add safe fallback values to `client.ts` pointing to the correct Lovable Cloud instance (`onwoeygmqkogxynvftcy`):

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://onwoeygmqkogxynvftcy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "eyJhbGci...";
```

## Recommendation

**Try re-publishing first** using the Share button in the top-right corner. If the blank page persists after re-publish, approve this plan and I will add the fallbacks.

## Files Modified

```
src/integrations/supabase/client.ts — Add fallback values for env vars
```

