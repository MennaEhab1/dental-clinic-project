import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { NoAppointments } from "@/components/common/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Calendar,
  XCircle,
  CheckCircle,
  MessageSquare,
  ArrowRight,
  FileText,
  Stethoscope,
} from "lucide-react";
import { Link } from "react-router-dom";
import { appointmentService } from "@/services/api";
import type { Appointment } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientSyncMessage, setPatientSyncMessage] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authIsLoading } = useAuth();

  const getAppointmentTimestamp = (appointment: Appointment): number => {
    const dateValue = String(appointment.date || "").trim();
    const timeValue = String(appointment.time || "").trim();
    if (!dateValue) return 0;

    const normalizedTime = /^\d{2}:\d{2}$/.test(timeValue)
      ? `${timeValue}:00`
      : timeValue || "00:00:00";

    const parsed = new Date(`${dateValue}T${normalizedTime}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();

    const parsedDateOnly = new Date(dateValue);
    return Number.isNaN(parsedDateOnly.getTime()) ? 0 : parsedDateOnly.getTime();
  };

  const formatAppointmentDate = (appointment: Appointment): string => {
    const timestamp = getAppointmentTimestamp(appointment);
    if (!timestamp) return "Date unavailable";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const fetchAppointments = useCallback(async () => {
    // Only fetch if auth is loaded and user is authenticated
    if (authIsLoading) {
      // Still loading auth state, don't fetch yet
      return;
    }

    if (!user) {
      // No user, not authenticated
      setIsLoading(false);
      setAppointments([]);
      return;
    }

    try {
      const response = await appointmentService.getByPatient();

      if (!response.success && response.message) {
        setPatientSyncMessage(response.message);
      } else {
        setPatientSyncMessage(null);
      }

      setAppointments(response.data);
    } catch (error) {
      setAppointments([]);
      setPatientSyncMessage("Failed to load appointments right now.");
    } finally {
      setIsLoading(false);
    }
  }, [authIsLoading, user]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Listen for appointment refresh events (from booking page)
  useEffect(() => {
    const handleRefresh = () => {
      console.debug(
        "[PatientDashboard] Refresh event received, refetching appointments",
      );
      setIsLoading(true);
      fetchAppointments();
    };

    window.addEventListener("appointments:refresh", handleRefresh);

    // Also listen for storage changes (handles cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "appointments_refresh") {
        console.debug(
          "[PatientDashboard] Storage change detected, refetching appointments",
        );
        setIsLoading(true);
        fetchAppointments();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("appointments:refresh", handleRefresh);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [fetchAppointments]);

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.status === "upcoming")
        .sort(
          (a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b),
        ),
    [appointments],
  );

  const completedAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.status === "complete")
        .sort(
          (a, b) => getAppointmentTimestamp(b) - getAppointmentTimestamp(a),
        ),
    [appointments],
  );

  const upcomingCount = upcomingAppointments.length;
  const completedCount = completedAppointments.length;
  const cancelledCount = appointments.filter(
    (appointment) => appointment.status === "cancelled",
  ).length;
  const lastVisit = completedAppointments[0];

  const lastVisitDoctorName = lastVisit
    ? [lastVisit.doctor?.firstName, lastVisit.doctor?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || "Unknown Doctor"
    : "";
  const lastVisitDoctorSpecialty = lastVisit?.doctor?.specialty
    ? lastVisit.doctor.specialty.replace("-", " ")
    : "General Dentistry";
  const lastVisitServiceName =
    lastVisit?.service?.name || "Dental Appointment";
  const lastVisitNotes = String(lastVisit?.notes || "").trim();
  const lastVisitInitials = lastVisitDoctorName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const stats = [
    {
      label: "Upcoming",
      value: upcomingCount,
      icon: Calendar,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Complete",
      value: completedCount,
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Cancelled",
      value: cancelledCount,
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Messages",
      value: 0,
      icon: MessageSquare,
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-hero-bg rounded-2xl p-6 md:p-8"
        >
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.firstName || "Patient"}! 👋
          </h1>
          <p className="text-muted-foreground mb-6">
            Here's an overview of your dental health journey.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/booking">
              <Button className="gradient-bg border-0">
                <Calendar className="w-4 h-4 mr-2" />
                Book Appointment
              </Button>
            </Link>
            <Link to="/patient/records">
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                View Records
              </Button>
            </Link>
          </div>
        </motion.div>

        {patientSyncMessage && (
          <Alert>
            <AlertTitle>Patient profile missing in backend</AlertTitle>
            <AlertDescription>{patientSyncMessage}</AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} {...stat} delay={index * 0.1} />
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Appointments */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-display">
                Upcoming Appointments
              </CardTitle>
              <Link to="/patient/appointments">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingCard />
              ) : upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppointments
                    .slice(0, 3)
                    .map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        variant="compact"
                      />
                    ))}
                </div>
              ) : (
                <NoAppointments
                  onBook={() => (window.location.href = "/booking")}
                />
              )}
            </CardContent>
          </Card>

          {/* Last Visit Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">Last Visit</CardTitle>
            </CardHeader>
            <CardContent>
              {lastVisit ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={lastVisit.doctor?.avatar} />
                      <AvatarFallback>{lastVisitInitials || "DR"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        Dr. {lastVisitDoctorName}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {lastVisitDoctorSpecialty}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted-foreground">
                        {formatAppointmentDate(lastVisit)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Stethoscope className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted-foreground">{lastVisitServiceName}</span>
                    </div>
                  </div>
                  {lastVisitNotes && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {lastVisitNotes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No previous visits
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 hover:shadow-card transition-shadow cursor-pointer">
            <Link to="/patient/messages" className="flex items-start gap-4">
              <div className="p-3 rounded-xl gradient-bg shrink-0">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">
                  Message Doctor
                </h3>
                <p className="text-xs text-muted-foreground">
                  Send a direct message to your dentist.
                </p>
              </div>
            </Link>
          </Card>
          <Card className="p-5 hover:shadow-card transition-shadow cursor-pointer">
            <Link to="/patient/records" className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-success/10 shrink-0">
                <FileText className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">
                  Medical Records
                </h3>
                <p className="text-xs text-muted-foreground">
                  View treatment history and records.
                </p>
              </div>
            </Link>
          </Card>
          <Card className="p-5 hover:shadow-card transition-shadow cursor-pointer">
            <Link to="/patient/profile" className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-accent/10 shrink-0">
                <Stethoscope className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">
                  My Profile
                </h3>
                <p className="text-xs text-muted-foreground">
                  Update personal profile details and settings.
                </p>
              </div>
            </Link>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
