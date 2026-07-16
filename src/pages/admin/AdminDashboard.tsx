import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  ArrowRight,
  TrendingUp,
  UserPlus,
  Stethoscope,
  Activity,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  adminAppointmentService,
  adminDoctorService,
  adminPatientService,
  reviewService,
} from "@/services/api";
import type { Appointment, DashboardStats, Doctor } from "@/types";
import { DoctorReviewsDialog } from "@/components/doctors/DoctorReviewsDialog";

interface DoctorReviewSummary {
  averageRating: number;
  totalReviews: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorReviewSummary, setDoctorReviewSummary] = useState<
    Record<string, DoctorReviewSummary>
  >({});
  const [reviewsOpenDoctor, setReviewsOpenDoctor] = useState<Doctor | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appointmentsRes, doctorsRes, patientsRes] = await Promise.all([
          adminAppointmentService.getAll(),
          adminDoctorService.getAll(),
          adminPatientService.getAll(),
        ]);

        const appointmentList = appointmentsRes.data || [];
        const doctorList = doctorsRes.data || [];
        const patientList = patientsRes.data || [];

        setAppointments(appointmentList);
        setDoctors(doctorList);

        const reviewEntries = await Promise.all(
          doctorList.map(async (doctor) => {
            try {
              const response = await reviewService.getReviewsForDoctor(
                doctor.id,
              );
              const items = response.success ? response.data || [] : [];
              const totalReviews = items.length;
              const averageRating =
                totalReviews > 0
                  ? items.reduce((sum, item) => sum + (item.rating || 0), 0) /
                    totalReviews
                  : 0;

              return [
                doctor.id,
                {
                  totalReviews,
                  averageRating,
                },
              ] as const;
            } catch {
              return [
                doctor.id,
                {
                  totalReviews: 0,
                  averageRating: 0,
                },
              ] as const;
            }
          }),
        );
        setDoctorReviewSummary(Object.fromEntries(reviewEntries));

        setStats({
          totalPatients: patientList.length,
          totalDoctors: doctorList.length,
          todayAppointments: appointmentList.length,
          completedAppointments: appointmentList.filter(
            (item) => item.status === "complete",
          ).length,
          pendingAppointments: appointmentList.filter(
            (item) => item.status === "upcoming",
          ).length,
          revenue: appointmentList
            .filter((item) => item.status === "complete")
            .reduce((sum, item) => sum + (item.service?.price || 0), 0),
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const dashboardStats = [
    {
      label: "Total Patients",
      value: stats?.totalPatients || 0,
      icon: Users,
      change: "+12%",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Doctors",
      value: stats?.totalDoctors || 0,
      icon: Stethoscope,
      change: "+2",
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Appointments",
      value: stats?.todayAppointments || 0,
      icon: Calendar,
      change: "+8%",
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  const statusColors: Record<string, string> = {
    upcoming: "bg-primary/10 text-primary",
    complete: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <DashboardLayout role="admin">
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
                Admin Dashboard 🏥
              </h1>
              <p className="text-muted-foreground">
                Overview of your dental center's performance.
              </p>
            </div>
            <div className="hidden md:flex gap-2">
              <Button variant="outline">
                <Activity className="w-4 h-4 mr-2" />
                Reports
              </Button>
              <Link to="/admin/doctors">
                <Button className="gradient-bg border-0">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Doctor
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {dashboardStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-success/10 text-success"
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {stat.change}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Appointments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-display">
                Recent Appointments
              </CardTitle>
              <Link to="/admin/appointments">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingCard />
              ) : (
                <div className="space-y-4">
                  {appointments.slice(0, 5).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={appointment.patient?.avatar} />
                          <AvatarFallback>
                            {appointment.patient?.firstName[0]}
                            {appointment.patient?.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {appointment.patient?.firstName}{" "}
                            {appointment.patient?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {appointment.service?.name}
                          </p>
                        </div>
                      </div>
                      <Badge className={statusColors[appointment.status]}>
                        {appointment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-display">
                Medical Staff
              </CardTitle>
              <Link to="/admin/doctors">
                <Button variant="ghost" size="sm">
                  Manage
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {doctors.slice(0, 5).map((doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={
                            doctor.avatar ||
                            (
                              doctor as Doctor & {
                                profileImageUrl?: string;
                                profileImage?: string;
                                imageUrl?: string;
                                profilePicture?: string;
                                photo?: string;
                              }
                            ).profileImageUrl ||
                            (
                              doctor as Doctor & {
                                profileImageUrl?: string;
                                profileImage?: string;
                                imageUrl?: string;
                                profilePicture?: string;
                                photo?: string;
                              }
                            ).profileImage ||
                            (
                              doctor as Doctor & {
                                profileImageUrl?: string;
                                profileImage?: string;
                                imageUrl?: string;
                                profilePicture?: string;
                                photo?: string;
                              }
                            ).imageUrl ||
                            (
                              doctor as Doctor & {
                                profileImageUrl?: string;
                                profileImage?: string;
                                imageUrl?: string;
                                profilePicture?: string;
                                photo?: string;
                              }
                            ).profilePicture ||
                            (
                              doctor as Doctor & {
                                profileImageUrl?: string;
                                profileImage?: string;
                                imageUrl?: string;
                                profilePicture?: string;
                                photo?: string;
                              }
                            ).photo
                          }
                        />
                        <AvatarFallback>
                          {doctor.firstName[0]}
                          {doctor.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          Dr. {doctor.firstName} {doctor.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {doctor.specialty.replace("-", " ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          ⭐{" "}
                          {(
                            doctorReviewSummary[doctor.id]?.averageRating ??
                            doctor.averageRating ??
                            doctor.rating ??
                            0
                          ).toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doctorReviewSummary[doctor.id]?.totalReviews ??
                            doctor.totalReviews ??
                            doctor.reviewCount ??
                            0}{" "}
                          reviews
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewsOpenDoctor(doctor)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Reviews
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {reviewsOpenDoctor && (
          <DoctorReviewsDialog
            doctor={reviewsOpenDoctor}
            open={Boolean(reviewsOpenDoctor)}
            onOpenChange={(open) => {
              if (!open) setReviewsOpenDoctor(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
