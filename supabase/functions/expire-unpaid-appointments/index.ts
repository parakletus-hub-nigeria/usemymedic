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

    // Find all awaiting_payment appointments past their expiry
    const { data: expired, error } = await supabase
      .from("appointments")
      .select("id")
      .eq("status", "awaiting_payment")
      .lt("payment_expires_at", new Date().toISOString());

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    const ids = (expired ?? []).map((a: any) => a.id);

    if (ids.length > 0) {
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .in("id", ids);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ cancelled: ids.length }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
