// DoctorMedicalRecords.tsx
// Uses GET /api/MedicalRecords/my-created-medical-records for the doctor's records
// POST /api/MedicalRecords/create to add records
// GET /api/MedicalRecords/details/{id} for record details
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  FileText,
  Calendar,
  Stethoscope,
  Pill,
  Activity,
  Save,
  Loader2,
} from "lucide-react";
import {
  doctorService,
  medicalRecordService,
  pharmacyService,
  prescriptionService,
  isBackendMedicalRecordId,
} from "@/services/api";
import type { Appointment, MedicalRecord, Patient, Medicine } from "@/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function parseNumericId(value: string): number | null {
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  const matched = value.match(/\d+/);
  if (!matched) return null;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDurationDays(value: string): number | null {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const matched = value.match(/\d+/);
  if (!matched) return null;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export default function DoctorMedicalRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [latestAppointmentByPatient, setLatestAppointmentByPatient] = useState<
    Record<string, Appointment>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<"diagnosis" | "prescription" | "note">(
    "diagnosis",
  );

  // Detail dialog state
  const [detailRecord, setDetailRecord] = useState<MedicalRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // New record form
  const [newRecord, setNewRecord] = useState({
    patientId: "",
    diagnosis: "",
    treatment: "",
    notes: "",
    toothNumber: "",
  });

  // New prescription form
  const [newPrescription, setNewPrescription] = useState({
    patientId: "",
    medicineId: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });

  const { user } = useAuth();

  // ── Fetch data ───────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordsRes, appointmentsRes, medicinesRes] = await Promise.all([
          medicalRecordService.getMyCreatedRecords(),
          doctorService.getAppointments(),
          pharmacyService.getAll(),
        ]);

        const appointments = appointmentsRes.data || [];
        const derivedPatients = appointments
          .map((item) => item.patient)
          .filter((item): item is Patient => !!item)
          .filter(
            (item, index, array) =>
              array.findIndex((entry) => entry.id === item.id) === index,
          );

        const patientMap = new Map(
          derivedPatients.map((item) => [item.id, item]),
        );
        const appointmentById = new Map(
          appointments.map((item) => [item.id, item]),
        );

        const computedLatestByPatient = appointments.reduce<
          Record<string, Appointment>
        >((acc, appointment) => {
          const current = acc[appointment.patientId];
          if (!current) {
            acc[appointment.patientId] = appointment;
            return acc;
          }
          if (
            new Date(appointment.date).getTime() >
            new Date(current.date).getTime()
          ) {
            acc[appointment.patientId] = appointment;
          }
          return acc;
        }, {});

        const enrichedRecords = (recordsRes.data || []).map((record) => {
          const appointment = record.appointmentId
            ? appointmentById.get(record.appointmentId)
            : undefined;

          return {
            ...record,
            patient:
              record.patient ||
              appointment?.patient ||
              patientMap.get(record.patientId),
            doctor: record.doctor || appointment?.doctor,
            patientId: record.patientId || appointment?.patientId || "",
            doctorId: record.doctorId || appointment?.doctorId || "",
          };
        });

        setLatestAppointmentByPatient(computedLatestByPatient);
        setRecords(
          enrichedRecords.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
        );
        setPatients(derivedPatients);
        setMedicines(medicinesRes.data);
      } catch (error) {
        console.error("[DoctorMedicalRecords] Failed to fetch data:", error);
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Open detail dialog ──────────────────────────────────────
  const handleOpenDetail = async (record: MedicalRecord) => {
    setDetailRecord(record);
    setDetailOpen(true);

    // Fetch /details/{id} only for real backend IDs (not synthetic "record-xxx")
    if (isBackendMedicalRecordId(record.id)) {
      setDetailLoading(true);
      try {
        const res = await medicalRecordService.getById(record.id);
        if (res.success && res.data) {
          setDetailRecord({
            ...res.data,
            patient: res.data.patient ?? record.patient,
            doctor: res.data.doctor ?? record.doctor,
          });
        }
      } catch {
        // Keep list-level data
      } finally {
        setDetailLoading(false);
      }
    }
  };

  // ── Filtered records ─────────────────────────────────────────
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      `${r.diagnosis} ${r.treatment} ${r.patient?.firstName} ${r.patient?.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesPatient =
      patientFilter === "all" || r.patientId === patientFilter;
    return matchesSearch && matchesPatient;
  });

  // ── Add diagnosis / note ─────────────────────────────────────
  const handleAddDiagnosis = async () => {
    if (!newRecord.patientId) {
      toast({
        title: "Missing patient",
        description: "Select a patient before adding a record.",
        variant: "destructive",
      });
      return;
    }

    const selectedAppointment = latestAppointmentByPatient[newRecord.patientId];
    if (!selectedAppointment?.id) {
      toast({
        title: "No appointment found",
        description: "A linked appointment is required before saving.",
        variant: "destructive",
      });
      return;
    }

    const selectedPatient = patients.find(
      (item) => item.id === newRecord.patientId,
    );

    try {
      // ✅ POST /api/MedicalRecords/create
      const result = await medicalRecordService.create({
        appointmentId: selectedAppointment.id,
        patientId: newRecord.patientId,
        type: addType === "note" ? "note" : "diagnosis",
        diagnosis: newRecord.diagnosis || "Doctor note",
        treatment: newRecord.treatment || "N/A",
        notes: newRecord.notes || "No additional notes.",
        toothNumber: newRecord.toothNumber || undefined,
      });

      const createdRecord: MedicalRecord = {
        ...result.data,
        patient: result.data.patient || selectedPatient,
        doctor: result.data.doctor || selectedAppointment.doctor,
        doctorId:
          result.data.doctorId ||
          selectedAppointment.doctorId ||
          user?.id ||
          "",
      };

      setRecords((prev) => [createdRecord, ...prev]);
      toast({
        title: "Record Added",
        description: "Medical record was saved successfully.",
      });
      setAddDialogOpen(false);
      setNewRecord({
        patientId: "",
        diagnosis: "",
        treatment: "",
        notes: "",
        toothNumber: "",
      });
    } catch (error) {
      console.error("[DoctorMedicalRecords] Failed to create record:", error);
      toast({
        title: "Error",
        description: "Failed to save medical record.",
        variant: "destructive",
      });
    }
  };

  // ── Add prescription ─────────────────────────────────────────
  const handleAddPrescription = async () => {
    if (!newPrescription.patientId) {
      toast({
        title: "Missing patient",
        description: "Select a patient before creating a prescription.",
        variant: "destructive",
      });
      return;
    }

    const selectedMedicine = medicines.find(
      (item) => item.id === newPrescription.medicineId,
    );
    if (!selectedMedicine) {
      toast({
        title: "Missing medicine",
        description: "Select a medicine before creating a prescription.",
        variant: "destructive",
      });
      return;
    }

    const selectedAppointment =
      latestAppointmentByPatient[newPrescription.patientId];
    if (!selectedAppointment?.id) {
      toast({
        title: "No appointment found",
        description: "A linked appointment is required before prescribing.",
        variant: "destructive",
      });
      return;
    }

    const parsedAppointmentId = parseNumericId(selectedAppointment.id);
    if (parsedAppointmentId === null) {
      toast({
        title: "Invalid appointment ID",
        description: "Unable to send prescription with the selected record.",
        variant: "destructive",
      });
      return;
    }

    try {
      await prescriptionService.create({
        appointmentId: parsedAppointmentId,
        medicines: [
          {
            medicineId: Number(newPrescription.medicineId),
            dosage: newPrescription.dosage,
            frequency: newPrescription.frequency,
            durationInDays: parseDurationDays(newPrescription.duration),
            instructions: newPrescription.instructions || null,
            quantity: null,
          },
        ],
      });

      const selectedPatient = patients.find(
        (item) => item.id === newPrescription.patientId,
      );

      const prescriptionRecord: MedicalRecord = {
        id: `record-prescription-${Date.now()}`,
        appointmentId: selectedAppointment.id,
        patientId: newPrescription.patientId,
        doctorId: selectedAppointment.doctorId || user?.id || "",
        doctor: selectedAppointment.doctor,
        patient: selectedPatient,
        date: new Date().toISOString(),
        type: "prescription",
        diagnosis: selectedMedicine.name,
        treatment: "Medication plan created",
        notes: newPrescription.instructions || "No additional instructions.",
        toothNumber: undefined,
        attachments: [],
        prescription: undefined,
      };

      setRecords((prev) => [prescriptionRecord, ...prev]);
      toast({
        title: "Prescription Added",
        description: "New prescription has been created.",
      });
      setAddDialogOpen(false);
      setNewPrescription({
        patientId: "",
        medicineId: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      });
    } catch (error) {
      console.error(
        "[DoctorMedicalRecords] Failed to create prescription:",
        error,
      );
      toast({
        title: "Error",
        description: "Failed to create prescription.",
        variant: "destructive",
      });
    }
  };

  const typeIcons: Record<string, typeof FileText> = {
    diagnosis: Activity,
    treatment: Stethoscope,
    prescription: Pill,
    note: FileText,
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Medical Records
            </h1>
            <p className="text-muted-foreground text-sm">
              View and manage patient medical records
            </p>
          </div>

          {/* ── Add Record Dialog ── */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg border-0">
                <Plus className="w-4 h-4 mr-2" /> Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh]">
              <DialogHeader>
                <DialogTitle className="font-display">
                  Add Medical Record
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-4">
                <Tabs
                  value={addType}
                  onValueChange={(v) => setAddType(v as typeof addType)}
                  className="space-y-4"
                >
                  <TabsList className="w-full bg-muted/50">
                    <TabsTrigger value="diagnosis" className="flex-1">
                      Diagnosis
                    </TabsTrigger>
                    <TabsTrigger value="prescription" className="flex-1">
                      Prescription
                    </TabsTrigger>
                    <TabsTrigger value="note" className="flex-1">
                      Note
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Diagnosis tab ── */}
                  <TabsContent value="diagnosis" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Patient</Label>
                      <Select
                        value={newRecord.patientId}
                        onValueChange={(v) =>
                          setNewRecord({ ...newRecord, patientId: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.firstName} {p.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Diagnosis</Label>
                      <Input
                        placeholder="Enter diagnosis"
                        value={newRecord.diagnosis}
                        onChange={(e) =>
                          setNewRecord({
                            ...newRecord,
                            diagnosis: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Treatment Plan</Label>
                      <Textarea
                        placeholder="Describe treatment plan"
                        value={newRecord.treatment}
                        onChange={(e) =>
                          setNewRecord({
                            ...newRecord,
                            treatment: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tooth Number</Label>
                        <Input
                          placeholder="e.g., #14"
                          value={newRecord.toothNumber}
                          onChange={(e) =>
                            setNewRecord({
                              ...newRecord,
                              toothNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Additional notes"
                        value={newRecord.notes}
                        onChange={(e) =>
                          setNewRecord({ ...newRecord, notes: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      onClick={handleAddDiagnosis}
                      className="w-full gradient-bg border-0"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save Diagnosis
                    </Button>
                  </TabsContent>

                  {/* ── Prescription tab ── */}
                  <TabsContent value="prescription" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Patient</Label>
                      <Select
                        value={newPrescription.patientId}
                        onValueChange={(v) =>
                          setNewPrescription({
                            ...newPrescription,
                            patientId: v,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.firstName} {p.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Medicine</Label>
                      <Select
                        value={newPrescription.medicineId}
                        onValueChange={(v) =>
                          setNewPrescription({
                            ...newPrescription,
                            medicineId: v,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select medicine" />
                        </SelectTrigger>
                        <SelectContent>
                          {medicines.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Dosage</Label>
                        <Input
                          placeholder="e.g., 500mg"
                          value={newPrescription.dosage}
                          onChange={(e) =>
                            setNewPrescription({
                              ...newPrescription,
                              dosage: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Input
                          placeholder="e.g., 3x daily"
                          value={newPrescription.frequency}
                          onChange={(e) =>
                            setNewPrescription({
                              ...newPrescription,
                              frequency: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duration</Label>
                        <Input
                          placeholder="e.g., 7 days"
                          value={newPrescription.duration}
                          onChange={(e) =>
                            setNewPrescription({
                              ...newPrescription,
                              duration: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Instructions</Label>
                      <Textarea
                        placeholder="Special instructions"
                        value={newPrescription.instructions}
                        onChange={(e) =>
                          setNewPrescription({
                            ...newPrescription,
                            instructions: e.target.value,
                          })
                        }
                      />
                    </div>
                    <Button
                      onClick={handleAddPrescription}
                      className="w-full gradient-bg border-0"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save Prescription
                    </Button>
                  </TabsContent>

                  {/* ── Note tab ── */}
                  <TabsContent value="note" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Patient</Label>
                      <Select
                        value={newRecord.patientId}
                        onValueChange={(v) =>
                          setNewRecord({ ...newRecord, patientId: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.firstName} {p.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Treatment Notes</Label>
                      <Textarea
                        rows={6}
                        placeholder="Enter treatment notes, observations, follow-up instructions..."
                        value={newRecord.notes}
                        onChange={(e) =>
                          setNewRecord({ ...newRecord, notes: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      onClick={handleAddDiagnosis}
                      className="w-full gradient-bg border-0"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save Note
                    </Button>
                  </TabsContent>
                </Tabs>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* ── Search & Filter ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={patientFilter} onValueChange={setPatientFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by patient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Patients</SelectItem>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Records List ── */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <LoadingCard />
            ) : filteredRecords.length > 0 ? (
              <div className="space-y-3">
                {filteredRecords.map((record, index) => {
                  const Icon = typeIcons[record.type] || FileText;
                  return (
                    <motion.div
                      key={record.id || record.appointmentId || `record-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-4 p-4 rounded-xl border border-border hover:shadow-card transition-all cursor-pointer"
                      onClick={() => handleOpenDetail(record)}
                    >
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
                        <div className="flex items-center gap-3 mt-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={record.patient?.avatar} />
                            <AvatarFallback className="text-[10px]">
                              {record.patient?.firstName?.[0]}
                              {record.patient?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {record.patient?.firstName}{" "}
                            {record.patient?.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{" "}
                            {new Date(record.date).toLocaleDateString()}
                          </span>
                          {record.toothNumber && (
                            <>
                              <span className="text-xs text-muted-foreground">
                                •
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Tooth: {record.toothNumber}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No records found
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Record Detail Dialog ── */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="font-display">Record Details</DialogTitle>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : detailRecord ? (
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-5">
                  {/* Patient info */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={detailRecord.patient?.avatar} />
                      <AvatarFallback>
                        {detailRecord.patient?.firstName?.[0]}
                        {detailRecord.patient?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {detailRecord.patient?.firstName}{" "}
                        {detailRecord.patient?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(detailRecord.date).toLocaleDateString(
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
                      {detailRecord.diagnosis || "—"}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Treatment
                    </h4>
                    <p className="text-sm text-foreground">
                      {detailRecord.treatment || "—"}
                    </p>
                  </div>

                  {detailRecord.toothNumber && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Tooth Number
                      </h4>
                      <Badge variant="outline">
                        {detailRecord.toothNumber}
                      </Badge>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Notes
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {detailRecord.notes || "No additional notes."}
                    </p>
                  </div>
                </div>
              </ScrollArea>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
