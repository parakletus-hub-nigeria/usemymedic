import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarDays, CheckCircle, Clock, Users } from "lucide-react";

const ProfessionalDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, completed: 0 });

  useEffect(() => {
    if (!user) return;

    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      setProfile(data);
      if (data) {
        supabase.from("verification_requests").select("status").eq("professional_id", data.id)
          .order("created_at", { ascending: false }).limit(1).single()
          .then(({ data: vr }) => setVerificationStatus(vr?.status ?? null));
      }
    });

    supabase.from("appointments").select("status").eq("professional_id", user.id).then(({ data }) => {
      const list = data ?? [];
      setStats({
        pending: list.filter(a => a.status === "pending").length,
        confirmed: list.filter(a => a.status === "confirmed").length,
        completed: list.filter(a => a.status === "completed").length,
      });
    });
  }, [user]);

  const showOnboarding = !profile?.is_profile_complete;
  const isPending = verificationStatus === "pending";
  const isVerified = profile?.is_verified;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {profile?.full_name || "Doctor"}
          </h1>
          <p className="text-muted-foreground">Your professional dashboard</p>
        </div>

        {/* Status banners */}
        {showOnboarding && (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900">Complete your profile</p>
                <p className="text-sm text-yellow-700">Submit your credentials for verification to start accepting patients.</p>
              </div>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <Link to="/professional/onboarding">Complete Profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {isPending && !isVerified && (
          <Card className="border-blue-300 bg-blue-50">
            <CardContent className="flex items-center gap-4 py-4">
              <Clock className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Verification Pending</p>
                <p className="text-sm text-blue-700">Your credentials are under review. You'll be notified once approved.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isVerified && (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="flex items-center gap-3 py-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="font-medium text-green-900">Verified Professional</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-yellow-100 p-3"><Clock className="h-6 w-6 text-yellow-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-accent/10 p-3"><CalendarDays className="h-6 w-6 text-accent" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-green-100 p-3"><CheckCircle className="h-6 w-6 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfessionalDashboard;
