import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CalendarDays, Download } from "lucide-react";
import { downloadIcs } from "@/lib/ics";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const PatientAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
                <CardContent className="flex items-center justify-between py-4">
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
                    <Badge className={statusColors[apt.status] || ""}>{apt.status}</Badge>
                  </div>
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
