import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInSeconds } from "date-fns";
import { CalendarDays, Download, CreditCard } from "lucide-react";
import { downloadIcs } from "@/lib/ics";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  awaiting_payment: "bg-orange-100 text-orange-800",
  confirmed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const PatientAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Tick every second for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchAppts = async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", user.id)
        .order("scheduled_at", { ascending: false });

      const proIds = [...new Set((data ?? []).map(a => a.professional_id))];
      let profileMap: Record<string, string> = {};
      if (proIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", proIds);
        profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.full_name]));
      }

      setAppointments((data ?? []).map(a => ({ ...a, professional_name: profileMap[a.professional_id] || "Doctor" })));
      setLoading(false);
    };
    fetchAppts();
  }, [user]);

  const formatCountdown = (expiresAt: string) => {
    const secs = differenceInSeconds(new Date(expiresAt), now);
    if (secs <= 0) return "Expired";
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${String(s).padStart(2, "0")}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Appointments</h1>
          <p className="text-muted-foreground">View and manage your appointments</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : appointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No appointments yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <Card key={apt.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{apt.professional_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(apt.scheduled_at), "PPP 'at' p")} · {apt.duration_mins} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadIcs({
                            title: `Consultation with ${apt.professional_name}`,
                            startDate: new Date(apt.scheduled_at),
                            durationMins: apt.duration_mins,
                            meetLink: apt.meet_link,
                          })}
                        >
                          <Download className="h-4 w-4 mr-1" /> .ics
                        </Button>
                      )}
                      {apt.status === "cancelled" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadIcs({
                            title: `Consultation with ${apt.professional_name}`,
                            startDate: new Date(apt.scheduled_at),
                            durationMins: apt.duration_mins,
                            cancel: true,
                            uid: apt.id,
                          })}
                        >
                          <Download className="h-4 w-4 mr-1" /> Cancel .ics
                        </Button>
                      )}
                      <Badge className={statusColors[apt.status] || ""}>{apt.status === "awaiting_payment" ? "Awaiting Payment" : apt.status}</Badge>
                    </div>
                  </div>

                  {/* Awaiting payment: show countdown and pay button */}
                  {apt.status === "awaiting_payment" && apt.payment_expires_at && (
                    <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-3">
                      <div className="text-sm">
                        <p className="font-medium text-orange-800">Payment required</p>
                        <p className="text-orange-600">Time remaining: {formatCountdown(apt.payment_expires_at)}</p>
                      </div>
                      <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                        <CreditCard className="h-4 w-4 mr-1" /> Pay Now
                      </Button>
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

export default PatientAppointments;
