import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import PublicLayout from "@/components/layout/PublicLayout";
import { Stethoscope, User } from "lucide-react";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"patient" | "professional">("patient");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Account created!",
      description: "Please check your email to verify your account.",
    });
    navigate("/login");
  };

  return (
    <PublicLayout>
      <div className="flex min-h-[80vh] items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
            <CardDescription>Join MyMedic as a patient or professional</CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              {/* Role selector */}
              <div className="space-y-2">
                <Label>I am a...</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("patient")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      role === "patient"
                        ? "border-accent bg-accent/10 text-accent-foreground"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <User className={`h-6 w-6 ${role === "patient" ? "text-accent" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("professional")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      role === "professional"
                        ? "border-accent bg-accent/10 text-accent-foreground"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <Stethoscope className={`h-6 w-6 ${role === "professional" ? "text-accent" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">Professional</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Dr. Jane Smith" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 6 characters" minLength={6} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-accent hover:underline">Log in</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default Register;
