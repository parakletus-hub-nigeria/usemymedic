import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Auth pages
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Patient pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import DiscoverProfessionals from "./pages/patient/DiscoverProfessionals";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientMessages from "./pages/patient/PatientMessages";
import PatientSettings from "./pages/patient/PatientSettings";
import ProfessionalProfile from "./pages/patient/ProfessionalProfile";

// Professional pages
import ProfessionalDashboard from "./pages/professional/ProfessionalDashboard";
import ProfessionalOnboarding from "./pages/professional/ProfessionalOnboarding";
import ProfessionalSchedule from "./pages/professional/ProfessionalSchedule";
import ProfessionalAppointments from "./pages/professional/ProfessionalAppointments";
import ProfessionalMessages from "./pages/professional/ProfessionalMessages";
import ProfessionalWallet from "./pages/professional/ProfessionalWallet";
import ProfessionalSettings from "./pages/professional/ProfessionalSettings";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVerification from "./pages/admin/AdminVerification";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminPayouts from "./pages/admin/AdminPayouts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Patient */}
            <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={["patient"]}><PatientDashboard /></ProtectedRoute>} />
            <Route path="/patient/discover" element={<ProtectedRoute allowedRoles={["patient"]}><DiscoverProfessionals /></ProtectedRoute>} />
            <Route path="/patient/appointments" element={<ProtectedRoute allowedRoles={["patient"]}><PatientAppointments /></ProtectedRoute>} />
            <Route path="/patient/messages" element={<ProtectedRoute allowedRoles={["patient"]}><PatientMessages /></ProtectedRoute>} />
            <Route path="/patient/settings" element={<ProtectedRoute allowedRoles={["patient"]}><PatientSettings /></ProtectedRoute>} />
            <Route path="/patient/professional/:id" element={<ProtectedRoute allowedRoles={["patient"]}><ProfessionalProfile /></ProtectedRoute>} />

            {/* Professional */}
            <Route path="/professional/dashboard" element={<ProtectedRoute allowedRoles={["professional"]}><ProfessionalDashboard /></ProtectedRoute>} />
            <Route path="/professional/onboarding" element={<ProtectedRoute allowedRoles={["professional"]}><ProfessionalOnboarding /></ProtectedRoute>} />
            <Route path="/professional/schedule" element={<ProtectedRoute allowedRoles={["professional"]}><ProfessionalSchedule /></ProtectedRoute>} />
            <Route path="/professional/appointments" element={<ProtectedRoute allowedRoles={["professional"]}><ProfessionalAppointments /></ProtectedRoute>} />
            <Route path="/professional/messages" element={<ProtectedRoute allowedRoles={["professional"]}><ProfessionalMessages /></ProtectedRoute>} />
            <Route path="/professional/wallet" element={<ProtectedRoute allowedRoles={["professional"]}><ProfessionalWallet /></ProtectedRoute>} />
            <Route path="/professional/settings" element={<ProtectedRoute allowedRoles={["professional"]}><ProfessionalSettings /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/verification" element={<ProtectedRoute allowedRoles={["admin"]}><AdminVerification /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/finance" element={<ProtectedRoute allowedRoles={["admin"]}><AdminFinance /></ProtectedRoute>} />
            <Route path="/admin/payouts" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPayouts /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
