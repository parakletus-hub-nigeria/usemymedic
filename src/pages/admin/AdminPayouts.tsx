import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Wallet } from "lucide-react";
import { format } from "date-fns";

const AdminPayouts = () => {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();

  const fetchPayouts = async () => {
    const { data } = await supabase.from("payout_requests").select("*").eq("status", "pending").order("requested_at");

    const proIds = [...new Set((data ?? []).map(p => p.professional_id))];
    let profileMap: Record<string, string> = {};
    if (proIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", proIds);
      profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.full_name]));
    }

    setPayouts((data ?? []).map(p => ({ ...p, professional_name: profileMap[p.professional_id] || "Unknown" })));
    setLoading(false);
  };

  useEffect(() => { fetchPayouts(); }, []);

  const markPaid = async (payout: any) => {
    const { error } = await supabase.functions.invoke("process-payout", {
      body: { payout_id: payout.id, action: "pay" },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payout marked as paid" });
      fetchPayouts();
    }
  };

  const rejectPayout = async (payout: any) => {
    if (!rejectReason.trim()) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }
    const { error } = await supabase.functions.invoke("process-payout", {
      body: { payout_id: payout.id, action: "reject", rejection_reason: rejectReason },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payout rejected, wallet refunded" });
      setRejectingId(null);
      setRejectReason("");
      fetchPayouts();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payout Queue</h1>
          <p className="text-muted-foreground">Process pending professional withdrawal requests</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : payouts.length === 0 ? (
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
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{p.professional_name}</p>
                      <p className="text-sm text-muted-foreground">
                        ₦{Number(p.amount).toLocaleString()} · Requested {format(new Date(p.requested_at), "PPP")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button className="bg-green-600 text-white hover:bg-green-700" onClick={() => markPaid(p)}>
                        <Check className="h-4 w-4 mr-2" /> Mark as Paid
                      </Button>
                      <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setRejectingId(rejectingId === p.id ? null : p.id)}>
                        <X className="h-4 w-4 mr-2" /> Reject
                      </Button>
                    </div>
                  </div>
                  {rejectingId === p.id && (
                    <div className="flex gap-2">
                      <Input placeholder="Rejection reason..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="flex-1" />
                      <Button variant="destructive" onClick={() => rejectPayout(p)}>Confirm Reject</Button>
                    </div>
                  )}
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
