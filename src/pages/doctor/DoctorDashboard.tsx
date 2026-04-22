import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Users,
  Clock,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Bell,
} from "lucide-react";
import { Link } from "react-router-dom";
import { doctorService } from "@/services/api";
import type {
  Appointment,
  DashboardStats,
  Notification,
  Patient,
} from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [doctorNotifications, setDoctorNotifications] = useState<
    Notification[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appointmentsRes, statsRes] = await Promise.all([
          doctorService.getAppointments(),
          doctorService.getDashboard(),
        ]);

        setAppointments(appointmentsRes.data);
        setStats(statsRes.data);

        const byAppointment = appointmentsRes.data
          .map((item) => item.patient)
          .filter((item): item is Patient => !!item)
          .filter(
            (item, index, array) =>
              array.findIndex((entry) => entry.id === item.id) === index,
          )
          .slice(0, 5);

        setRecentPatients(byAppointment);

        const notifications: Notification[] = appointmentsRes.data
          .slice(0, 4)
          .map((appointment) => ({
            id: `notification-${appointment.id}`,
            userId: user?.id || "doctor-local",
            title: `Appointment ${appointment.status}`,
            message:
              `${appointment.patient?.firstName || "Patient"} ${appointment.patient?.lastName || ""} • ${appointment.date} ${appointment.time}`.trim(),
            type: "appointment",
            isRead:
              appointment.status === "completed" ||
              appointment.status === "cancelled",
            createdAt: appointment.updatedAt || appointment.createdAt,
          }));

        setDoctorNotifications(notifications);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

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
      label: "Pending",
      value: stats?.pendingAppointments || 0,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Revenue",
      value: `$${(stats?.revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  const todayAppointments = appointments.filter(
    (a) => a.status !== "cancelled" && a.status !== "completed",
  );

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        {/* Welcome Section */}
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
            <div className="hidden md:flex items-center gap-2 bg-card rounded-lg px-4 py-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-foreground">
                +12% this week
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dashboardStats.map((stat, index) => (
            <StatCard key={stat.label} {...stat} delay={index * 0.1} />
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Today's Appointments */}
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

          {/* Sidebar: Notifications + Patients */}
          <div className="space-y-6">
            {/* Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {doctorNotifications.length > 0 ? (
                    doctorNotifications.slice(0, 4).map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-lg border text-sm ${notif.isRead ? "border-border" : "border-primary/30 bg-primary/5"}`}
                      >
                        <p className="font-medium text-foreground text-xs">
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No new notifications
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Patients */}
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
                          {patient.firstName[0]}
                          {patient.lastName[0]}
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
