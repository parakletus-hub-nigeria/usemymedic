import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, X, BadgeCheck } from "lucide-react";
import { format } from "date-fns";

const AdminVerification = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("verification_requests")
      .select("*, profiles:professional_id(*)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setRequests(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (request: any) => {
    const { error: vrError } = await supabase.from("verification_requests")
      .update({ status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", request.id);

    if (!vrError) {
      await supabase.from("profiles").update({ is_verified: true }).eq("id", request.professional_id);
      toast({ title: "Professional approved!" });
      fetchRequests();
    }
  };

  const handleReject = async (request: any) => {
    const reason = rejectionReasons[request.id] || "Does not meet requirements";
    await supabase.from("verification_requests")
      .update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString(), rejection_reason: reason })
      .eq("id", request.id);
    toast({ title: "Professional rejected" });
    fetchRequests();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Verification Queue</h1>
          <p className="text-muted-foreground">Review and approve professional credentials</p>
        </div>

        {loading ? <p className="text-muted-foreground">Loading...</p> :
          requests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <BadgeCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No pending verification requests.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const p = req.profiles;
                return (
                  <Card key={req.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2 flex-1">
                          <h3 className="text-lg font-semibold text-foreground">{p?.full_name}</h3>
                          <div className="grid gap-1 text-sm text-muted-foreground">
                            <p><strong>Specialty:</strong> {p?.specialty || "—"}</p>
                            <p><strong>License #:</strong> {p?.license_number || "—"}</p>
                            <p><strong>License Expiry:</strong> {p?.license_expiry ? format(new Date(p.license_expiry), "PPP") : "—"}</p>
                            <p><strong>Experience:</strong> {p?.years_of_experience || 0} years</p>
                            <p><strong>Bank:</strong> {p?.bank_name} · {p?.bank_account_number}</p>
                            <p><strong>Submitted:</strong> {format(new Date(req.created_at), "PPP")}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 lg:w-72">
                          <Button className="bg-green-600 text-white hover:bg-green-700" onClick={() => handleApprove(req)}>
                            <Check className="h-4 w-4 mr-2" /> Approve
                          </Button>
                          <Input
                            placeholder="Rejection reason..."
                            value={rejectionReasons[req.id] || ""}
                            onChange={(e) => setRejectionReasons({ ...rejectionReasons, [req.id]: e.target.value })}
                          />
                          <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleReject(req)}>
                            <X className="h-4 w-4 mr-2" /> Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
      </div>
    </DashboardLayout>
  );
};

export default AdminVerification;
