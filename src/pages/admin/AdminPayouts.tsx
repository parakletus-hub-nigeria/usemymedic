import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Wallet } from "lucide-react";
import { format } from "date-fns";

const AdminPayouts = () => {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayouts = async () => {
    const { data } = await supabase.from("payout_requests").select("*").eq("status", "pending").order("requested_at");
    setPayouts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPayouts(); }, []);

  const markPaid = async (payout: any) => {
    // Update payout
    await supabase.from("payout_requests").update({
      status: "paid",
      paid_at: new Date().toISOString(),
      processed_by: user?.id,
    }).eq("id", payout.id);

    // Deduct from wallet
    const { data: wallet } = await supabase.from("wallets").select("*").eq("professional_id", payout.professional_id).single();
    if (wallet) {
      await supabase.from("wallets").update({ balance: Number(wallet.balance) - Number(payout.amount) }).eq("id", wallet.id);
    }

    toast({ title: "Payout marked as paid" });
    fetchPayouts();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payout Queue</h1>
          <p className="text-muted-foreground">Process pending professional withdrawal requests</p>
        </div>

        {loading ? <p className="text-muted-foreground">Loading...</p> :
          payouts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No pending payout requests.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {payouts.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">₦{Number(p.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested {format(new Date(p.requested_at), "PPP")} · Professional: {p.professional_id.slice(0, 8)}...
                      </p>
                    </div>
                    <Button className="bg-green-600 text-white hover:bg-green-700" onClick={() => markPaid(p)}>
                      <Check className="h-4 w-4 mr-2" /> Mark as Paid
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>
    </DashboardLayout>
  );
};

export default AdminPayouts;
