import { Fragment, useCallback, useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AppointmentDetailsDrawer } from "@/components/dashboard/AppointmentDetailsDrawer";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  CheckCircle,
  X,
  FilePlus,
  Notebook,
  Pill,
  Eye,
} from "lucide-react";
import {
  appointmentCareService,
  doctorService,
  medicalRecordService,
  pharmacyService,
  prescriptionService,
  isBackendMedicalRecordId,
} from "@/services/api";
import type { Appointment, MedicalRecord, Medicine } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface AppointmentDecisionState {
  prescriptionSubmitted: boolean;
  noPrescription: boolean;
}

interface PrescriptionMedicineForm {
  medicineId: string;
  dosage: string;
  frequency: string;
  durationInDays: string;
  quantity: string;
  instructions: string;
}

interface MedicalRecordFormState {
  type: "diagnosis" | "treatment" | "note";
  diagnosis: string;
  treatment: string;
  notes: string;
  toothNumber: string;
}

const createEmptyMedicineForm = (): PrescriptionMedicineForm => ({
  medicineId: "",
  dosage: "",
  frequency: "",
  durationInDays: "",
  quantity: "",
  instructions: "",
});

const initialMedicalRecordForm: MedicalRecordFormState = {
  type: "diagnosis",
  diagnosis: "",
  treatment: "",
  notes: "",
  toothNumber: "",
};

// These fields map directly to CreatePrescriptionDto -> PrescriptionMedicineDto in src/types/swagger.ts.
const prescriptionFieldConfig: Array<{
  key: keyof PrescriptionMedicineForm;
  label: string;
  type: "text" | "number" | "textarea" | "select";
  required?: boolean;
}> = [
  { key: "medicineId", label: "Medicine", type: "select", required: true },
  { key: "dosage", label: "Dosage", type: "text", required: true },
  { key: "frequency", label: "Frequency", type: "text", required: true },
  { key: "durationInDays", label: "Duration (days)", type: "number" },
  { key: "quantity", label: "Quantity", type: "number" },
  { key: "instructions", label: "Instructions", type: "textarea" },
];

// Swagger does not currently provide a MedicalRecord DTO, so these are inferred from MedicalRecord usage in this project.
const medicalRecordFieldConfig = [
  { key: "diagnosis", label: "Diagnosis", type: "text" },
  { key: "notes", label: "Notes", type: "textarea" },
] as const;

