import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Search, BadgeCheck, Star } from "lucide-react";

const DiscoverProfessionals = () => {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfessionals = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_verified", true)
        .order("full_name");
      setProfessionals(data ?? []);
      setLoading(false);
    };
    fetchProfessionals();
  }, []);

  const filtered = professionals.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Find a Doctor</h1>
          <p className="text-muted-foreground">Browse verified healthcare professionals</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading professionals...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No verified professionals found. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pro) => (
              <Card key={pro.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-lg">
                      {pro.full_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{pro.full_name}</h3>
                        <BadgeCheck className="h-4 w-4 text-accent shrink-0" />
                      </div>
                      {pro.specialty && (
                        <Badge variant="secondary" className="mt-1">{pro.specialty}</Badge>
                      )}
                      {pro.years_of_experience && (
                        <p className="text-xs text-muted-foreground mt-1">{pro.years_of_experience} years experience</p>
                      )}
                    </div>
                  </div>
                  {pro.bio && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{pro.bio}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    {pro.consultation_fee > 0 && (
                      <span className="text-sm font-medium text-foreground">₦{Number(pro.consultation_fee).toLocaleString()}</span>
                    )}
                    <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 ml-auto" asChild>
                      <Link to={`/patient/professional/${pro.id}`}>View Profile</Link>
                    </Button>
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

export default DiscoverProfessionals;
