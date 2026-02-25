import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Wallet } from "lucide-react";

const AdminFinance = () => {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPlatformFees, setTotalPlatformFees] = useState(0);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: txns } = await supabase.from("transactions").select("*").eq("status", "success");
      const revenue = (txns ?? []).reduce((s, t) => s + Number(t.amount), 0);
      const fees = (txns ?? []).reduce((s, t) => s + Number(t.platform_fee), 0);
      setTotalRevenue(revenue);
      setTotalPlatformFees(fees);

      const { data: w } = await supabase.from("wallets").select("*");
      const proIds = [...new Set((w ?? []).map(w => w.professional_id))];
      let profileMap: Record<string, string> = {};
      if (proIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", proIds);
        profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.full_name]));
      }
      setWallets((w ?? []).map(wallet => ({ ...wallet, professional_name: profileMap[wallet.professional_id] || "Unknown" })));
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
          <p className="text-muted-foreground">Platform financial overview</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <DollarSign className="h-6 w-6 text-accent mb-2" />
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <DollarSign className="h-6 w-6 text-green-600 mb-2" />
              <p className="text-sm text-muted-foreground">Platform Fees Earned</p>
              <p className="text-2xl font-bold">₦{totalPlatformFees.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Wallet className="h-6 w-6 text-blue-600 mb-2" />
              <p className="text-sm text-muted-foreground">Professional Wallets</p>
              <p className="text-2xl font-bold">{wallets.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Professional Wallet Balances</CardTitle></CardHeader>
          <CardContent>
            {wallets.length === 0 ? <p className="text-sm text-muted-foreground">No wallets yet.</p> : (
              <div className="space-y-2">
                {wallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-lg border p-3">
                    <p className="text-sm font-medium text-foreground">{w.professional_name}</p>
                    <p className="font-semibold">₦{Number(w.balance).toLocaleString()}</p>
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

export default AdminFinance;
