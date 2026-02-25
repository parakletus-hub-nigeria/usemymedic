import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  CalendarDays,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  BadgeCheck,
  ClipboardList,
  Wallet,
  Clock,
  Users,
  DollarSign,
  Shield,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const patientNav: NavItem[] = [
  { label: "Dashboard", href: "/patient/dashboard", icon: Home },
  { label: "Find Doctors", href: "/patient/discover", icon: Search },
  { label: "Appointments", href: "/patient/appointments", icon: CalendarDays },
  { label: "Messages", href: "/patient/messages", icon: MessageSquare },
  { label: "Settings", href: "/patient/settings", icon: Settings },
];

const professionalNav: NavItem[] = [
  { label: "Dashboard", href: "/professional/dashboard", icon: Home },
  { label: "Schedule", href: "/professional/schedule", icon: Clock },
  { label: "Appointments", href: "/professional/appointments", icon: ClipboardList },
  { label: "Messages", href: "/professional/messages", icon: MessageSquare },
  { label: "Wallet", href: "/professional/wallet", icon: Wallet },
  { label: "Settings", href: "/professional/settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: Home },
  { label: "Verification", href: "/admin/verification", icon: BadgeCheck },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Finance", href: "/admin/finance", icon: DollarSign },
  { label: "Payouts", href: "/admin/payouts", icon: Wallet },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = role === "admin" ? adminNav : role === "professional" ? professionalNav : patientNav;

  const roleLabel = role === "admin" ? "Admin" : role === "professional" ? "Professional" : "Patient";
  const roleIcon = role === "admin" ? Shield : role === "professional" ? BadgeCheck : Users;
  const RoleIcon = roleIcon;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/mymedic-logo.png" alt="MyMedic" className="h-8 w-auto" />
          </Link>
          <button className="text-primary-foreground lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
            <RoleIcon className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-primary-foreground">{roleLabel}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = location.pathname === href;
            return (
              <Link
                key={href}
                to={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-accent"
                    : "text-primary-foreground/70 hover:bg-sidebar-accent hover:text-primary-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="border-t border-sidebar-border p-3">
          <p className="mb-2 truncate px-3 text-xs text-primary-foreground/50">{user?.email}</p>
          <Button
            variant="ghost"
            className="w-full justify-start text-primary-foreground/70 hover:bg-sidebar-accent hover:text-primary-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <button className="text-foreground lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
