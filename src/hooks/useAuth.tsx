import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type UserRole = "patient" | "professional" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  forceAdminAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signOut: async () => { },
  forceAdminAuth: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!data || data.length === 0) return null;
    // Prioritize: admin > professional > patient
    const roles = data.map((r) => r.role as UserRole);
    if (roles.includes("admin")) return "admin";
    if (roles.includes("professional")) return "professional";
    return "patient";
  };

  useEffect(() => {
    const bypassKey = "mymedic_admin_bypass";

    // Check for existing persistent bypass
    const hasBypass = localStorage.getItem(bypassKey) === "true";

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // If bypass is active, ignore Supabase session clearing
        if (localStorage.getItem(bypassKey) === "true") return;

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const userRole = await fetchRole(session.user.id);
          setRole(userRole);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    const bypassAdminAuthFlag = import.meta.env.VITE_BYPASS_ADMIN_AUTH === "true";

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (bypassAdminAuthFlag || hasBypass) {
        setSession(session);
        setUser(session?.user ?? { id: "60647065-ad01-4444-8888-mymedic-admin", email: "mymedicng@gmail.com" } as any);
        setRole("admin");
        if (hasBypass) localStorage.setItem(bypassKey, "true");
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const userRole = await fetchRole(session.user.id);
        setRole(userRole);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem("mymedic_admin_bypass");
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const forceAdminAuth = () => {
    localStorage.setItem("mymedic_admin_bypass", "true");
    setUser({ id: "60647065-ad01-4444-8888-mymedic-admin", email: "mymedicng@gmail.com" } as any);
    setSession({ access_token: "bypass-token", user: { id: "60647065-ad01-4444-8888-mymedic-admin", email: "mymedicng@gmail.com" } } as any);
    setRole("admin");
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signOut, forceAdminAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
