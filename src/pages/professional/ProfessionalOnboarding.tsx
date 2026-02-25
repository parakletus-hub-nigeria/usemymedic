import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import PublicLayout from "@/components/layout/PublicLayout";
import { CheckCircle } from "lucide-react";

const specialties = [
  "General Practice", "Cardiology", "Dermatology", "Endocrinology",
  "Gastroenterology", "Neurology", "Obstetrics & Gynecology", "Oncology",
  "Ophthalmology", "Orthopedics", "Pediatrics", "Psychiatry",
  "Pulmonology", "Radiology", "Urology",
];

const ProfessionalOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [consultationFee, setConsultationFee] = useState("");

  // Step 2
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");

  // Step 3
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    // Update profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        specialty,
        bio,
        years_of_experience: parseInt(yearsOfExperience) || 0,
        consultation_fee: parseFloat(consultationFee) || 0,
        license_number: licenseNumber,
        license_expiry: licenseExpiry || null,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        is_profile_complete: true,
      })
      .eq("user_id", user.id)
      .select()
      .single();

    if (profileError) {
      toast({ title: "Error", description: profileError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Create verification request
    if (profile) {
      await supabase.from("verification_requests").insert({
        professional_id: profile.id,
        status: "pending",
      });
    }

    setLoading(false);
    toast({ title: "Profile submitted!", description: "Your credentials are now under review." });
    navigate("/professional/dashboard");
  };

  return (
    <PublicLayout>
      <div className="flex min-h-[80vh] items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
            <CardDescription>Step {step} of 3</CardDescription>
            {/* Progress */}
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? "bg-accent" : "bg-muted"}`} />
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Jane Smith" required />
                </div>
                <div className="space-y-2">
                  <Label>Specialty</Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                    <SelectContent>
                      {specialties.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell patients about yourself..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Input type="number" value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value)} placeholder="5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Consultation Fee (₦)</Label>
                    <Input type="number" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} placeholder="5000" />
                  </div>
                </div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setStep(2)} disabled={!fullName || !specialty}>
                  Next: License Details
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>License Number</Label>
                  <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="MDCN/2024/12345" required />
                </div>
                <div className="space-y-2">
                  <Label>License Expiry Date</Label>
                  <Input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                  <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setStep(3)} disabled={!licenseNumber}>
                    Next: Bank Info
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="First Bank" required />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="0123456789" required />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                  <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmit} disabled={loading || !bankName || !bankAccountNumber}>
                    {loading ? "Submitting..." : "Submit for Review"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default ProfessionalOnboarding;
