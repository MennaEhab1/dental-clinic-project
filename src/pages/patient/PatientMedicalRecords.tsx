import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  Calendar,
  Stethoscope,
  Pill,
  Paperclip,
  Eye,
  Download,
  Activity,
} from "lucide-react";
import type { MedicalRecord, Prescription } from "@/types";
import {
  appointmentService,
  medicalRecordService,
  prescriptionService,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import type { PrescriptionDetailsDTO } from "@/types/swagger";

function extractAppointmentIdFromPrescription(
  prescription: PrescriptionDetailsDTO,
): string | null {
  const raw =
    prescription.appointmentId ??
    prescription.appointmentID ??
    (prescription as Record<string, unknown>).appointmentId;
  if (raw === undefined || raw === null) return null;
  return String(raw);
}

function toDoctorDisplayName(record: MedicalRecord): string {
  const first = record.doctor?.firstName?.trim();
  const last = record.doctor?.lastName?.trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || "Unknown Doctor";
}

function toDoctorInitials(record: MedicalRecord): string {
  const firstInitial = record.doctor?.firstName?.trim()?.[0] || "D";
  const lastInitial = record.doctor?.lastName?.trim()?.[0] || "R";
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

function mapDoctorNameToRecord(rawDoctorName: string): MedicalRecord["doctor"] {
  const normalized = rawDoctorName.replace(/^\s*dr\.?\s+/i, "").trim();
  if (!normalized) return undefined;

  const [firstName = "Doctor", ...rest] = normalized.split(/\s+/).filter(Boolean);
  const lastName = rest.join(" ");
  return {
    id: `doctor-${normalized.toLowerCase().replace(/\s+/g, "-")}`,
    email: "",
    firstName,
    lastName,
    phone: "",
    avatar: "",
    role: "doctor",
    specialty: "general",
    qualifications: [],
    experience: 0,
    bio: "",
    consultationFee: 0,
    rating: 0,
    reviewCount: 0,
    availableSlots: [],
    workingDays: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mapPrescriptionDtoToPrescription(
  dto: PrescriptionDetailsDTO,
  appointmentId: string,
): Prescription {
  const medications = (dto.medicines || []).map((medicine, index) => ({
    medicineId: `prescription-${dto.prescriptionId || appointmentId}-medicine-${index}`,
    medicine: {
      id: `medicine-${index}`,
      name: medicine.medicineName || "Medicine",
      genericName: medicine.medicineName || "Medicine",
      category: "prescription",
      manufacturer: "",
      price: 0,
      stock: 0,
      unit: "",
      description: "",
    },
    dosage: medicine.dosage || "",
    frequency: medicine.frequency || "",
    duration: medicine.durationInDays
      ? `${medicine.durationInDays} day(s)`
      : "",
    notes: medicine.instructions || undefined,
  }));

  const instructions = (dto.medicines || [])
    .map((medicine) => medicine.instructions)
    .filter((value): value is string =>
      Boolean(value && value.trim().length > 0),
    )
    .join(" • ");

  return {
    id: String(dto.prescriptionId || `prescription-${appointmentId}`),
    appointmentId,
    medications,
    instructions,
    createdAt: dto.date || new Date().toISOString(),
  };
}

function mapAppointmentsToRecords(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appointments: any[],
): MedicalRecord[] {
  return appointments.map((appointment) => ({
    id: `record-${appointment.id}`,
    appointmentId: String(appointment.id),
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    doctor: appointment.doctor,
    patient: appointment.patient,
    date: appointment.date,
    type:
      appointment.recordType ||
      (appointment.prescription ? "prescription" : "treatment"),
    diagnosis:
      appointment.recordDiagnosis ||
      appointment.service?.name ||
      "Dental consultation",
    treatment:
      appointment.recordTreatment ||
      appointment.notes ||
      "Follow-up and treatment plan",
    notes:
      appointment.recordNotes || appointment.notes || "No additional notes.",
    toothNumber: appointment.recordToothNumber || undefined,
    attachments: [],
    prescription: appointment.prescription,
  }));
}

export default function PatientMedicalRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const appointmentsRes = await appointmentService.getByPatient();
        const appointments = (appointmentsRes.data || []).filter(
          (appointment) => appointment.status === "complete",
        );

        const prescriptionMap = new Map<string, Prescription>();
        const prescriptionDoctorMap = new Map<string, MedicalRecord["doctor"]>();
        try {
          const prescriptionsRes =
            await prescriptionService.getMyPrescriptions();
          (prescriptionsRes.data || []).forEach((dto) => {
            const appointmentId = extractAppointmentIdFromPrescription(dto);
            if (!appointmentId) return;

            prescriptionMap.set(
              appointmentId,
              mapPrescriptionDtoToPrescription(dto, appointmentId),
            );
            if (dto.doctorName) {
              prescriptionDoctorMap.set(
                appointmentId,
                mapDoctorNameToRecord(dto.doctorName),
              );
            }
          });
        } catch {
          // If prescriptions endpoint fails, still show medical records from appointments
        }

        await Promise.all(
          appointments
            .filter((appointment) => !prescriptionMap.has(String(appointment.id)))
            .map(async (appointment) => {
              try {
                const prescriptionRes = await prescriptionService.getByAppointment(
                  String(appointment.id),
                );
                const dto = prescriptionRes.data;
                if (!dto?.medicines || dto.medicines.length === 0) return;

                const appointmentId =
                  extractAppointmentIdFromPrescription(dto) ||
                  String(appointment.id);
                prescriptionMap.set(
                  appointmentId,
                  mapPrescriptionDtoToPrescription(dto, appointmentId),
                );
                if (dto.doctorName) {
                  prescriptionDoctorMap.set(
                    appointmentId,
                    mapDoctorNameToRecord(dto.doctorName),
                  );
                }
              } catch {
                // Keep rendering even when prescription details endpoint is unavailable
              }
            }),
        );

        const appointmentRecordDetails = new Map<string, MedicalRecord>();
        const standaloneMedicalRecords: MedicalRecord[] = [];
        const patientId = appointments[0]?.patientId;
        if (patientId) {
          try {
            const medicalRecordsResponse =
              await medicalRecordService.getByPatient(String(patientId));
            (medicalRecordsResponse.data || []).forEach((record) => {
              if (record.appointmentId) {
                appointmentRecordDetails.set(record.appointmentId, record);
                return;
              }

              standaloneMedicalRecords.push(record);
            });
          } catch {
            // Keep rendering appointment-based records when medical records endpoint is unavailable
          }
        }

        const recordsWithPrescriptions = appointments.map((appointment) => ({
          ...appointment,
          doctor:
            appointment.doctor ||
            appointmentRecordDetails.get(String(appointment.id))?.doctor ||
            prescriptionDoctorMap.get(String(appointment.id)),
          recordType: appointmentRecordDetails.get(String(appointment.id))?.type,
          recordDiagnosis:
            appointmentRecordDetails.get(String(appointment.id))?.diagnosis,
          recordTreatment:
            appointmentRecordDetails.get(String(appointment.id))?.treatment,
          recordNotes: appointmentRecordDetails.get(String(appointment.id))?.notes,
          recordToothNumber:
            appointmentRecordDetails.get(String(appointment.id))?.toothNumber,
          prescription: prescriptionMap.get(String(appointment.id)),
        }));

        const appointmentDerivedRecords =
          mapAppointmentsToRecords(recordsWithPrescriptions);

        const mergedRecords = [...standaloneMedicalRecords, ...appointmentDerivedRecords]
          .map((record) => ({
            ...record,
            diagnosis: record.diagnosis || "Medical record",
            treatment: record.treatment || "No treatment details provided.",
            notes: record.notes || "No additional notes.",
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setRecords(mergedRecords);
      } catch (error) {
        console.error("Failed to load medical records:", error);
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();
  }, [user]);

  const diagnoses = records.filter((r) => r.type === "diagnosis");
  const treatments = records.filter((r) => r.type === "treatment");
  const prescriptions = records.filter((r) => r.prescription);

  const typeIcon: Record<string, typeof FileText> = {
    diagnosis: Activity,
    treatment: Stethoscope,
    prescription: Pill,
    note: FileText,
  };

  const RecordCard = ({ record }: { record: MedicalRecord }) => {
    const Icon = typeIcon[record.type] || FileText;
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl border border-border hover:shadow-card transition-all cursor-pointer"
        onClick={() => {
          setSelectedRecord(record);
          setDetailsOpen(true);
        }}
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {record.diagnosis}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {record.treatment}
                </p>
              </div>
              <Badge
                variant="outline"
                className="capitalize text-[10px] shrink-0"
              >
                {record.type}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(record.date).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3" />
                Dr. {toDoctorDisplayName(record)}
              </span>
              {record.toothNumber && <span>Tooth: {record.toothNumber}</span>}
              {record.attachments && record.attachments.length > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {record.attachments.length} file(s)
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground">
            Medical Records
          </h1>
          <p className="text-muted-foreground text-sm">
            Your complete dental health history
          </p>
        </motion.div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">
              All Records ({records.length})
            </TabsTrigger>
            <TabsTrigger value="treatments">
              Treatments ({treatments.length})
            </TabsTrigger>
            <TabsTrigger value="diagnoses">
              Diagnoses ({diagnoses.length})
            </TabsTrigger>
            <TabsTrigger value="prescriptions">
              Prescriptions ({prescriptions.length})
            </TabsTrigger>
          </TabsList>

          {["all", "treatments", "diagnoses", "prescriptions"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardContent className="pt-6">
                  {isLoading ? (
                    <LoadingCard />
                  ) : (
                    <div className="space-y-3">
                      {(tab === "all"
                        ? records
                        : tab === "treatments"
                          ? treatments
                          : tab === "diagnoses"
                            ? diagnoses
                            : prescriptions
                      ).length > 0 ? (
                        (tab === "all"
                          ? records
                          : tab === "treatments"
                            ? treatments
                            : tab === "diagnoses"
                              ? diagnoses
                              : prescriptions
                        ).map((record) => (
                          <RecordCard key={record.id} record={record} />
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No records found
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Record Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-lg max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="font-display">Record Details</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedRecord.doctor?.avatar} />
                      <AvatarFallback>{toDoctorInitials(selectedRecord)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        Dr. {toDoctorDisplayName(selectedRecord)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedRecord.date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Diagnosis
                    </h4>
                    <p className="text-sm text-foreground">
                      {selectedRecord.diagnosis}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Treatment
                    </h4>
                    <p className="text-sm text-foreground">
                      {selectedRecord.treatment}
                    </p>
                  </div>

                  {selectedRecord.toothNumber && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Tooth Number
                      </h4>
                      <Badge variant="outline">
                        {selectedRecord.toothNumber}
                      </Badge>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Doctor's Notes
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedRecord.notes}
                    </p>
                  </div>

                  {selectedRecord.prescription && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Prescription
                      </h4>
                      <div className="space-y-2">
                        {selectedRecord.prescription.medications.map(
                          (med, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-lg border border-border"
                            >
                              <p className="font-medium text-foreground text-sm">
                                {med.medicine?.name || med.medicineId}
                              </p>
                              <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                                <span>Dosage: {med.dosage}</span>
                                <span>Freq: {med.frequency}</span>
                                <span>Duration: {med.duration}</span>
                              </div>
                              {med.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {med.notes}
                                </p>
                              )}
                            </div>
                          ),
                        )}
                        {selectedRecord.prescription.instructions && (
                          <p className="text-xs text-muted-foreground bg-warning/5 border border-warning/20 p-3 rounded-lg">
                            ⚠️ {selectedRecord.prescription.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRecord.attachments &&
                    selectedRecord.attachments.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Attachments
                        </h4>
                        <div className="space-y-2">
                          {selectedRecord.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-border"
                            >
                              <div className="flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {att.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {att.size}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
