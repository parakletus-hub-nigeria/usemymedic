import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) {
      return new Response(JSON.stringify({ error: "Paystack secret not configured" }), { status: 500, headers: corsHeaders });
    }

    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const hash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

    if (hash !== signature) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
    }

    const payload = JSON.parse(body);
    if (payload.event !== "charge.success") {
      return new Response(JSON.stringify({ message: "Ignored event" }), { status: 200, headers: corsHeaders });
    }

    const reference = payload.data.reference;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find transaction by reference
    const { data: txn, error: txnError } = await supabase
      .from("transactions")
      .select("*")
      .eq("paystack_reference", reference)
      .single();

    if (txnError || !txn) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), { status: 404, headers: corsHeaders });
    }

    // Update transaction status
    await supabase.from("transactions").update({ status: "success" }).eq("id", txn.id);

    // Credit professional wallet
    const { data: wallet } = await supabase.from("wallets").select("*").eq("professional_id", txn.professional_id).single();
    if (wallet) {
      await supabase.from("wallets").update({ balance: Number(wallet.balance) + Number(txn.net_amount) }).eq("id", wallet.id);
    }

    // Update appointment to confirmed
    if (txn.appointment_id) {
      await supabase.from("appointments").update({ status: "confirmed" }).eq("id", txn.appointment_id);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
