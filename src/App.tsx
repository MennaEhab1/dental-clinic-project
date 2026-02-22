import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIChatWidget } from "@/components/ai/AIChatWidget";

// Pages
import LandingPage from "./pages/LandingPage";
import ServicesPage from "./pages/ServicesPage";
import DoctorsPage from "./pages/DoctorsPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import BookingPage from "./pages/booking/BookingPage";
import BookingConfirmation from "./pages/booking/BookingConfirmation";
import NotFound from "./pages/NotFound";

// Patient Pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientAppointmentHistory from "./pages/patient/PatientAppointmentHistory";
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

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminPatients from "./pages/admin/AdminPatients";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminPharmacy from "./pages/admin/AdminPharmacy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/doctors" element={<DoctorsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route
                path="/booking/confirmation"
                element={<BookingConfirmation />}
              />

              {/* Patient Routes */}
              <Route path="/patient/dashboard" element={<PatientDashboard />} />
              <Route
                path="/patient/appointments"
                element={<PatientAppointments />}
              />
              <Route
                path="/patient/history"
                element={<PatientAppointmentHistory />}
              />
              <Route
                path="/patient/records"
                element={<PatientMedicalRecords />}
              />
              <Route
                path="/patient/prescriptions"
                element={<PatientPrescriptions />}
              />
              <Route path="/patient/reviews" element={<PatientReviews />} />
              <Route path="/patient/messages" element={<PatientMessages />} />
              <Route path="/patient/profile" element={<PatientProfile />} />
              <Route path="/patient/settings" element={<PatientProfile />} />
              <Route
                path="/patient/ai-analysis"
                element={<PatientImageAnalysis />}
              />

              {/* Doctor Routes */}
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route
                path="/doctor/appointments"
                element={<DoctorAppointments />}
              />
              <Route path="/doctor/patients" element={<DoctorPatients />} />
              <Route
                path="/doctor/records"
                element={<DoctorMedicalRecords />}
              />
              <Route path="/doctor/messages" element={<DoctorMessages />} />
              <Route path="/doctor/settings" element={<DoctorDashboard />} />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/doctors" element={<AdminDoctors />} />
              <Route path="/admin/patients" element={<AdminPatients />} />
              <Route
                path="/admin/appointments"
                element={<AdminAppointments />}
              />
              <Route path="/admin/pharmacy" element={<AdminPharmacy />} />
              <Route path="/admin/settings" element={<AdminDashboard />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AIChatWidget />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
