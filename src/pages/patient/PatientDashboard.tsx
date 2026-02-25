import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CalendarDays, Search, Clock, CheckCircle } from "lucide-react";

const PatientDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [upcomingCount, setUpcomingCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setProfile(data));

    supabase
      .from("appointments")
      .select("id", { count: "exact" })
      .eq("patient_id", user.id)
      .in("status", ["pending", "confirmed"])
      .then(({ count }) => setUpcomingCount(count ?? 0));
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.full_name || "Patient"}
          </h1>
          <p className="text-muted-foreground">Manage your healthcare from one place</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-accent/10 p-3">
                <CalendarDays className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingCount}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-accent/10 p-3">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-accent/10 p-3">
                <CheckCircle className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="pt-6">
              <Search className="h-6 w-6 text-accent mb-2" />
              <h3 className="font-semibold text-foreground">Find a Doctor</h3>
              <p className="text-sm text-muted-foreground mb-3">Browse verified professionals</p>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <Link to="/patient/discover">Browse</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No appointments yet. Start by finding a doctor!</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PatientDashboard;
