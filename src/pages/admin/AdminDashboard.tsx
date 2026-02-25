import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, DollarSign, BadgeCheck } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, appointments: 0, pendingVerifications: 0, revenue: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [profiles, appointments, verifications, transactions] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("appointments").select("id", { count: "exact" }),
        supabase.from("verification_requests").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("transactions").select("amount").eq("status", "success"),
      ]);

      const totalRevenue = (transactions.data ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

      setStats({
        users: profiles.count ?? 0,
        appointments: appointments.count ?? 0,
        pendingVerifications: verifications.count ?? 0,
        revenue: totalRevenue,
      });
    };
    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-accent/10 p-3"><Users className="h-6 w-6 text-accent" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.users}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-accent/10 p-3"><CalendarDays className="h-6 w-6 text-accent" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.appointments}</p>
                <p className="text-sm text-muted-foreground">Appointments</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-yellow-100 p-3"><BadgeCheck className="h-6 w-6 text-yellow-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingVerifications}</p>
                <p className="text-sm text-muted-foreground">Pending Verifications</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-green-100 p-3"><DollarSign className="h-6 w-6 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">₦{stats.revenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
