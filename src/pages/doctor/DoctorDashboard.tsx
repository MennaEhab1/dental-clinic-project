import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, Users, Clock, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { doctorService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Appointment, DashboardStats, Patient } from "@/types";

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAppointmentDateKey(value: string): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateKey(parsed);
}

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appointmentsRes, statsRes] = await Promise.all([
          doctorService.getAppointments(),
          doctorService.getDashboard(),
        ]);

        const todayKey = toDateKey(new Date());
        let latestAppointments = appointmentsRes.data;
        let latestStats = statsRes.data;

        // Auto-cancel active appointments that are before today.
        const staleAppointments = latestAppointments.filter((item) => {
          if (item.status === "cancelled" || item.status === "complete") {
            return false;
          }
          const dateKey = getAppointmentDateKey(item.date);
          return !!dateKey && dateKey < todayKey;
        });

        if (staleAppointments.length > 0) {
          await Promise.allSettled(
            staleAppointments.map((item) =>
              doctorService.cancelAppointment(item.id),
            ),
          );

          const [freshAppointmentsRes, freshStatsRes] = await Promise.all([
            doctorService.getAppointments(),
            doctorService.getDashboard(),
          ]);
          latestAppointments = freshAppointmentsRes.data;
          latestStats = freshStatsRes.data;
        }

        setAppointments(latestAppointments);

        const uniquePatients = latestAppointments
          .map((item) => item.patient)
          .filter((item): item is Patient => !!item)
          .filter(
            (item, index, array) =>
              array.findIndex((entry) => entry.id === item.id) === index,
          );

        setRecentPatients(uniquePatients.slice(0, 5));

        const fallbackPatientCount = new Set(
          latestAppointments
            .map((item) => item.patient?.id || item.patientId)
            .filter(Boolean),
        ).size;

        setStats({
          ...latestStats,
          totalPatients:
            latestStats.totalPatients > 0
              ? latestStats.totalPatients
              : fallbackPatientCount,
        });
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, []);

  const dashboardStats = [
    {
      label: "Today's Appointments",
      value: stats?.todayAppointments || 0,
      icon: Calendar,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Patients",
      value: stats?.totalPatients || 0,
      icon: Users,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Upcoming",
      value: stats?.pendingAppointments || 0,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  const todayKey = toDateKey(new Date());
  const todayAppointments = appointments.filter((item) => {
    const dateKey = getAppointmentDateKey(item.date);
    return (
      dateKey === todayKey &&
      item.status !== "cancelled" &&
      item.status !== "complete"
    );
  });

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-hero-bg rounded-2xl p-6 md:p-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                Good morning, Dr. {user?.lastName || "Doctor"}! 👋
              </h1>
              <p className="text-muted-foreground">
                You have {todayAppointments.length} appointments scheduled for
                today.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {dashboardStats.map((stat, index) => (
            <StatCard key={stat.label} {...stat} delay={index * 0.1} />
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-display">
                Today's Appointments
              </CardTitle>
              <Link to="/doctor/appointments">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingCard />
              ) : todayAppointments.length > 0 ? (
                <div className="space-y-3">
                  {todayAppointments.slice(0, 4).map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      variant="compact"
                      viewerRole="doctor"
                      showPaymentDetails={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No appointments for today
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg font-display">
                  Recent Patients
                </CardTitle>
                <Link to="/doctor/patients">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={patient.avatar} />
                        <AvatarFallback>
                          {patient.firstName?.[0] || "P"}
                          {patient.lastName?.[0] || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {patient.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
