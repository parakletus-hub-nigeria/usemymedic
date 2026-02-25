import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wallet, ArrowUpRight, Clock } from "lucide-react";
import { format, addDays, isAfter } from "date-fns";

const ProfessionalWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("*").eq("professional_id", user.id).single().then(({ data }) => setWallet(data));
    supabase.from("payout_requests").select("*").eq("professional_id", user.id).order("requested_at", { ascending: false }).then(({ data }) => setPayouts(data ?? []));
  }, [user]);

  // Fix 2: Only apply cooldown on PAID payouts
  const lastPaidPayout = payouts.find(p => p.status === "paid");
  const cooldownEnd = lastPaidPayout ? addDays(new Date(lastPaidPayout.requested_at), 7) : null;
  const isCooldown = cooldownEnd && isAfter(cooldownEnd, new Date());

  const requestPayout = async () => {
    if (!user || !wallet) return;
    setLoading(true);
    const { error } = await supabase.from("payout_requests").insert({
      professional_id: user.id,
      amount: wallet.balance,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payout requested!" });
      const { data } = await supabase.from("payout_requests").select("*").eq("professional_id", user.id).order("requested_at", { ascending: false });
      setPayouts(data ?? []);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      default: return "bg-yellow-100 text-yellow-700";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <p className="text-muted-foreground">Your earnings and payout history</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="h-6 w-6 text-accent" />
                <span className="text-sm font-medium text-primary-foreground/70">Available Balance</span>
              </div>
              <p className="text-3xl font-bold">₦{Number(wallet?.balance ?? 0).toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex flex-col justify-between h-full">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Request Payout</p>
                {isCooldown && cooldownEnd && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 mb-2">
                    <Clock className="h-4 w-4" />
                    Cooldown until {format(cooldownEnd, "PPP")}
                  </div>
                )}
              </div>
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 mt-2"
                disabled={loading || isCooldown || !wallet || Number(wallet?.balance) <= 0}
                onClick={requestPayout}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                {loading ? "Requesting..." : "Request Payout"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Payout History</CardTitle></CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payout requests yet.</p>
            ) : (
              <div className="space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">₦{Number(p.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(p.requested_at), "PPP")}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${statusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </div>
                    {p.status === "rejected" && p.rejection_reason && (
                      <p className="text-xs text-red-600">Reason: {p.rejection_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfessionalWallet;
