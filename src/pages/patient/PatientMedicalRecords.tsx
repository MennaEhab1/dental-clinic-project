// PatientMedicalRecords.tsx
// ✅ محدّث ليستخدم GET /api/MedicalRecords/my-records
// ✅ لو الـ user ضغط على record بيعمل GET /api/MedicalRecords/details/{id}
// ✅ الـ prescription data جاية من الـ my-records مباشرة (لو الـ backend بيرجعها)
//    أو من prescriptionService.getByAppointment كـ fallback

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
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
  Loader2,
} from "lucide-react";
import type { MedicalRecord, Prescription } from "@/types";
import {
  medicalRecordService,
  prescriptionService,
  isBackendMedicalRecordId,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { PrescriptionDetailsDTO } from "@/types/swagger";

// ──────────────────────────────────────────────────────────────
// Helper: extract appointmentId from PrescriptionDetailsDTO
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// Helpers: doctor display
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// Helper: map PrescriptionDetailsDTO → Prescription
// ──────────────────────────────────────────────────────────────
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
    .map((m) => m.instructions)
    .filter((v): v is string => Boolean(v && v.trim().length > 0))
    .join(" • ");

  return {
    id: String(dto.prescriptionId || `prescription-${appointmentId}`),
    appointmentId,
    medications,
    instructions,
    createdAt: dto.date || new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export default function PatientMedicalRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { user, isLoading: authLoading } = useAuth();

  // ── Fetch all records using /my-records ─────────────────────
  useEffect(() => {
    if (authLoading) return;

    const fetchRecords = async () => {
      setIsLoading(true);
      try {
        // 1️⃣  Primary: GET /api/MedicalRecords/my-records (JWT-resolved)
        const recordsRes = await medicalRecordService.getByPatient();
        if (!recordsRes.success) {
          toast({
            title: "Could not load records",
            description:
              recordsRes.message ||
              "Unable to fetch your medical records from the server.",
            variant: "destructive",
          });
        }
        let baseRecords = recordsRes.data || [];

        // 2️⃣  Enrich with prescriptions for any record that has an appointmentId
        //     but no prescription yet (graceful — if the endpoint fails we still render)
        const prescriptionMap = new Map<string, Prescription>();

        try {
          const prescriptionsRes =
            await prescriptionService.getMyPrescriptions();
          (prescriptionsRes.data || []).forEach((dto) => {
            const apptId = extractAppointmentIdFromPrescription(dto);
            if (!apptId) return;
            prescriptionMap.set(
              apptId,
              mapPrescriptionDtoToPrescription(dto, apptId),
            );
          });
        } catch {
          // prescriptions endpoint unavailable — carry on without
        }

        // Attach prescription to matching records
        baseRecords = baseRecords.map((record) => {
          if (record.prescription) return record; // already has prescription from backend
          if (!record.appointmentId) return record;
          const prescription = prescriptionMap.get(record.appointmentId);
          return prescription ? { ...record, prescription } : record;
        });

        // Sort newest first
        baseRecords.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        setRecords(baseRecords);
      } catch (error) {
        console.error("[PatientMedicalRecords] Failed to load records:", error);
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();
  }, [user, authLoading]);

  // ── Open detail dialog ──────────────────────────────────────
  const handleOpenDetails = async (record: MedicalRecord) => {
    setSelectedRecord(record);
    setDetailsOpen(true);

    // Fetch detailed view from /details/{id} to get the latest data
    if (isBackendMedicalRecordId(record.id)) {
      setDetailsLoading(true);
      try {
        const res = await medicalRecordService.getById(record.id);
        if (res.success && res.data) {
          // Preserve prescription if the detail endpoint doesn't return it
          const enriched = {
            ...res.data,
            prescription: res.data.prescription ?? record.prescription,
          };
          setSelectedRecord(enriched);
        }
      } catch {
        // Keep showing the list-level data on failure
      } finally {
        setDetailsLoading(false);
      }
    }
  };

  // ── Derived lists ───────────────────────────────────────────
  const diagnoses = records.filter((r) => r.type === "diagnosis");
  const treatments = records.filter((r) => r.type === "treatment");
  const prescriptions = records.filter((r) => r.prescription);

  const typeIcon: Record<string, typeof FileText> = {
    diagnosis: Activity,
    treatment: Stethoscope,
    prescription: Pill,
    note: FileText,
  };

  // ── Sub-component: RecordCard ────────────────────────────────
  const RecordCard = ({ record }: { record: MedicalRecord }) => {
    const Icon = typeIcon[record.type] || FileText;
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl border border-border hover:shadow-card transition-all cursor-pointer"
        onClick={() => handleOpenDetails(record)}
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {record.diagnosis || "Medical record"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {record.treatment || "No treatment details provided."}
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

  // ── Render ──────────────────────────────────────────────────
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
            {/* <TabsTrigger value="treatments">
              Treatments ({treatments.length})
            </TabsTrigger>
            <TabsTrigger value="diagnoses">
              Diagnoses ({diagnoses.length})
            </TabsTrigger>
            <TabsTrigger value="prescriptions">
              Prescriptions ({prescriptions.length}) */}
            {/* </TabsTrigger> */}
          </TabsList>

          {(
            [
              { value: "all", data: records },
              { value: "treatments", data: treatments },
              { value: "diagnoses", data: diagnoses },
              { value: "prescriptions", data: prescriptions },
            ] as const
          ).map(({ value, data }) => (
            <TabsContent key={value} value={value}>
              <Card>
                <CardContent className="pt-6">
                  {isLoading ? (
                    <LoadingCard />
                  ) : data.length > 0 ? (
                    <div className="space-y-3">
                      {data.map((record, index) => (
                        <RecordCard
                          key={
                            record.id ||
                            record.appointmentId ||
                            `record-${index}`
                          }
                          record={record}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No records found
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* ── Record Details Dialog ── */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-lg max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="font-display">Record Details</DialogTitle>
            </DialogHeader>

            {detailsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : selectedRecord ? (
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-5">
                  {/* Doctor + date */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedRecord.doctor?.avatar} />
                      <AvatarFallback>
                        {toDoctorInitials(selectedRecord)}
                      </AvatarFallback>
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

                  {/* Diagnosis */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Diagnosis
                    </h4>
                    <p className="text-sm text-foreground">
                      {selectedRecord.diagnosis || "—"}
                    </p>
                  </div>

                  {/* Treatment */}
                  {/* <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Treatment
                    </h4>
                    <p className="text-sm text-foreground">
                      {selectedRecord.treatment || "—"}
                    </p>
                  </div> */}

                  {/* Tooth number */}
                  {/* {selectedRecord.toothNumber && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Tooth Number
                      </h4>
                      <Badge variant="outline">
                        {selectedRecord.toothNumber}
                      </Badge>
                    </div>
                  )} */}

                  {/* Notes */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Doctor's Notes
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedRecord.notes || "No additional notes."}
                    </p>
                  </div>

                  {/* Prescription */}
                  {/* {selectedRecord.prescription && (
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
                  )} */}

                  {/* Attachments */}
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
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
