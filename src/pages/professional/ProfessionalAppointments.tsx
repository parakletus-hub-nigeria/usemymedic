import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Check, X } from "lucide-react";

const ProfessionalAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("professional_id", user.id)
      .order("scheduled_at", { ascending: false });
    setAppointments(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [user]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Appointment ${status}` });
      fetchAppointments();
    }
  };

  const byStatus = (status: string) => appointments.filter(a => a.status === status);

  const AppointmentCard = ({ apt, showActions }: { apt: any; showActions?: boolean }) => (
    <Card key={apt.id} className="mb-3">
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="font-medium text-foreground">{format(new Date(apt.scheduled_at), "PPP 'at' p")}</p>
          <p className="text-sm text-muted-foreground">{apt.duration_mins} min</p>
        </div>
        {showActions && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => updateStatus(apt.id, "confirmed")}>
              <Check className="h-4 w-4 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => updateStatus(apt.id, "declined")}>
              <X className="h-4 w-4 mr-1" /> Decline
            </Button>
          </div>
        )}
        {!showActions && <Badge>{apt.status}</Badge>}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consultation Hub</h1>
          <p className="text-muted-foreground">Manage your appointment requests</p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({byStatus("pending").length})</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed ({byStatus("confirmed").length})</TabsTrigger>
            <TabsTrigger value="declined">Declined ({byStatus("declined").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({byStatus("completed").length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            {byStatus("pending").length === 0 ? <p className="text-muted-foreground text-sm">No pending requests.</p> :
              byStatus("pending").map(apt => <AppointmentCard key={apt.id} apt={apt} showActions />)}
          </TabsContent>
          <TabsContent value="confirmed" className="mt-4">
            {byStatus("confirmed").length === 0 ? <p className="text-muted-foreground text-sm">No confirmed appointments.</p> :
              byStatus("confirmed").map(apt => <AppointmentCard key={apt.id} apt={apt} />)}
          </TabsContent>
          <TabsContent value="declined" className="mt-4">
            {byStatus("declined").length === 0 ? <p className="text-muted-foreground text-sm">No declined appointments.</p> :
              byStatus("declined").map(apt => <AppointmentCard key={apt.id} apt={apt} />)}
          </TabsContent>
          <TabsContent value="completed" className="mt-4">
            {byStatus("completed").length === 0 ? <p className="text-muted-foreground text-sm">No completed consultations.</p> :
              byStatus("completed").map(apt => <AppointmentCard key={apt.id} apt={apt} />)}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProfessionalAppointments;
