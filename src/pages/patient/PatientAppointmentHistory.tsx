import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Download,
  ChevronDown,
  MessageCircle,
  Pill,
} from "lucide-react";
import type { Appointment, Prescription } from "@/types";
import { appointmentService, prescriptionService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface AppointmentHistoryItem extends Appointment {
  prescriptionDetails?: Prescription;
}

export default function PatientAppointmentHistory() {
  const [appointments, setAppointments] = useState<AppointmentHistoryItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentHistoryItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const result = await appointmentService.getByPatient();

        if (result.success && result.data) {
          // Filter only completed and cancelled appointments (past appointments)
          const pastAppointments = result.data.filter((apt) => {
            const aptDate = new Date(apt.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return (
              aptDate < today || ["complete", "cancelled"].includes(apt.status)
            );
          });

          // Sort by date descending (most recent first)
          const sortedAppointments = pastAppointments.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );

          // Fetch prescription details for completed appointments
          const appointmentsWithPrescriptions = await Promise.all(
            sortedAppointments.map(async (apt) => {
              if (apt.status === "complete" && apt.id) {
                try {
                  const prscResult = await prescriptionService.getByAppointment(
                    apt.id,
                  );
                  return {
                    ...apt,
                    prescriptionDetails: prscResult.data,
                  } as AppointmentHistoryItem;
                } catch {
                  return apt as AppointmentHistoryItem;
                }
              }
              return apt as AppointmentHistoryItem;
            }),
          );

          setAppointments(appointmentsWithPrescriptions);
        }
      } catch (error) {
        console.error("[PatientAppointmentHistory] Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const handleViewDetails = async (appointment: AppointmentHistoryItem) => {
    setSelectedAppointment(appointment);
    setDetailsOpen(true);
  };

  const handleDownloadPrescription = (appointment: AppointmentHistoryItem) => {
    if (!appointment.prescriptionDetails) return;

    const prescriptionText = `
PRESCRIPTION
Doctor: ${appointment.doctor?.firstName} ${appointment.doctor?.lastName}
Specialty: ${appointment.doctor?.specialty}
Date: ${new Date(appointment.date).toLocaleDateString()}

Instructions: ${appointment.prescriptionDetails.instructions || "N/A"}

Medications:
${
  appointment.prescriptionDetails?.medications
    ?.map(
      (med) =>
        `- ${med.medicine?.name || "Unknown"}: ${med.dosage} - ${med.frequency} for ${med.duration}`,
    )
    .join("\n") || "No medications prescribed"
}
    `;

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(prescriptionText),
    );
    element.setAttribute("download", `prescription_${appointment.id}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isLoading) {
    return (
      <DashboardLayout role="patient">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Appointment History
          </h1>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Appointment History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View your past appointments and prescriptions
          </p>
        </div>

        {appointments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No appointment history yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {appointments.map((appointment, index) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-12 w-12 mt-1">
                          <AvatarImage src={appointment.doctor?.avatar} />
                          <AvatarFallback>
                            {appointment.doctor?.firstName?.[0]}
                            {appointment.doctor?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                              Dr. {appointment.doctor?.firstName}{" "}
                              {appointment.doctor?.lastName}
                            </h3>
                            <StatusBadge status={appointment.status} />
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {appointment.doctor?.specialty ||
                              "General Dentistry"}
                          </p>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              {new Date(appointment.date).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Clock className="w-4 h-4" />
                              {appointment.time || "N/A"}
                            </div>
                            {appointment.service && (
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <FileText className="w-4 h-4" />
                                {appointment.service.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-col">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(appointment)}
                          className="gap-2"
                        >
                          <ChevronDown className="w-4 h-4" />
                          Details
                        </Button>
                        {appointment.prescriptionDetails && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDownloadPrescription(appointment)
                            }
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {/* Doctor Info */}
                <div className="flex items-start gap-4 pb-4 border-b">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedAppointment.doctor?.avatar} />
                    <AvatarFallback>
                      {selectedAppointment.doctor?.firstName?.[0]}
                      {selectedAppointment.doctor?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      Dr. {selectedAppointment.doctor?.firstName}{" "}
                      {selectedAppointment.doctor?.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedAppointment.doctor?.specialty}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedAppointment.doctor?.experience} years of
                      experience
                    </p>
                  </div>
                  <StatusBadge status={selectedAppointment.status} />
                </div>

                {/* Appointment Info */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">
                      Date & Time
                    </label>
                    <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white mt-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(
                        selectedAppointment.date,
                      ).toLocaleDateString()}{" "}
                      at {selectedAppointment.time}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">
                      Service
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {selectedAppointment.service?.name ||
                        "General Consultation"}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">
                      Notes
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {selectedAppointment.notes || "No notes added"}
                    </p>
                  </div>
                </div>

                {/* Prescription Details */}
                {selectedAppointment.prescriptionDetails && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Pill className="w-4 h-4" />
                        Prescription
                      </h4>

                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                          Instructions
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                          {selectedAppointment.prescriptionDetails
                            .instructions || "No specific instructions"}
                        </p>
                      </div>

                      {selectedAppointment.prescriptionDetails.medications &&
                        selectedAppointment.prescriptionDetails.medications
                          .length > 0 && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">
                              Medications
                            </label>
                            <div className="mt-2 space-y-2">
                              {selectedAppointment.prescriptionDetails.medications.map(
                                (med, idx) => (
                                  <Card
                                    key={idx}
                                    className="bg-gray-50 dark:bg-gray-900"
                                  >
                                    <CardContent className="pt-3">
                                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                                        {med.medicine?.name ||
                                          "Unknown Medication"}
                                      </p>
                                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400 mt-2">
                                        <div>
                                          <span className="font-semibold">
                                            Dosage:
                                          </span>{" "}
                                          {med.dosage}
                                        </div>
                                        <div>
                                          <span className="font-semibold">
                                            Frequency:
                                          </span>{" "}
                                          {med.frequency}
                                        </div>
                                        <div>
                                          <span className="font-semibold">
                                            Duration:
                                          </span>{" "}
                                          {med.duration}
                                        </div>
                                      </div>
                                      {med.notes && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                          Notes: {med.notes}
                                        </p>
                                      )}
                                    </CardContent>
                                  </Card>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </>
                )}

                {/* Write Review Button */}
                {selectedAppointment.status === "complete" && (
                  <>
                    <Separator />
                    <Button className="w-full gap-2" variant="default">
                      <MessageCircle className="w-4 h-4" />
                      Write a Review
                    </Button>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
