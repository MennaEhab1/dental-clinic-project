import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AppointmentCard } from "@/pages/appointments/AppointmentCard";
import { AppointmentDetailsDrawer } from "@/components/dashboard/AppointmentDetailsDrawer";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { NoAppointments } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import {
  appointmentCareService,
  appointmentService,
  medicalRecordService,
  prescriptionService,
} from "@/services/api";
import type { Appointment, MedicalRecord } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptionByAppointment, setPrescriptionByAppointment] = useState<
    Record<string, boolean>
  >({});
  const [noPrescriptionByAppointment, setNoPrescriptionByAppointment] =
    useState<Record<string, boolean>>({});
  const [recordsByAppointment, setRecordsByAppointment] = useState<
    Record<string, MedicalRecord[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();

  const hydrateClinicalData = async (nextAppointments: Appointment[]) => {
    const noPrescriptionMap = appointmentCareService.getNoPrescriptionMap();
    setNoPrescriptionByAppointment(noPrescriptionMap);

    const nextPrescriptionMap: Record<string, boolean> = {};
    await Promise.all(
      nextAppointments
        .filter((appointment) => appointment.status === "complete")
        .map(async (appointment) => {
          try {
            const result = await prescriptionService.getByAppointment(
              appointment.id,
            );
            nextPrescriptionMap[appointment.id] =
              !!result.data &&
              Array.isArray(result.data.medicines) &&
              result.data.medicines.length > 0;
          } catch {
            nextPrescriptionMap[appointment.id] = false;
          }
        }),
    );

    setPrescriptionByAppointment(nextPrescriptionMap);

    const patientId = nextAppointments[0]?.patientId;
    if (!patientId) {
      setRecordsByAppointment({});
      return;
    }

    try {
      const medicalRecordsResponse = await medicalRecordService.getByPatient();
      const grouped = (medicalRecordsResponse.data || []).reduce<
        Record<string, MedicalRecord[]>
      >((acc, record) => {
        if (!record.appointmentId) return acc;
        const current = acc[record.appointmentId] || [];
        acc[record.appointmentId] = [...current, record];
        return acc;
      }, {});
      setRecordsByAppointment(grouped);
    } catch {
      setRecordsByAppointment({});
    }
  };

  const fetchData = async () => {
    try {
      console.debug(
        "[PatientAppointments] Fetching appointments for current patient",
      );
      const response = await appointmentService.getByPatient();
      console.debug(
        "[PatientAppointments] Appointments fetched:",
        response.data.length,
        "appointments",
      );
      console.warn(
        "🚀 [PatientAppointments] LOADED",
        response.data.length,
        "appointments",
      );
      console.table(
        response.data.map((a) => ({
          ID: a.id,
          Status: a.status,
          Date: a.date,
          Doctor: a.doctor
            ? `${a.doctor.firstName} ${a.doctor.lastName}`
            : "N/A",
        })),
      );
      console.debug(
        "[PatientAppointments] Full appointments data:",
        response.data.map((a) => ({
          id: a.id,
          date: a.date,
          time: a.time,
          status: a.status,
          doctorId: a.doctorId,
          doctorName: a.doctor
            ? `${a.doctor.firstName} ${a.doctor.lastName}`
            : "No doctor",
        })),
      );
      setAppointments(response.data);
      await hydrateClinicalData(response.data);
    } catch (error) {
      console.error(
        "[PatientAppointments] Failed to fetch appointments:",
        error,
      );
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for external refresh triggers (e.g., after booking)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "appointments_refresh") {
        console.debug(
          "[PatientAppointments] Storage event detected, refreshing appointments",
        );
        setIsLoading(true);
        // Add small delay to ensure backend has persisted the data
        setTimeout(() => {
          appointmentService
            .getByPatient()
            .then((r) => {
              console.debug(
                "[PatientAppointments] Refreshed appointments:",
                r.data.length,
                "appointments",
              );
              setAppointments(r.data);
              return hydrateClinicalData(r.data);
            })
            .catch((err) =>
              console.error(
                "[PatientAppointments] Failed to fetch appointments on refresh:",
                err,
              ),
            )
            .finally(() => setIsLoading(false));
        }, 500);
      }
    };
    const onRefresh = () => {
      console.debug("[PatientAppointments] Refresh event triggered");
      setIsLoading(true);
      // Add small delay to ensure backend has persisted the data
      setTimeout(fetchData, 500);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("appointments:refresh", onRefresh as EventListener);

    // If refresh flag exists on mount, refresh once and clear it
    try {
      const flag = localStorage.getItem("appointments_refresh");
      if (flag) {
        console.debug(
          "[PatientAppointments] Refresh flag found on mount, refetching appointments",
        );
        (async () => {
          setIsLoading(true);
          // Add small delay to ensure backend has persisted the data
          await new Promise((resolve) => setTimeout(resolve, 500));
          try {
            const r = await appointmentService.getByPatient();
            console.debug(
              "[PatientAppointments] Mounted with refresh flag, fetched:",
              r.data.length,
              "appointments",
            );
            setAppointments(r.data);
            await hydrateClinicalData(r.data);
          } catch (err) {
            console.error(
              "[PatientAppointments] Failed to fetch appointments on mount refresh:",
              err,
            );
            setAppointments([]);
          } finally {
            setIsLoading(false);
            try {
              localStorage.removeItem("appointments_refresh");
            } catch (e) {}
          }
        })();
      }
    } catch (e) {}

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "appointments:refresh",
        onRefresh as EventListener,
      );
    };
  }, [user]);

  // Helper function to check if appointment is in the past
  const isAppointmentPast = (appointmentDate: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const apptDate = new Date(appointmentDate);
    apptDate.setHours(0, 0, 0, 0);
    return apptDate < today;
  };

  const upcoming = appointments.filter((a) => {
    const isPast = isAppointmentPast(a.date);
    return !isPast && a.status === "upcoming";
  });

  const past = appointments.filter((a) => {
    const isPast = isAppointmentPast(a.date);
    return isPast || a.status === "complete" || a.status === "cancelled";
  });

  // Debug logging for filtering
  console.warn("📋 [PatientAppointments] FILTERED RESULTS:");
  console.warn("📅 Upcoming:", upcoming.length, "appointments");
  console.table(
    upcoming.map((a) => ({ ID: a.id, Status: a.status, Date: a.date })),
  );
  console.warn("📅 Past:", past.length, "appointments");
  console.table(
    past.map((a) => ({ ID: a.id, Status: a.status, Date: a.date })),
  );

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDrawerOpen(true);
  };

  const handleCancel = async (id: string) => {
    try {
      await appointmentService.cancel(id);
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: "cancelled" as const } : a,
        ),
      );
      setDrawerOpen(false);
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel appointment.",
        variant: "destructive",
      });
    }
    await fetchData();
  };

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              My Appointments
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage your upcoming and past appointments
            </p>
          </div>
          <Link to="/booking">
            <Button className="gradient-bg border-0">
              <Calendar className="w-4 h-4 mr-2" />
              Book New
            </Button>
          </Link>
        </motion.div>

        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="upcoming">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            <TabsTrigger value="all">All ({appointments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <LoadingCard />
                ) : upcoming.length > 0 ? (
                  <div className="space-y-4">
                    {upcoming.map((appointment) => (
                      <div key={appointment.id} className="space-y-2">
                        <AppointmentCard
                          appointment={appointment}
                          onView={() => handleViewDetails(appointment)}
                          onCancel={() => handleCancel(appointment.id)}
                        />
                        <div className="px-2 text-xs text-muted-foreground">
                          Medical records for this visit:{" "}
                          {recordsByAppointment[appointment.id]?.length || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <NoAppointments
                    onBook={() => (window.location.href = "/booking")}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="past">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <LoadingCard />
                ) : past.length > 0 ? (
                  <div className="space-y-4">
                    {past.map((appointment) => (
                      <div key={appointment.id} className="space-y-2">
                        <AppointmentCard
                          appointment={appointment}
                          onView={() => handleViewDetails(appointment)}
                        />
                        <div className="px-2 text-xs text-muted-foreground">
                          {appointment.status === "complete" ? (
                            prescriptionByAppointment[appointment.id] ? (
                              <span>
                                Prescription is available for this visit.
                              </span>
                            ) : (
                              <span>
                                {noPrescriptionByAppointment[appointment.id]
                                  ? "No prescription for this visit"
                                  : "No prescription for this visit"}
                              </span>
                            )
                          ) : (
                            <span>Appointment is not completed yet.</span>
                          )}
                        </div>
                        <div className="px-2 text-xs text-muted-foreground">
                          Medical records for this visit:{" "}
                          {recordsByAppointment[appointment.id]?.length || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No past appointments
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <LoadingCard />
                ) : appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="space-y-2">
                        <AppointmentCard
                          appointment={appointment}
                          onView={() => handleViewDetails(appointment)}
                          onCancel={
                            appointment.status !== "cancelled" &&
                            appointment.status !== "complete"
                              ? () => handleCancel(appointment.id)
                              : undefined
                          }
                        />
                        {appointment.status === "complete" && (
                          <div className="px-2 text-xs text-muted-foreground">
                            {prescriptionByAppointment[appointment.id]
                              ? "Prescription is available for this visit."
                              : "No prescription for this visit"}
                          </div>
                        )}
                        <div className="px-2 text-xs text-muted-foreground">
                          Medical records for this visit:{" "}
                          {recordsByAppointment[appointment.id]?.length || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <NoAppointments
                    onBook={() => (window.location.href = "/booking")}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AppointmentDetailsDrawer
          appointment={selectedAppointment}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onCancel={handleCancel}
          role="patient"
        />
      </div>
    </DashboardLayout>
  );
}
