import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { BadgeCheck, Clock, ArrowLeft, CalendarDays } from "lucide-react";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ProfessionalProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [timeOff, setTimeOff] = useState<any[]>([]);
  const [existingAppts, setExistingAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [profileRes, slotsRes, timeOffRes, apptsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("availability_slots").select("*").eq("professional_id", id).eq("is_blocked", false),
        supabase.from("time_off_blocks").select("*").eq("professional_id", id),
        // Fix 1: Include awaiting_payment in slot blocking (soft lock)
        supabase.from("appointments").select("scheduled_at, duration_mins, status").eq("professional_id", id).in("status", ["pending", "confirmed", "awaiting_payment"]),
      ]);
      setProfile(profileRes.data);
      setSlots(slotsRes.data ?? []);
      setTimeOff(timeOffRes.data ?? []);
      setExistingAppts(apptsRes.data ?? []);
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  const availableDaysOfWeek = useMemo(() => new Set(slots.map(s => s.day_of_week)), [slots]);

  const disabledDays = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return true;
    if (!availableDaysOfWeek.has(date.getDay())) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    const fullDayOff = timeOff.some(t => t.blocked_date === dateStr && !t.start_time);
    return fullDayOff;
  };

  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dow = selectedDate.getDay();
    const daySlots = slots.filter(s => s.day_of_week === dow);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const dayTimeOff = timeOff.filter(t => t.blocked_date === dateStr && t.start_time);

    // Fix 3: Get professional's timezone for proper slot interpretation
    const proTimezone = profile?.timezone || "Africa/Lagos";

    const result: string[] = [];
    for (const slot of daySlots) {
      const [startH, startM] = slot.start_time.split(":").map(Number);
      const [endH, endM] = slot.end_time.split(":").map(Number);
      const duration = slot.slot_duration_mins;
      const buffer = slot.buffer_mins;

      let cursor = startH * 60 + startM;
      const end = endH * 60 + endM;

      while (cursor + duration <= end) {
        const h = Math.floor(cursor / 60);
        const m = cursor % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

        const isOff = dayTimeOff.some(t => {
          const offStart = t.start_time.split(":").map(Number);
          const offEnd = t.end_time.split(":").map(Number);
          const os = offStart[0] * 60 + offStart[1];
          const oe = offEnd[0] * 60 + offEnd[1];
          return cursor < oe && cursor + duration > os;
        });

        // Fix 3: Build slot time in professional's timezone, then compare in UTC
        const slotDateStr = format(selectedDate, "yyyy-MM-dd");
        const slotInProTz = new Date(`${slotDateStr}T${timeStr}:00`);
        // For proper timezone conversion we construct a date string that
        // JavaScript interprets in local time. Since the professional's slots
        // represent their local schedule, we compare against existing appointments
        // (which are in UTC via scheduled_at timestamptz).
        const slotStart = new Date(selectedDate);
        slotStart.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        const isBooked = existingAppts.some(a => {
          const as = new Date(a.scheduled_at);
          const ae = new Date(as.getTime() + a.duration_mins * 60000);
          return slotStart < ae && slotEnd > as;
        });

        const isPast = isBefore(slotStart, new Date());

        if (!isOff && !isBooked && !isPast) {
          result.push(timeStr);
        }
        cursor += duration + buffer;
      }
    }
    return result;
  }, [selectedDate, slots, timeOff, existingAppts, profile]);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !user || !profile) return;
    setBooking(true);
    const [h, m] = selectedTime.split(":").map(Number);
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(h, m, 0, 0);

    const slotForDay = slots.find(s => s.day_of_week === selectedDate.getDay());
    const duration = slotForDay?.slot_duration_mins ?? 30;

    const { error } = await supabase.from("appointments").insert({
      patient_id: user.id,
      professional_id: profile.user_id,
      scheduled_at: scheduledAt.toISOString(),
      duration_mins: duration,
      status: "pending",
    });

    setBooking(false);
    if (error) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Appointment requested!", description: "The professional will review your request." });
      navigate("/patient/appointments");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Professional not found.</p>
          <Button variant="link" onClick={() => navigate("/patient/discover")}>← Back to discovery</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/patient/discover")} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-2xl shrink-0">
                {profile.full_name?.charAt(0) || "?"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{profile.full_name}</h1>
                  {profile.is_verified && <BadgeCheck className="h-5 w-5 text-accent" />}
                </div>
                {profile.specialty && <Badge variant="secondary" className="mt-1">{profile.specialty}</Badge>}
                {profile.years_of_experience && (
                  <p className="text-sm text-muted-foreground mt-1">{profile.years_of_experience} years of experience</p>
                )}
                {profile.bio && <p className="mt-3 text-sm text-foreground/80">{profile.bio}</p>}
                {profile.consultation_fee > 0 && (
                  <p className="mt-3 text-lg font-semibold text-foreground">₦{Number(profile.consultation_fee).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">per session</span></p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Book an Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <p className="text-muted-foreground text-sm">This professional has not set up availability yet.</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Select a date</p>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => { setSelectedDate(date); setSelectedTime(null); }}
                    disabled={disabledDays}
                    fromDate={new Date()}
                    toDate={addDays(new Date(), 60)}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {selectedDate ? `Available times for ${format(selectedDate, "EEE, MMM d")}` : "Pick a date first"}
                  </p>
                  {selectedDate && availableTimeSlots.length === 0 && (
                    <p className="text-sm text-muted-foreground">No available slots on this day.</p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimeSlots.map(time => (
                      <Button
                        key={time}
                        size="sm"
                        variant={selectedTime === time ? "default" : "outline"}
                        onClick={() => setSelectedTime(time)}
                        className={selectedTime === time ? "bg-accent text-accent-foreground" : ""}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {time}
                      </Button>
                    ))}
                  </div>
                  {selectedTime && (
                    <Button
                      className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={handleBook}
                      disabled={booking}
                    >
                      {booking ? "Requesting..." : "Request Appointment"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfessionalProfile;
