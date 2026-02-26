import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("patient" | "professional" | "admin")[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const bypassAdminAuth = import.meta.env.VITE_BYPASS_ADMIN_AUTH === "true";

  // Development bypass for admin routes
  if (bypassAdminAuth && allowedRoles?.includes("admin")) {
    return <>{children}</>;
  }

  // Still resolving auth state — keep spinning
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but role hasn't resolved yet (async), keep waiting
  if (allowedRoles && role === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to the correct dashboard based on role
    const dashboardMap = {
      patient: "/patient/dashboard",
      professional: "/professional/dashboard",
      admin: "/admin/dashboard",
    };
    return <Navigate to={dashboardMap[role] || "/"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
