//PatientPrescriptions
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
  AlertCircle,
  AlertTriangle,
  Calendar,
  ChevronRight,
  FileText,
  Store,
} from "lucide-react";
import { PharmacyFinderDialog } from "@/components/pharmacy-finder/PharmacyFinderDialog";
import type {
  Appointment,
  Doctor,
  Prescription,
  PrescriptionMedication,
} from "@/types";
import type { PrescriptionDetailsDTO } from "@/types/swagger";
import {
  appointmentService,
  doctorService,
  pharmacyService,
  prescriptionService,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface EnhancedPrescription extends Prescription {
  doctorName?: string;
  doctorAvatar?: string;
  doctorSpecialty?: string;
  appointmentDate?: string;
  appointmentService?: string;
}

function normalizeLookupKey(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return String(numeric);

  const numericMatch = raw.match(/\d+/);
  if (numericMatch) return String(Number(numericMatch[0]));

  return raw.toLowerCase();
}

function extractAppointmentIdFromPrescription(
  prescription: PrescriptionDetailsDTO,
): string | null {
  const raw = prescription.appointmentId ?? prescription.appointmentID;
  if (raw === undefined || raw === null) return null;
  return String(raw);
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

function toDoctorDisplayName(rawValue: string): string {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  if (!raw.includes("@")) return raw;

  const localPart = raw
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();
  return toTitleCase(localPart);
}

function getAppointmentFromMap(
  appointmentsById: Map<string, Appointment>,
  appointmentId: string | null,
): Appointment | undefined {
  if (!appointmentId) return undefined;
  return (
    appointmentsById.get(appointmentId) ||
    appointmentsById.get(normalizeLookupKey(appointmentId))
  );
}

function normalizeMedicineName(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMedicinePrice(raw: Record<string, unknown>): number | null {
  const value =
    raw.price ??
    raw.Price ??
    raw.unitPrice ??
    raw.UnitPrice ??
    raw.medicinePrice ??
    raw.MedicinePrice ??
    null;

  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function extractMedicineQuantity(raw: Record<string, unknown>): number | null {
  const value = raw.quantity ?? raw.Quantity ?? raw.qty ?? raw.Qty ?? null;
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function extractMedicineUnit(raw: Record<string, unknown>): string {
  return String(raw.unit ?? raw.Unit ?? "").trim();
}

function mapPrescriptionDtoToEnhanced(
  dto: PrescriptionDetailsDTO,
  appointmentsById: Map<string, Appointment>,
  doctorsById: Map<string, Doctor>,
  medicinesById: Map<string, { price: number; unit: string }>,
  medicinesByName: Map<string, { price: number; unit: string }>,
): EnhancedPrescription {
  const appointmentId = extractAppointmentIdFromPrescription(dto);
  const appointment = getAppointmentFromMap(appointmentsById, appointmentId);
  const doctorFromAppointment =
    appointment?.doctor ||
    (appointment?.doctorId
      ? doctorsById.get(normalizeLookupKey(appointment.doctorId))
      : undefined);

  const doctorNameFromAppointment = [
    doctorFromAppointment?.firstName,
    doctorFromAppointment?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const dtoDoctorName = toDoctorDisplayName(String(dto.doctorName || ""));
  const doctorName = dtoDoctorName || doctorNameFromAppointment;

  const medicines = dto.medicines || [];
  const medications: PrescriptionMedication[] = medicines.map(
    (medicine, index) => {
      const rawMedicine = medicine as unknown as Record<string, unknown>;
      const catalogMedicineId = extractCatalogMedicineId(rawMedicine);
      const nameKey = normalizeMedicineName(medicine.medicineName || "");

      const catalogById = catalogMedicineId
        ? medicinesById.get(normalizeLookupKey(catalogMedicineId))
        : undefined;
      const catalogByName = nameKey ? medicinesByName.get(nameKey) : undefined;

      const medicinePrice =
        extractMedicinePrice(rawMedicine) ??
        catalogById?.price ??
        catalogByName?.price ??
        0;
      const medicineUnit =
        extractMedicineUnit(rawMedicine) ||
        catalogById?.unit ||
        catalogByName?.unit ||
        "";

      return {
        medicineId: `prescription-${dto.prescriptionId || appointmentId || "unknown"}-medicine-${index}`,
        catalogMedicineId,
        medicine: {
          id: `medicine-${dto.prescriptionId || appointmentId || "unknown"}-${index}`,
          name: medicine.medicineName || "Medicine",
          genericName: medicine.medicineName || "Medicine",
          category: "prescription",
          manufacturer: "",
          price: medicinePrice,
          stock: 0,
          unit: medicineUnit,
          description: "",
        },
        quantity: extractMedicineQuantity(rawMedicine),
        dosage: medicine.dosage || "",
        frequency: medicine.frequency || "",
        duration: medicine.durationInDays
          ? `${medicine.durationInDays} day(s)`
          : "",
        notes: medicine.instructions || undefined,
      };
    },
  );

  const instructions = medicines
    .map((medicine) => medicine.instructions || "")
    .map((instruction) => instruction.trim())
    .filter(Boolean)
    .join(" • ");

  const dtoDate = String(dto.date || "").trim();
  const createdAt =
    dtoDate && !Number.isNaN(new Date(dtoDate).getTime())
      ? dtoDate
      : appointment?.date
        ? `${appointment.date}T00:00:00`
        : "";

  return {
    id: String(
      dto.prescriptionId || `prescription-${appointmentId || Date.now()}`,
    ),
    appointmentId: appointmentId || "",
    medications,
    instructions,
    createdAt,
    doctorName,
    doctorAvatar: doctorFromAppointment?.avatar,
    doctorSpecialty: doctorFromAppointment?.specialty
      ? String(doctorFromAppointment.specialty).replace("-", " ")
      : "General Dentistry",
    appointmentDate: appointment?.date,
    appointmentService: appointment?.service?.name,
  };
}

// ضيفي الدالة دي فوق mapPrescriptionDtoToEnhanced
function extractCatalogMedicineId(
  medicine: Record<string, unknown>,
): string | null {
  const raw =
    medicine.medicineId ??
    medicine.MedicineId ??
    medicine.medicineID ??
    medicine.MedicineID ??
    medicine.catalogMedicineId ??
    null;
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  return str && !Number.isNaN(Number(str)) ? str : null;
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
  const [pharmacyFinderMedicine, setPharmacyFinderMedicine] = useState<{
    id: string;
    name: string;
  } | null>(null);
  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setIsLoading(true);

        const [result, appointmentsResult, doctorsResult, medicinesResult] =
          await Promise.all([
            prescriptionService.getMyPrescriptions(),
            appointmentService.getByPatient(),
            doctorService.getAll(),
            pharmacyService.getAll(),
          ]);

        if (result.success && result.data && Array.isArray(result.data)) {
          const appointmentsById = new Map<string, Appointment>();
          const completedAppointments = (appointmentsResult.data || []).filter(
            (appointment) => appointment.status === "complete",
          );
          completedAppointments.forEach((appointment) => {
            const rawId = String(appointment.id);
            const normalizedId = normalizeLookupKey(rawId);
            appointmentsById.set(rawId, appointment);
            if (normalizedId && normalizedId !== rawId) {
              appointmentsById.set(normalizedId, appointment);
            }
          });

          const doctorsById = new Map<string, Doctor>();
          (doctorsResult.data || []).forEach((doctor) => {
            const key = normalizeLookupKey(doctor.id);
            if (key) doctorsById.set(key, doctor);
          });

          const medicinesById = new Map<
            string,
            { price: number; unit: string }
          >();
          const medicinesByName = new Map<
            string,
            { price: number; unit: string }
          >();

          (medicinesResult.data || []).forEach((medicine) => {
            const idKey = normalizeLookupKey(medicine.id);
            if (idKey && !medicinesById.has(idKey)) {
              medicinesById.set(idKey, {
                price: Number(medicine.price || 0),
                unit: String(medicine.unit || "").trim(),
              });
            }

            const nameKey = normalizeMedicineName(medicine.name);
            if (nameKey && !medicinesByName.has(nameKey)) {
              medicinesByName.set(nameKey, {
                price: Number(medicine.price || 0),
                unit: String(medicine.unit || "").trim(),
              });
            }

            const genericKey = normalizeMedicineName(medicine.genericName);
            if (genericKey && !medicinesByName.has(genericKey)) {
              medicinesByName.set(genericKey, {
                price: Number(medicine.price || 0),
                unit: String(medicine.unit || "").trim(),
              });
            }
          });

          const prescriptionsByAppointment = new Map<
            string,
            EnhancedPrescription
          >();

          result.data.forEach((dto) => {
            const appointmentId = extractAppointmentIdFromPrescription(dto);
            if (!appointmentId) return;

            const mapped = mapPrescriptionDtoToEnhanced(
              dto,
              appointmentsById,
              doctorsById,
              medicinesById,
              medicinesByName,
            );
            prescriptionsByAppointment.set(appointmentId, mapped);
          });

          await Promise.all(
            completedAppointments
              .filter(
                (appointment) =>
                  !prescriptionsByAppointment.has(String(appointment.id)),
              )
              .map(async (appointment) => {
                try {
                  const byAppointment =
                    await prescriptionService.getByAppointment(
                      String(appointment.id),
                    );
                  if (!byAppointment.data?.medicines?.length) return;
                  const mapped = mapPrescriptionDtoToEnhanced(
                    byAppointment.data,
                    appointmentsById,
                    doctorsById,
                    medicinesById,
                    medicinesByName,
                  );
                  prescriptionsByAppointment.set(
                    String(appointment.id),
                    mapped,
                  );
                } catch {
                  // Keep rendering available prescriptions even if one appointment lookup fails.
                }
              }),
          );

          const enhanced = Array.from(prescriptionsByAppointment.values())
            .filter((prescription) => {
              const hasMeds = (prescription.medications || []).length > 0;
              const hasInstructions = Boolean(
                String(prescription.instructions || "").trim(),
              );
              return hasMeds || hasInstructions;
            })
            .sort(
              (a, b) =>
                new Date(b.createdAt || "").getTime() -
                new Date(a.createdAt || "").getTime(),
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
            View your prescriptions
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
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      {/* Left Side - Doctor Info */}
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-12 w-12 mt-1 shrink-0">
                          <AvatarImage src={prescription.doctorAvatar} />
                          <AvatarFallback>
                            {prescription.doctorName?.[0]}
                            {prescription.doctorName?.split(" ")[1]?.[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {prescription.doctorName
                                ? `Dr. ${prescription.doctorName}`
                                : "Doctor not provided"}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {prescription.doctorSpecialty ||
                                "General Dentistry"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 mt-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 shrink-0" />
                              {new Date(
                                prescription.createdAt,
                              ).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Pill className="w-4 h-4 shrink-0" />
                              {prescription.medications?.length || 0}{" "}
                              medications
                            </div>
                            {prescription.appointmentService && (
                              <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4 shrink-0" />
                                {prescription.appointmentService}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side - Actions */}
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(prescription)}
                          className="gap-2 group-hover:bg-gray-100 dark:group-hover:bg-gray-800 w-full sm:w-auto"
                        >
                          View Details
                          <ChevronRight className="w-4 h-4" />
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
        <DialogContent className="max-w-3xl h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>

          {selectedPrescription && (
            <ScrollArea className="flex-1 px-6 py-5 min-h-0">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start gap-4 pb-4 border-b">
                  <Avatar className="h-16 w-16 shrink-0">
                    <AvatarImage src={selectedPrescription.doctorAvatar} />
                    <AvatarFallback>
                      {selectedPrescription.doctorName?.[0]}
                      {selectedPrescription.doctorName?.split(" ")[1]?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                      {selectedPrescription.doctorName
                        ? `Dr. ${selectedPrescription.doctorName}`
                        : "Doctor not provided"}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPrescription.doctorSpecialty}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
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

                                {/* Usage Details - Responsive Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
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
                                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">
                                      Quantity
                                    </p>
                                    <p className="text-gray-900 dark:text-white font-medium mt-1">
                                      {med.quantity ?? "N/A"}
                                    </p>
                                  </div>
                                </div>

                                {med.notes && (
                                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded flex gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-900 dark:text-amber-200">
                                      {med.notes}
                                    </p>
                                  </div>
                                )}

                                <div className="pt-1">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() =>
                                      setPharmacyFinderMedicine({
                                        id: med.catalogMedicineId || "",
                                        name:
                                          med.medicine?.name || "this medicine",
                                      })
                                    }
                                  >
                                    <Store className="w-4 h-4" />
                                    Find Available Pharmacies
                                  </Button>
                                  {!med.catalogMedicineId && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Medicine ID is missing in prescription
                                      data. We will match by medicine name.
                                    </p>
                                  )}
                                </div>

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
        {pharmacyFinderMedicine && (
          <PharmacyFinderDialog
            open={Boolean(pharmacyFinderMedicine)}
            onOpenChange={(isOpen) => {
              if (!isOpen) setPharmacyFinderMedicine(null);
            }}
            medicineId={pharmacyFinderMedicine.id}
            medicineName={pharmacyFinderMedicine.name}
          />
        )}
      </Dialog>
    </DashboardLayout>
  );
}
