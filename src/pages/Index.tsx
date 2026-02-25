import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  Shield,
  CalendarCheck,
  MessageSquare,
  BadgeCheck,
  Search,
  CreditCard,
  ArrowRight,
  Stethoscope,
  Clock,
  Users,
} from "lucide-react";

const Index = () => {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary py-20 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(193_76%_58%/0.15),transparent_70%)]" />
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
              <Shield className="h-4 w-4" />
              HIPAA-Compliant Healthcare Platform
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-primary-foreground md:text-6xl">
              Your Health,{" "}
              <span className="text-accent">One Click Away</span>
            </h1>
            <p className="mb-8 text-lg text-primary-foreground/70 md:text-xl">
              Book verified doctors, consult securely, and manage your healthcare
              — all from one trusted platform.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 text-base"
                asChild
              >
                <Link to="/register">
                  Book a Doctor <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground hover:bg-secondary hover:text-primary-foreground font-medium"
                asChild
              >
                <Link to="/register">Join as a Professional</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="border-b bg-card py-10">
        <div className="container">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { icon: BadgeCheck, label: "Verified Doctors", value: "100+" },
              { icon: Users, label: "Patients Served", value: "5,000+" },
              { icon: Shield, label: "HIPAA Compliant", value: "100%" },
              { icon: Clock, label: "Avg Response", value: "< 2 hrs" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <Icon className="h-8 w-8 text-accent" />
                <span className="text-2xl font-bold text-foreground">{value}</span>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-background py-20">
        <div className="container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              Three simple steps to quality healthcare
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Search,
                title: "Find a Specialist",
                description:
                  "Browse verified professionals by specialty. View profiles, credentials, and availability.",
              },
              {
                step: "02",
                icon: CalendarCheck,
                title: "Book & Pay Securely",
                description:
                  "Select a convenient time slot, complete payment through Paystack, and get instant confirmation.",
              },
              {
                step: "03",
                icon: MessageSquare,
                title: "Consult & Connect",
                description:
                  "Chat securely, join video consultations via Google Meet, and access your health notes anytime.",
              },
            ].map(({ step, icon: Icon, title, description }) => (
              <Card key={step} className="group relative overflow-hidden border-border/50 bg-card transition-all hover:shadow-lg hover:border-accent/30">
                <CardContent className="p-8">
                  <span className="mb-4 block text-5xl font-extrabold text-accent/15">
                    {step}
                  </span>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/50 py-20">
        <div className="container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Built for Trust & Security
            </h2>
            <p className="text-muted-foreground">
              Every feature designed with patient safety and professional integrity in mind
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: BadgeCheck, title: "Verified Professionals", desc: "Every doctor is verified by our admin team before appearing on the platform." },
              { icon: Shield, title: "Secure Messaging", desc: "End-to-end encrypted chat unlocked only for confirmed appointments." },
              { icon: CreditCard, title: "Safe Payments", desc: "Paystack-powered transactions with automatic wallet management." },
              { icon: CalendarCheck, title: "Smart Scheduling", desc: "Professionals set availability, patients pick slots — no double bookings." },
              { icon: Stethoscope, title: "Consultation Notes", desc: "Doctors document your visit for easy follow-up and record-keeping." },
              { icon: Clock, title: "Quick Payouts", desc: "Professionals receive earnings directly to their bank account." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 rounded-xl border bg-card p-6 transition-all hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mb-8 text-primary-foreground/70">
              Join thousands of patients and professionals already using MyMedic
              for better healthcare outcomes.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8"
                asChild
              >
                <Link to="/register">
                  Create Your Account <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground hover:bg-secondary hover:text-primary-foreground"
                asChild
              >
                <Link to="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Index;
