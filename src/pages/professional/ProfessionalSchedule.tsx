import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ProfessionalSchedule = () => {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // New slot form
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState("30");
  const [bufferMins, setBufferMins] = useState("5");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setProfileId(data.id);
        supabase.from("availability_slots").select("*").eq("professional_id", data.id)
          .order("day_of_week").then(({ data: slotsData }) => {
            setSlots(slotsData ?? []);
            setLoading(false);
          });
      }
    });
  }, [user]);

  const addSlot = async () => {
    if (!profileId) return;
    const { error } = await supabase.from("availability_slots").insert({
      professional_id: profileId,
      day_of_week: parseInt(dayOfWeek),
      start_time: startTime,
      end_time: endTime,
      slot_duration_mins: parseInt(slotDuration),
      buffer_mins: parseInt(bufferMins),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Slot added" });
      // Refresh
      const { data } = await supabase.from("availability_slots").select("*").eq("professional_id", profileId).order("day_of_week");
      setSlots(data ?? []);
    }
  };

  const deleteSlot = async (id: string) => {
    await supabase.from("availability_slots").delete().eq("id", id);
    setSlots(slots.filter(s => s.id !== id));
    toast({ title: "Slot removed" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule Manager</h1>
          <p className="text-muted-foreground">Set your recurring availability</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Add Availability</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {days.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Select value={slotDuration} onValueChange={setSlotDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Buffer (min)</Label>
                <Input type="number" value={bufferMins} onChange={(e) => setBufferMins(e.target.value)} min={0} max={30} />
              </div>
            </div>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={addSlot}>
              <Plus className="h-4 w-4 mr-2" /> Add Slot
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Current Schedule</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-muted-foreground">Loading...</p> :
              slots.length === 0 ? <p className="text-muted-foreground text-sm">No availability set. Add your first slot above.</p> : (
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-foreground">{days[slot.day_of_week]}</p>
                        <p className="text-sm text-muted-foreground">
                          {slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)} · {slot.slot_duration_mins}min slots · {slot.buffer_mins}min buffer
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => deleteSlot(slot.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

export default ProfessionalSchedule;
