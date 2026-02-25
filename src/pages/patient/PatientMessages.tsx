import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SecureChat from "@/components/chat/SecureChat";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isAfter, addHours } from "date-fns";

const PatientMessages = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchThreads = async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, scheduled_at, professional_id, status, completed_at")
        .eq("patient_id", user.id)
        .in("status", ["confirmed", "completed"])
        .order("scheduled_at", { ascending: false });

      const proIds = [...new Set((data ?? []).map(a => a.professional_id))];
      let profileMap: Record<string, string> = {};
      if (proIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", proIds);
        profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.full_name]));
      }

      // Filter: completed appointments only shown if within 24hrs of completed_at
      const now = new Date();
      const filtered = (data ?? []).filter(a => {
        if (a.status === "confirmed") return true;
        if (a.status === "completed" && a.completed_at) {
          return isAfter(addHours(new Date(a.completed_at), 24), now);
        }
        return false;
      });

      setThreads(filtered.map(a => ({ ...a, professional_name: profileMap[a.professional_id] || "Doctor" })));
      setLoading(false);
    };
    fetchThreads();
  }, [user]);

  const isReadOnly = (thread: any) => {
    if (thread.status === "completed") {
      if (!thread.completed_at) return true;
      return !isAfter(addHours(new Date(thread.completed_at), 24), new Date());
    }
    return false;
  };

  if (selectedThread) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-2xl">
          <Button variant="ghost" size="sm" onClick={() => setSelectedThread(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to threads
          </Button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Chat with {selectedThread.professional_name}</h2>
            {selectedThread.status === "completed" && <Badge variant="secondary">Completed</Badge>}
          </div>
          <Card>
            <SecureChat appointmentId={selectedThread.id} otherName={selectedThread.professional_name} readOnly={isReadOnly(selectedThread)} />
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">Chat with your healthcare professionals</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : threads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No messages yet. Messages are available for confirmed appointments.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {threads.map(t => (
              <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedThread(t)}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent font-bold">
                    {t.professional_name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{t.professional_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.scheduled_at), "PPP 'at' p")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.status === "completed" && <Badge variant="secondary" className="text-xs">Completed</Badge>}
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
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

export default PatientMessages;
