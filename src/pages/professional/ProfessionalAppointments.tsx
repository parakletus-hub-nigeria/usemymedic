import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Check, X, Download, Link2, FileText } from "lucide-react";
import { downloadIcs } from "@/lib/ics";

const ProfessionalAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [meetLinkValue, setMeetLinkValue] = useState("");
  const [editingMeetLink, setEditingMeetLink] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("professional_id", user.id)
      .order("scheduled_at", { ascending: false });

    const patientIds = [...new Set((data ?? []).map(a => a.patient_id))];
    let profileMap: Record<string, string> = {};
    if (patientIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds);
      profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.full_name]));
    }

    setAppointments((data ?? []).map(a => ({ ...a, patient_name: profileMap[a.patient_id] || "Patient" })));
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [user]);

  const updateStatus = async (id: string, status: string) => {
    const updateData: any = { status };
    
    // Fix 1: When accepting, set to awaiting_payment with 15-min expiry
    if (status === "awaiting_payment") {
      updateData.payment_expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    
    // Fix 5: When completing, set completed_at
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from("appointments").update(updateData).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Appointment ${status === "awaiting_payment" ? "accepted — awaiting patient payment" : status}` });
      fetchAppointments();
    }
  };

  const saveNotes = async (id: string) => {
    await supabase.from("appointments").update({ consultation_notes: notesValue }).eq("id", id);
    toast({ title: "Notes saved" });
    setEditingNotes(null);
    fetchAppointments();
  };

  const saveMeetLink = async (id: string) => {
    await supabase.from("appointments").update({ meet_link: meetLinkValue }).eq("id", id);
    toast({ title: "Meet link saved" });
    setEditingMeetLink(null);
    fetchAppointments();
  };

  const byStatus = (status: string) => appointments.filter(a => a.status === status);

  const AppointmentCard = ({ apt, showActions }: { apt: any; showActions?: boolean }) => (
    <Card key={apt.id} className="mb-3">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">{apt.patient_name}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(apt.scheduled_at), "PPP 'at' p")} · {apt.duration_mins} min
            </p>
          </div>
          {showActions ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => updateStatus(apt.id, "awaiting_payment")}>
                <Check className="h-4 w-4 mr-1" /> Accept
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => updateStatus(apt.id, "declined")}>
                <X className="h-4 w-4 mr-1" /> Decline
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {(apt.status === "confirmed" || apt.status === "awaiting_payment") && (
                <Button size="sm" variant="ghost" onClick={() => downloadIcs({
                  title: `Consultation with ${apt.patient_name}`,
                  startDate: new Date(apt.scheduled_at),
                  durationMins: apt.duration_mins,
                  meetLink: apt.meet_link,
                })}>
                  <Download className="h-4 w-4 mr-1" /> .ics
                </Button>
              )}
              {apt.status === "cancelled" && (
                <Button size="sm" variant="ghost" onClick={() => downloadIcs({
                  title: `Consultation with ${apt.patient_name}`,
                  startDate: new Date(apt.scheduled_at),
                  durationMins: apt.duration_mins,
                  cancel: true,
                  uid: apt.id,
                })}>
                  <Download className="h-4 w-4 mr-1" /> Cancel .ics
                </Button>
              )}
              <Badge>{apt.status}</Badge>
            </div>
          )}
        </div>

        {/* Awaiting payment indicator */}
        {apt.status === "awaiting_payment" && apt.payment_expires_at && (
          <p className="text-sm text-yellow-600">⏳ Waiting for patient payment (expires {format(new Date(apt.payment_expires_at), "p")})</p>
        )}

        {/* Meet link for confirmed */}
        {apt.status === "confirmed" && (
          <div className="flex items-center gap-2">
            {editingMeetLink === apt.id ? (
              <>
                <Input size={1} placeholder="Paste meet link..." value={meetLinkValue} onChange={e => setMeetLinkValue(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={() => saveMeetLink(apt.id)}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingMeetLink(null)}>Cancel</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { setEditingMeetLink(apt.id); setMeetLinkValue(apt.meet_link || ""); }}>
                <Link2 className="h-4 w-4 mr-1" /> {apt.meet_link ? "Edit Meet Link" : "Add Meet Link"}
              </Button>
            )}
          </div>
        )}

        {/* Mark complete for confirmed appointments */}
        {apt.status === "confirmed" && (
          <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50" onClick={() => updateStatus(apt.id, "completed")}>
            <Check className="h-4 w-4 mr-1" /> Mark Completed
          </Button>
        )}

        {/* Consultation notes */}
        {(apt.status === "confirmed" || apt.status === "completed") && (
          <div>
            {editingNotes === apt.id ? (
              <div className="space-y-2">
                <Textarea placeholder="Consultation notes..." value={notesValue} onChange={e => setNotesValue(e.target.value)} rows={3} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveNotes(apt.id)}>Save Notes</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingNotes(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { setEditingNotes(apt.id); setNotesValue(apt.consultation_notes || ""); }}>
                <FileText className="h-4 w-4 mr-1" /> {apt.consultation_notes ? "Edit Notes" : "Add Notes"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        </div>
      </DashboardLayout>
    );
  }

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
            <TabsTrigger value="awaiting_payment">Awaiting Payment ({byStatus("awaiting_payment").length})</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed ({byStatus("confirmed").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({byStatus("completed").length})</TabsTrigger>
            <TabsTrigger value="declined">Declined ({byStatus("declined").length})</TabsTrigger>
          </TabsList>
          {["pending", "awaiting_payment", "confirmed", "completed", "declined"].map(status => (
            <TabsContent key={status} value={status} className="mt-4">
              {byStatus(status).length === 0
                ? <p className="text-muted-foreground text-sm">No {status.replace("_", " ")} appointments.</p>
                : byStatus(status).map(apt => <AppointmentCard key={apt.id} apt={apt} showActions={status === "pending"} />)
              }
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProfessionalAppointments;
