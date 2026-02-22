import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
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
  Pill,
  Download,
  FileText,
  Clock,
  AlertCircle,
  Calendar,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import type { Prescription, PrescriptionMedication } from "@/types";
import { prescriptionService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface EnhancedPrescription extends Prescription {
  doctorName?: string;
  doctorAvatar?: string;
  doctorSpecialty?: string;
  appointmentDate?: string;
  appointmentService?: string;
}

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<EnhancedPrescription[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] =
    useState<EnhancedPrescription | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setIsLoading(true);

        // Fetch prescriptions directly from backend
        const result = await prescriptionService.getMyPrescriptions();

        if (result.success && result.data && Array.isArray(result.data)) {
          // Sort by creation date, most recent first
          const sortedPrescriptions = result.data.sort(
            (a, b) =>
              new Date(b.date || "").getTime() -
              new Date(a.date || "").getTime(),
          );

          // Convert to enhanced prescriptions
          const enhanced = sortedPrescriptions.map(
            (prsc) =>
              ({
                ...prsc,
              }) as EnhancedPrescription,
          );

          setPrescriptions(enhanced);
          console.debug(
            "[PatientPrescriptions] Loaded prescriptions:",
            enhanced.length,
          );
        } else {
          console.debug(
            "[PatientPrescriptions] No prescriptions found or invalid response",
          );
          setPrescriptions([]);
        }
      } catch (error) {
        console.error(
          "[PatientPrescriptions] Error fetching prescriptions:",
          error,
        );
        setPrescriptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrescriptions();
  }, [user]);

  const handleViewDetails = (prescription: EnhancedPrescription) => {
    setSelectedPrescription(prescription);
    setDetailsOpen(true);
  };

  const handleDownloadPrescription = (prescription: EnhancedPrescription) => {
    const prescriptionText = `
╔═══════════════════════════════════════════════════════╗
║                    PRESCRIPTION                        ║
╚═══════════════════════════════════════════════════════╝

Doctor: Dr. ${prescription.doctorName || "Unknown"}
Specialty: ${prescription.doctorSpecialty || "General Dentistry"}
Date Prescribed: ${new Date(prescription.createdAt).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    )}

Service: ${prescription.appointmentService || "General Consultation"}

─────────────────────────────────────────────────────────
INSTRUCTIONS:
${prescription.instructions || "No specific instructions provided"}

─────────────────────────────────────────────────────────
MEDICATIONS:

${
  prescription.medications && prescription.medications.length > 0
    ? prescription.medications
        .map(
          (med: PrescriptionMedication, idx: number) => `
${idx + 1}. ${med.medicine?.name || "Unknown Medication"}
   Generic Name: ${med.medicine?.genericName || "N/A"}
   Manufacturer: ${med.medicine?.manufacturer || "N/A"}
   
   Dosage: ${med.dosage}
   Frequency: ${med.frequency}
   Duration: ${med.duration}
   ${med.notes ? `Notes: ${med.notes}` : ""}
   `,
        )
        .join("\n")
    : "No medications prescribed"
}

─────────────────────────────────────────────────────────
IMPORTANT INFORMATION:

⚠️  Side Effects & Warnings:
${
  prescription.medications && prescription.medications.length > 0
    ? prescription.medications
        .map((med: PrescriptionMedication) => {
          if (
            med.medicine?.sideEffects &&
            med.medicine.sideEffects.length > 0
          ) {
            return `\n${med.medicine.name}:\n${med.medicine.sideEffects.map((se) => `  • ${se}`).join("\n")}`;
          }
          return "";
        })
        .filter((text) => text.length > 0)
        .join("\n")
    : "Refer to medication labels for warnings"
}

═══════════════════════════════════════════════════════════
    For questions about your prescription, please
    contact your dentist or healthcare provider.
═══════════════════════════════════════════════════════════
    `;

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(prescriptionText),
    );
    element.setAttribute(
      "download",
      `prescription_${new Date(prescription.createdAt).toISOString().split("T")[0]}.txt`,
    );
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
            Prescriptions
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
            Prescriptions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View and download your prescriptions
          </p>
        </div>

        {prescriptions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No prescriptions yet
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Prescriptions from completed appointments will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {prescriptions.map((prescription, index) => (
              <motion.div
                key={prescription.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow group cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left Side - Doctor Info */}
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-12 w-12 mt-1">
                          <AvatarImage src={prescription.doctorAvatar} />
                          <AvatarFallback>
                            {prescription.doctorName?.[0]}
                            {prescription.doctorName?.split(" ")[1]?.[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              Dr. {prescription.doctorName}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {prescription.doctorSpecialty ||
                                "General Dentistry"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 mt-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(
                                prescription.createdAt,
                              ).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Pill className="w-4 h-4" />
                              {prescription.medications?.length || 0}{" "}
                              medications
                            </div>
                            {prescription.appointmentService && (
                              <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                {prescription.appointmentService}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side - Actions */}
                      <div className="flex gap-2 flex-col">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(prescription)}
                          className="gap-2 group-hover:bg-gray-100 dark:group-hover:bg-gray-800"
                        >
                          View Details
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownloadPrescription(prescription)
                          }
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Prescription Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>

          {selectedPrescription && (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4 pb-4 border-b">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedPrescription.doctorAvatar} />
                    <AvatarFallback>
                      {selectedPrescription.doctorName?.[0]}
                      {selectedPrescription.doctorName?.split(" ")[1]?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                      Dr. {selectedPrescription.doctorName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPrescription.doctorSpecialty}
                    </p>
                    <div className="flex gap-4 text-xs text-gray-500 mt-2">
                      <span>
                        Prescribed:{" "}
                        {new Date(
                          selectedPrescription.createdAt,
                        ).toLocaleDateString()}
                      </span>
                      {selectedPrescription.appointmentService && (
                        <span>
                          Service: {selectedPrescription.appointmentService}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() =>
                      handleDownloadPrescription(selectedPrescription)
                    }
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>

                {/* Instructions */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    General Instructions
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    {selectedPrescription.instructions ||
                      "No specific instructions provided"}
                  </p>
                </div>

                {/* Medications */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    Medications ({selectedPrescription.medications?.length || 0}
                    )
                  </h4>

                  <div className="space-y-3">
                    {selectedPrescription.medications &&
                    selectedPrescription.medications.length > 0 ? (
                      selectedPrescription.medications.map(
                        (med: PrescriptionMedication, idx: number) => (
                          <Card key={idx} className="border">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 gap-4">
                                {/* Medication Header */}
                                <div>
                                  <h5 className="font-semibold text-gray-900 dark:text-white">
                                    {med.medicine?.name || "Unknown Medication"}
                                  </h5>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Generic:{" "}
                                    {med.medicine?.genericName || "N/A"}
                                  </p>
                                </div>

                                {/* Usage Details */}
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">
                                      Dosage
                                    </p>
                                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                                      {med.dosage}
                                    </p>
                                  </div>
                                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">
                                      Frequency
                                    </p>
                                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                                      {med.frequency}
                                    </p>
                                  </div>
                                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">
                                      Duration
                                    </p>
                                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                                      {med.duration}
                                    </p>
                                  </div>
                                </div>

                                {/* Additional Info */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase">
                                      Manufacturer
                                    </p>
                                    <p className="text-gray-900 dark:text-white mt-1">
                                      {med.medicine?.manufacturer || "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase">
                                      Price
                                    </p>
                                    <p className="text-gray-900 dark:text-white mt-1">
                                      ${med.medicine?.price || "N/A"}
                                    </p>
                                  </div>
                                </div>

                                {/* Notes */}
                                {med.notes && (
                                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded flex gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-900 dark:text-amber-200">
                                      {med.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Side Effects */}
                                {med.medicine?.sideEffects &&
                                  med.medicine.sideEffects.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                                        Possible Side Effects
                                      </p>
                                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                        {med.medicine.sideEffects.map(
                                          (effect, i) => (
                                            <li key={i} className="flex gap-2">
                                              <span className="text-gray-400 mt-1">
                                                •
                                              </span>
                                              {effect}
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    </div>
                                  )}
                              </div>
                            </CardContent>
                          </Card>
                        ),
                      )
                    ) : (
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-gray-500">
                            No medications prescribed
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Important Notes */}
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase mb-2">
                      Important Information
                    </p>
                    <ul className="text-sm text-blue-900 dark:text-blue-200 space-y-1">
                      <li>• Take medications exactly as prescribed</li>
                      <li>
                        • Do not skip doses or stop medication without
                        consulting your doctor
                      </li>
                      <li>
                        • Store medications in a cool, dry place away from
                        direct sunlight
                      </li>
                      <li>
                        • If you experience severe side effects, contact your
                        healthcare provider immediately
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
