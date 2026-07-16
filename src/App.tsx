import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminSpecialities from "@/pages/admin/Adminspecialities";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AIChatWidget } from "@/components/ai/AIChatWidget";

// Pages
import LandingPage from "./pages/LandingPage";
import ServicesPage from "./pages/ServicesPage";
import DoctorsPage from "./pages/DoctorsPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import ConfirmEmailPage from "./pages/auth/ConfirmEmailPage";
import BookingPage from "./pages/booking/BookingPage";
import BookingConfirmation from "./pages/booking/BookingConfirmation";
import NotFound from "./pages/NotFound";

// Patient Pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientMedicalRecords from "./pages/patient/PatientMedicalRecords";
import PatientPrescriptions from "./pages/patient/PatientPrescriptions";
import PatientReviews from "./pages/patient/PatientReviews";
import PatientMessages from "./pages/patient/PatientMessages";
import PatientProfile from "./pages/patient/PatientProfile";
import PatientImageAnalysis from "./pages/patient/PatientImageAnalysis";

// Doctor Pages
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import DoctorMedicalRecords from "./pages/doctor/DoctorMedicalRecords";
import DoctorMessages from "./pages/doctor/DoctorMessages";
import DoctorSchedulePage from "./pages/doctor/DoctorSchedule";
import UpdatePassword from "./pages/doctor/UpdatePassword";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminPatients from "./pages/admin/AdminPatients";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminPharmacy from "./pages/admin/AdminPharmacy";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

function RoleRoute({
  role,
  children,
}: {
  role: "patient" | "doctor" | "admin";
  children: JSX.Element;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = String(user.role || "").toLowerCase();
  if (userRole !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function ResetPasswordApiRedirect() {
  const location = useLocation();
  return <Navigate to={`/reset-password${location.search}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ScrollToTop />
            <Routes>
              {/* Public Routes */}
              <Route
                path="/admin/specialities"
                element={<AdminSpecialities />}
              />
              <Route path="/" element={<LandingPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/doctors" element={<DoctorsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/api/Account/reset-password"
                element={<ResetPasswordApiRedirect />}
              />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              {/* Confirm-email deep-link handler (from backend email links) */}
              <Route path="/confirm-email" element={<ConfirmEmailPage />} />
              <Route
                path="/api/Account/confirm-email"
                element={<ConfirmEmailPage />}
              />
              <Route path="/booking" element={<BookingPage />} />
              <Route
                path="/booking/confirmation"
                element={<BookingConfirmation />}
              />

              {/* Patient Routes */}
              <Route
                path="/patient/dashboard"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="patient">
                      <PatientDashboard />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/appointments"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="patient">
                      <PatientAppointments />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/records"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="patient">
                      <PatientMedicalRecords />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/prescriptions"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="patient">
                      <PatientPrescriptions />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/reviews"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="patient">
                      <PatientReviews />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/messages"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="patient">
                      <PatientMessages />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/profile"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="patient">
                      <PatientProfile />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/settings"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="patient">
                      <PatientProfile />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/ai-analysis"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="patient">
                      <PatientImageAnalysis />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              {/* Doctor Routes */}
              <Route
                path="/doctor/dashboard"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="doctor">
                      <DoctorDashboard />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/appointments"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="doctor">
                      <DoctorAppointments />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/patients"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="doctor">
                      <DoctorPatients />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/records"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="doctor">
                      <DoctorMedicalRecords />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/messages"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="doctor">
                      <DoctorMessages />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/schedule"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="doctor">
                      <DoctorSchedulePage />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/updatePassword"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="doctor">
                      <UpdatePassword />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/settings"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="doctor">
                      <UpdatePassword />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="admin">
                      <AdminDashboard />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/doctors"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="admin">
                      <AdminDoctors />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/patients"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="admin">
                      <AdminPatients />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/appointments"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="admin">
                      <AdminAppointments />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pharmacy"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="admin">
                      <AdminPharmacy />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute>
                    <RoleRoute role="admin">
                      <AdminDashboard />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
