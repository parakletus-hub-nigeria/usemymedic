import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { payout_id } = await req.json();
    if (!payout_id) {
      return new Response(JSON.stringify({ error: "payout_id required" }), { status: 400, headers: corsHeaders });
    }

    // Get payout
    const { data: payout, error: payoutErr } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("id", payout_id)
      .eq("status", "pending")
      .single();

    if (payoutErr || !payout) {
      return new Response(JSON.stringify({ error: "Payout not found or already processed" }), { status: 404, headers: corsHeaders });
    }

    // Mark paid
    await supabase.from("payout_requests").update({
      status: "paid",
      paid_at: new Date().toISOString(),
      processed_by: user.id,
    }).eq("id", payout_id);

    // Deduct wallet
    const { data: wallet } = await supabase.from("wallets").select("*").eq("professional_id", payout.professional_id).single();
    if (wallet) {
      await supabase.from("wallets").update({
        balance: Math.max(0, Number(wallet.balance) - Number(payout.amount)),
      }).eq("id", wallet.id);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