function parseNumericId(value: string): number | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  const prefixed = raw.match(/^(?:appointment-|apt-)(\d+)$/i);
  if (prefixed) {
    const parsed = Number(prefixed[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function parseMedicineNumericId(value: string): number | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  const trailing = raw.match(/(\d+)$/);
  if (!trailing) return null;
  const parsed = Number(trailing[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNullablePositiveInt(value: string): number | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [decisionByAppointment, setDecisionByAppointment] = useState<
    Record<string, AppointmentDecisionState>
  >({});
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [recordsByPatient, setRecordsByPatient] = useState<
    Record<string, MedicalRecord[]>
  >({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingPrescription, setIsSubmittingPrescription] =
    useState(false);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false);
  const [activeAppointmentForAction, setActiveAppointmentForAction] =
    useState<Appointment | null>(null);

  const [prescriptionRows, setPrescriptionRows] = useState<
    PrescriptionMedicineForm[]
  >([createEmptyMedicineForm()]);
  const [medicalRecordForm, setMedicalRecordForm] =
    useState<MedicalRecordFormState>(initialMedicalRecordForm);
  const [selectedMedicalRecord, setSelectedMedicalRecord] =
    useState<MedicalRecord | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [actioningAppointmentId, setActioningAppointmentId] = useState<
    string | null
  >(null);

  const { user } = useAuth();

  const hydrateDecisionState = async (nextAppointments: Appointment[]) => {
    const noPrescriptionMap = appointmentCareService.getNoPrescriptionMap();
    const prescriptionMap = appointmentCareService.getPrescriptionMap();

    const nextState: Record<string, AppointmentDecisionState> = {};
    nextAppointments.forEach((appointment) => {
      nextState[appointment.id] = {
        prescriptionSubmitted:
          !!appointment.prescription || !!prescriptionMap[appointment.id],
        noPrescription: !!noPrescriptionMap[appointment.id],
      };
    });

    setDecisionByAppointment(nextState);
  };

  const fetchAppointments = useCallback(async (): Promise<Appointment[]> => {
    try {
      const response = await doctorService.getAppointments();
      setAppointments(response.data);
      await hydrateDecisionState(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      toast({
        title: "Failed to load appointments",
        description: "Could not fetch doctor appointments from backend.",
        variant: "destructive",
      });
      return [];
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [, medicineResult] = await Promise.all([
          fetchAppointments(),
          pharmacyService.getAll(),
        ]);
        setMedicines(medicineResult.data || []);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchAppointments, user]);

  const canCompleteAppointment = (appointmentId: string): boolean => {
    const state = decisionByAppointment[appointmentId];
    return !!state && (state.prescriptionSubmitted || state.noPrescription);
  };

  const getCompleteDisabledReason = (appointmentId: string): string => {
    if (canCompleteAppointment(appointmentId)) return "";
    return "Submit prescription or select No Prescription before completing.";
  };

  const filteredAppointments =
    statusFilter === "all"
      ? appointments
      : appointments.filter((a) => a.status === statusFilter);

  const today = appointments.filter((a) => {
    const aptDate = new Date(a.date).toDateString();
    return aptDate === new Date().toDateString();
  });

  const completed = appointments.filter((a) => a.status === "complete");
  const upcoming = appointments.filter((a) => a.status === "upcoming");

  const handleAccept = async (id: string) => {
    if (!canCompleteAppointment(id)) {
      toast({
        title: "Action required",
        description: getCompleteDisabledReason(id),
        variant: "destructive",
      });
      return;
    }

    setActioningAppointmentId(id);
    try {
      await doctorService.completeAppointment(id);
      await fetchAppointments();
      setDrawerOpen(false);
      toast({
        title: "Appointment Complete",
        description: "The appointment has been marked as complete.",
      });
    } catch (error) {
      console.error("Failed to complete appointment:", error);
      toast({
        title: "Failed to update appointment",
        description: "Backend did not accept the complete request.",
        variant: "destructive",
      });
    } finally {
      setActioningAppointmentId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioningAppointmentId(id);
    try {
      await doctorService.cancelAppointment(id);
      await fetchAppointments();
      setDrawerOpen(false);
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been cancelled.",
      });
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      toast({
        title: "Failed to update appointment",
        description: "Backend did not accept the cancel request.",
        variant: "destructive",
      });
    } finally {
      setActioningAppointmentId(null);
    }
  };

  const openPrescriptionDialog = async (appointment: Appointment) => {
    setActiveAppointmentForAction(appointment);
    setPrescriptionRows([createEmptyMedicineForm()]);
    if (medicines.length === 0) {
      try {
        const medicineResult = await pharmacyService.getAll();
        setMedicines(medicineResult.data || []);
      } catch {
        setMedicines([]);
      }
    }
    setPrescriptionDialogOpen(true);
  };

  const openRecordsDialog = async (appointment: Appointment) => {
    setActiveAppointmentForAction(appointment);
    setMedicalRecordForm(initialMedicalRecordForm);
    setSelectedMedicalRecord(null);
    setRecordsDialogOpen(true);
    setIsLoadingRecords(true);

    try {
      const response = await medicalRecordService.getMyCreatedRecords();
      const patientRecords = (response.data || []).filter((record) => {
        if (record.patientId && record.patientId === appointment.patientId) {
          return true;
        }
        const recordAppointmentId = record.appointmentId;
        return !!recordAppointmentId && recordAppointmentId === appointment.id;
      });

      setRecordsByPatient((previous) => ({
        ...previous,
        [appointment.patientId]: patientRecords.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      }));
    } catch (error) {
      console.error("Failed to load medical records:", error);
      setRecordsByPatient((previous) => ({
        ...previous,
        [appointment.patientId]: [],
      }));
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleNoPrescription = async (appointment: Appointment) => {
    setActioningAppointmentId(appointment.id);
    try {
      await appointmentCareService.markNoPrescription(appointment.id);
      setDecisionByAppointment((previous) => ({
        ...previous,
        [appointment.id]: {
          prescriptionSubmitted: false,
          noPrescription: true,
        },
      }));
      toast({
        title: "No prescription recorded",
        description: "You can now complete this appointment.",
      });
    } catch (error) {
      console.error("Failed to mark no prescription:", error);
      toast({
        title: "Unable to update",
        description: "Could not save no-prescription state.",
        variant: "destructive",
      });
    } finally {
      setActioningAppointmentId(null);
    }
  };

  const updatePrescriptionRow = (
    rowIndex: number,
    field: keyof PrescriptionMedicineForm,
    value: string,
  ) => {
    setPrescriptionRows((previous) =>
      previous.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  };

  const handleSubmitPrescription = async () => {
    if (!activeAppointmentForAction) return;

    const hasInvalidRows = prescriptionRows.some(
      (row) => !row.medicineId || !row.dosage || !row.frequency,
    );
    if (hasInvalidRows) {
      toast({
        title: "Missing prescription fields",
        description: "Medicine, dosage, and frequency are required.",
        variant: "destructive",
      });
      return;
    }

    const parsedAppointmentId = parseNumericId(activeAppointmentForAction.id);
    if (parsedAppointmentId === null) {
      toast({
        title: "Invalid appointment",
        description:
          "This appointment has an invalid ID for backend prescription submission.",
        variant: "destructive",
      });
      return;
    }

    const parsedRows = prescriptionRows.map((row) => ({
      medicineId: parseMedicineNumericId(row.medicineId),
      dosage: row.dosage || null,
      frequency: row.frequency || null,
      durationInDays: parseNullablePositiveInt(row.durationInDays),
      quantity: parseNullablePositiveInt(row.quantity),
      instructions: row.instructions || null,
    }));

    const hasInvalidMedicineId = parsedRows.some(
      (row) => row.medicineId === null,
    );
    if (hasInvalidMedicineId) {
      toast({
        title: "Invalid medicine",
        description:
          "One or more medicine IDs are invalid. Please reselect medicines.",
        variant: "destructive",
      });
      return;
    }

    const medicineIdSet = new Set<number>();
    const hasDuplicateMedicines = parsedRows.some((row) => {
      const medicineId = row.medicineId as number;
      if (medicineIdSet.has(medicineId)) return true;
      medicineIdSet.add(medicineId);
      return false;
    });
    if (hasDuplicateMedicines) {
      toast({
        title: "Duplicate medicine detected",
        description: "Each medicine can only be added once per prescription.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingPrescription(true);

    try {
      await prescriptionService.create({
        appointmentId: parsedAppointmentId,
        medicines: parsedRows.map((row) => ({
          medicineId: row.medicineId as number,
          dosage: row.dosage,
          frequency: row.frequency,
          durationInDays: row.durationInDays,
          quantity: row.quantity,
          instructions: row.instructions,
        })),
      });

      appointmentCareService.markPrescriptionSubmitted(
        activeAppointmentForAction.id,
      );

      setDecisionByAppointment((previous) => ({
        ...previous,
        [activeAppointmentForAction.id]: {
          prescriptionSubmitted: true,
          noPrescription: false,
        },
      }));

      toast({
        title: "Prescription saved",
        description: "Appointment can now be completed.",
      });
      setPrescriptionDialogOpen(false);
    } catch (error) {
      console.error("Failed to submit prescription:", error);
      toast({
        title: "Failed to save prescription",
        description: "Backend rejected the prescription payload.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPrescription(false);
    }
  };

  const handleSubmitMedicalRecord = async () => {
    if (!activeAppointmentForAction) return;
    if (!medicalRecordForm.diagnosis.trim()) {
      toast({
        title: "Missing diagnosis",
        description: "Diagnosis is required for medical records.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingRecord(true);
    try {
      const response = await medicalRecordService.create({
        appointmentId: activeAppointmentForAction.id,
        patientId:
          activeAppointmentForAction.patient?.id ??
          activeAppointmentForAction.patientId,
        diagnosis: medicalRecordForm.diagnosis,
        treatment: medicalRecordForm.treatment,
        notes: medicalRecordForm.notes,
        toothNumber: medicalRecordForm.toothNumber || undefined,
        type: medicalRecordForm.type,
      });

      setRecordsByPatient((previous) => {
        const current = previous[activeAppointmentForAction.patientId] || [];
        return {
          ...previous,
          [activeAppointmentForAction.patientId]: [
            response.data,
            ...current.filter((record) => record.id !== response.data.id),
          ],
        };
      });

      toast({
        title: "Medical record saved",
        description: "Patient record has been updated.",
      });
      setMedicalRecordForm(initialMedicalRecordForm);
      setSelectedMedicalRecord(response.data);
    } catch (error) {
      console.error("Failed to save medical record:", error);
      toast({
        title: "Failed to save medical record",
        description: "Try again after verifying required fields.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  const handleViewMedicalRecord = async (record: MedicalRecord) => {
    setSelectedMedicalRecord(record);

    if (!isBackendMedicalRecordId(record.id)) return;

    setDetailsLoading(true);
    try {
      const response = await medicalRecordService.getById(record.id);
      if (response.success && response.data) {
        setSelectedMedicalRecord({
          ...response.data,
          patient: response.data.patient ?? record.patient,
          doctor: response.data.doctor ?? record.doctor,
        });
      }
    } catch {
      // Keep list-level data on failure.
    } finally {
      setDetailsLoading(false);
    }
  };

  const activePatientRecords = useMemo(() => {
    if (!activeAppointmentForAction) return [];
    return recordsByPatient[activeAppointmentForAction.patientId] || [];
  }, [recordsByPatient, activeAppointmentForAction]);

  // Build a simple weekly schedule view
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground">
            Appointments
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your schedule and patient appointments
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {today.length}
                </p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10 text-warning">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {completed.length}
                </p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10 text-success">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {upcoming.length}
                </p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
            </TabsList>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="list">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <LoadingCard />
                ) : filteredAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {filteredAppointments.map((apt) => (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between p-4 rounded-xl border border-border hover:shadow-card transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setDrawerOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={apt.patient?.avatar} />
                            <AvatarFallback>
                              {apt.patient?.firstName[0]}
                              {apt.patient?.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {apt.patient?.firstName} {apt.patient?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {apt.service?.name} •{" "}
                              {new Date(apt.date).toLocaleDateString()} at{" "}
                              {apt.time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={apt.status} />
                          {apt.status === "upcoming" && (
                            <div className="flex flex-wrap gap-1 ml-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                disabled={actioningAppointmentId === apt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPrescriptionDialog(apt);
                                }}
                              >
                                <Pill className="w-3.5 h-3.5 mr-1" /> Write Rx
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                disabled={actioningAppointmentId === apt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNoPrescription(apt);
                                }}
                              >
                                No Rx
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRecordsDialog(apt);
                                }}
                              >
                                <Notebook className="w-3.5 h-3.5 mr-1" />
                                Records
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-success border-success/30 hover:bg-success/10"
                                disabled={
                                  actioningAppointmentId === apt.id ||
                                  !canCompleteAppointment(apt.id)
                                }
                                title={getCompleteDisabledReason(apt.id)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(apt.id);
                                }}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />{" "}
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
                                disabled={actioningAppointmentId === apt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(apt.id);
                                }}
                              >
                                <X className="w-3.5 h-3.5 mr-1" /> Cancel
                              </Button>
                              {decisionByAppointment[apt.id]
                                ?.prescriptionSubmitted && (
                                <Badge variant="outline" className="h-7">
                                  Prescription done
                                </Badge>
                              )}
                              {decisionByAppointment[apt.id]
                                ?.noPrescription && (
                                <Badge variant="outline" className="h-7">
                                  No prescription
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No appointments found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-7 gap-1">
                    <div className="p-2 text-xs font-medium text-muted-foreground">
                      Time
                    </div>
                    {daysOfWeek.map((day) => (
                      <div
                        key={day}
                        className="p-2 text-xs font-medium text-center text-foreground"
                      >
                        {day}
                      </div>
                    ))}
                    {timeSlots.map((time) => (
                      <Fragment key={time}>
                        <div
                          key={`time-${time}`}
                          className="p-2 text-xs text-muted-foreground border-t border-border"
                        >
                          {time}
                        </div>
                        {daysOfWeek.map((day) => {
                          const apt = appointments.find(
                            (a) => a.time === time && a.status !== "cancelled",
                          );
                          return (
                            <div
                              key={`${day}-${time}`}
                              className={`p-2 border-t border-border text-xs rounded ${apt ? "bg-primary/10 cursor-pointer hover:bg-primary/20" : ""}`}
                              onClick={() => {
                                if (apt) {
                                  setSelectedAppointment(apt);
                                  setDrawerOpen(true);
                                }
                              }}
                            >
                              {apt && (
                                <div>
                                  <p className="font-medium text-foreground truncate">
                                    {apt.patient?.firstName}
                                  </p>
                                  <p className="text-muted-foreground truncate">
                                    {apt.service?.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AppointmentDetailsDrawer
          appointment={selectedAppointment}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onAccept={handleAccept}
          onReject={handleReject}
          isCompleteDisabled={
            selectedAppointment
              ? !canCompleteAppointment(selectedAppointment.id)
              : false
          }
          completeDisabledReason={
            selectedAppointment
              ? getCompleteDisabledReason(selectedAppointment.id)
              : ""
          }
          role="doctor"
        />

        <Dialog
          open={prescriptionDialogOpen}
          onOpenChange={setPrescriptionDialogOpen}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Write Prescription
                {activeAppointmentForAction?.patient &&
                  ` - ${activeAppointmentForAction.patient.firstName} ${activeAppointmentForAction.patient.lastName}`}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {prescriptionRows.map((row, rowIndex) => (
                <Card key={`row-${rowIndex}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Medication #{rowIndex + 1}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {prescriptionFieldConfig.map((field) => (
                      <div
                        key={`${rowIndex}-${field.key}`}
                        className="space-y-1.5"
                      >
                        <Label>{field.label}</Label>
                        {field.type === "select" ? (
                          <Select
                            value={row[field.key]}
                            onValueChange={(value) =>
                              updatePrescriptionRow(rowIndex, field.key, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select medicine" />
                            </SelectTrigger>
                            <SelectContent>
                              {medicines.map((medicine) => (
                                <SelectItem
                                  key={medicine.id}
                                  value={medicine.id}
                                >
                                  {medicine.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "textarea" ? (
                          <Textarea
                            value={row[field.key]}
                            onChange={(event) =>
                              updatePrescriptionRow(
                                rowIndex,
                                field.key,
                                event.target.value,
                              )
                            }
                          />
                        ) : (
                          <Input
                            type={field.type}
                            value={row[field.key]}
                            onChange={(event) =>
                              updatePrescriptionRow(
                                rowIndex,
                                field.key,
                                event.target.value,
                              )
                            }
                          />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPrescriptionRows((previous) => [
                      ...previous,
                      createEmptyMedicineForm(),
                    ])
                  }
                >
                  <FilePlus className="w-4 h-4 mr-2" /> Add Medicine
                </Button>
                <Button
                  type="button"
                  className="gradient-bg border-0"
                  disabled={isSubmittingPrescription}
                  onClick={handleSubmitPrescription}
                >
                  {isSubmittingPrescription ? "Saving..." : "Save Prescription"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={recordsDialogOpen} onOpenChange={setRecordsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Medical Records
                {activeAppointmentForAction?.patient &&
                  ` - ${activeAppointmentForAction.patient.firstName} ${activeAppointmentForAction.patient.lastName}`}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Add Record</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={medicalRecordForm.type}
                      onValueChange={(value) =>
                        setMedicalRecordForm((previous) => ({
                          ...previous,
                          type: value as MedicalRecordFormState["type"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diagnosis">Diagnosis</SelectItem>
                        <SelectItem value="treatment">Treatment</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {medicalRecordFieldConfig.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label>{field.label}</Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          value={medicalRecordForm[field.key]}
                          onChange={(event) =>
                            setMedicalRecordForm((previous) => ({
                              ...previous,
                              [field.key]: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        <Input
                          value={medicalRecordForm[field.key]}
                          onChange={(event) =>
                            setMedicalRecordForm((previous) => ({
                              ...previous,
                              [field.key]: event.target.value,
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}

                  <Button
                    type="button"
                    className="gradient-bg border-0"
                    disabled={isSubmittingRecord}
                    onClick={handleSubmitMedicalRecord}
                  >
                    {isSubmittingRecord ? "Saving..." : "Save Medical Record"}
                  </Button>
                </CardContent>
              </Card>

              {selectedMedicalRecord && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Record Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {detailsLoading ? (
                      <p className="text-muted-foreground">
                        Loading details...
                      </p>
                    ) : (
                      <>
                        <div>
                          <span className="font-medium">Type:</span>{" "}
                          <span className="capitalize">
                            {selectedMedicalRecord.type}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Diagnosis:</span>{" "}
                          {selectedMedicalRecord.diagnosis}
                        </div>
                        <div>
                          <span className="font-medium">Treatment:</span>{" "}
                          {selectedMedicalRecord.treatment || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Notes:</span>{" "}
                          {selectedMedicalRecord.notes || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Tooth Number:</span>{" "}
                          {selectedMedicalRecord.toothNumber || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span>{" "}
                          {new Date(
                            selectedMedicalRecord.date,
                          ).toLocaleString()}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Previous Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingRecords ? (
                    <p className="text-sm text-muted-foreground">
                      Loading records...
                    </p>
                  ) : activePatientRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No records yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activePatientRecords.map((record) => (
                        <div
                          key={record.id}
                          className="rounded-lg border border-border p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">
                              {record.diagnosis}
                            </p>
                            <Badge variant="outline" className="capitalize">
                              {record.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {record.treatment || "No treatment details"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(record.date).toLocaleString()}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewMedicalRecord(record)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
