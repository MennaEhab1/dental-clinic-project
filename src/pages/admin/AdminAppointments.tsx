import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AppointmentDetailsDrawer } from "@/components/dashboard/AppointmentDetailsDrawer";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Filter, X, Check, Plus, Loader2 } from "lucide-react";
import { adminAppointmentService, doctorService } from "@/services/api";
import type { Appointment, AppointmentStatus, Doctor, Patient } from "@/types";
import type { BookAppointmentDto } from "@/types/swagger";
import { toast } from "@/hooks/use-toast";

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Create appointment dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    doctorId: "",
    patientId: "",
    date: "",
    startTime: "",
    amount: "0",
    paymentMethod: "Cash" as "Cash" | "Visa",
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchAppointments();
    // Load doctors from Lookup endpoint (proper names via DoctorDTO)
    doctorService
      .getAll()
      .then((res) => setDoctors(res.data ?? []))
      .catch(() => {});
  }, []);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const response = await adminAppointmentService.getAll();
      setAppointments(response.data);
      // Derive unique patients from loaded appointments using the raw integer patientId
      // (apt.patientId is the DB integer FK, not the ASP.NET Identity GUID)
      const seen = new Set<string>();
      const derived: Patient[] = [];
      for (const apt of response.data) {
        const numericId = apt.patientId; // raw integer string like "3", not a GUID
        const isValidInteger =
          numericId && !isNaN(Number(numericId)) && Number(numericId) > 0;
        if (isValidInteger && !seen.has(numericId)) {
          seen.add(numericId);
          derived.push({
            ...(apt.patient ?? {}),
            id: numericId, // override with integer FK so Number(id) works
          } as Patient);
        }
      }
      setPatients(derived);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Opens the drawer — calls GET /api/admin/appointments/{id} for fresh data
  const openDetails = async (apt: Appointment) => {
    setSelectedAppointment(apt); // show immediately with table data
    setDrawerOpen(true);
    setIsLoadingDetails(true);
    try {
      const res = await adminAppointmentService.getById(apt.id);
      if (res.data?.id) {
        setSelectedAppointment(res.data);
      }
    } catch {
      // non-fatal — drawer already shows table data
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const filtered = appointments.filter((a) => {
    const matchesSearch =
      `${a.patient?.firstName || ""} ${a.patient?.lastName || ""} ${a.doctor?.firstName || ""} ${a.doctor?.lastName || ""} ${a.service?.name || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPatientDisplayName = (apt: Appointment) => {
    const firstName = apt.patient?.firstName?.trim() || "";
    const lastName = apt.patient?.lastName?.trim() || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return (
      fullName ||
      apt.patient?.email ||
      apt.patient?.id ||
      `Patient #${apt.patientId || "—"}`
    );
  };

  const getPatientAvatarFallback = (apt: Appointment) => {
    const name = getPatientDisplayName(apt);
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase())
      .slice(0, 2)
      .join("") || "P";
  };

  const getDoctorDisplayName = (apt: Appointment) => {
    const doctorFromList = doctors.find((doc) => doc.id === apt.doctorId);
    const firstName = apt.doctor?.firstName?.trim() || "";
    const lastName = apt.doctor?.lastName?.trim() || "";
    const fullName = `${firstName} ${lastName}`.trim();
    const isEmailName = Boolean(firstName && firstName.includes("@"));

    if (doctorFromList) {
      const listName = `${doctorFromList.firstName || ""} ${doctorFromList.lastName || ""}`.trim();
      if (listName) return `Dr. ${listName}`;
    }

    if (fullName && !isEmailName) return `Dr. ${fullName}`;

    return apt.doctorId ? `Doctor #${apt.doctorId}` : "Doctor";
  };

  const handleStatusChange = async (
    appointmentId: string,
    newStatus: AppointmentStatus,
  ) => {
    try {
      setIsUpdating(true);
      await adminAppointmentService.updateStatus(appointmentId, newStatus);
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt,
        ),
      );
      toast({ title: "Success", description: "Appointment status updated" });
      setDrawerOpen(false);
    } catch (error) {
      console.error("Failed to update appointment:", error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const validateCreateForm = () => {
    const errs: Record<string, string> = {};
    if (!createForm.doctorId) errs.doctorId = "Doctor is required";
    if (!createForm.patientId) errs.patientId = "Patient is required";
    if (!createForm.date) errs.date = "Date is required";
    if (!createForm.startTime) errs.startTime = "Start time is required";
    if (isNaN(Number(createForm.amount)) || Number(createForm.amount) < 0)
      errs.amount = "Valid amount is required";
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateForm()) return;
    setIsCreating(true);
    try {
      const doctorIdNum = Number(createForm.doctorId);
      const patientIdNum = Number(createForm.patientId);
      if (isNaN(doctorIdNum) || isNaN(patientIdNum)) {
        throw new Error(
          "Invalid doctor or patient ID — please re-select from the dropdowns",
        );
      }
      // Use explicit UTC midnight to avoid local-timezone date shifts
      const dateIso = `${createForm.date}T00:00:00Z`;
      // input[type="time"] returns "HH:mm" — pad to "HH:mm:ss" for date-span
      const [hh, mm] = createForm.startTime.split(":");
      const startTime = `${hh.padStart(2, "0")}:${(mm ?? "00").padStart(2, "0")}:00`;
      const payload = {
  doctorID: doctorIdNum,
  patientID: patientIdNum,
  date: dateIso,
  startTime,
  amount: Math.round(Number(createForm.amount)),
  paymentMethod: createForm.paymentMethod,
  paymentStatus: "Paid",
};
      const response = await adminAppointmentService.create(payload);
      setAppointments((prev) => [response.data, ...prev]);
      toast({
        title: "Success",
        description: "Appointment created successfully",
      });
      setCreateOpen(false);
      setCreateForm({
        doctorId: "",
        patientId: "",
        date: "",
        startTime: "",
        amount: "0",
        paymentMethod: "Cash",
      });
      setCreateErrors({});
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to create appointment";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      setIsUpdating(true);
      await adminAppointmentService.cancel(appointmentId);
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: "cancelled" } : apt,
        ),
      );
      toast({ title: "Success", description: "Appointment cancelled" });
      setDrawerOpen(false);
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Appointments Monitoring
            </h1>
            <p className="text-muted-foreground text-sm">
              Overview of all appointments across the center
            </p>
          </div>
          <Button
            className="gradient-bg border-0 gap-2 shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </Button>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient, doctor, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <LoadingCard />
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center pb-12">
              <p className="text-muted-foreground">No appointments found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Patient
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Doctor
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">
                      Service
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">
                      Date
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt) => (
                    <tr
                      key={apt.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={apt.patient?.avatar} />
                            <AvatarFallback className="text-xs">
                              {getPatientAvatarFallback(apt)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-foreground font-medium">
                            {getPatientDisplayName(apt)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {getDoctorDisplayName(apt)}
                      </td>
                      <td className="py-3 text-muted-foreground hidden md:table-cell">
                        {apt.service?.name}
                      </td>
                      <td className="py-3 text-muted-foreground hidden lg:table-cell">
                        {new Date(apt.date).toLocaleDateString()} {apt.time}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={apt.status} size="sm" />
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetails(apt)}
                            disabled={isUpdating || isLoadingDetails}
                          >
                            View Details
                          </Button>
                          {apt.status !== "cancelled" &&
                            apt.status !== "complete" && (
                              <>
                                {apt.status === "upcoming" && (
                                  <Button
                                    size="sm"
                                    className="gap-1"
                                    onClick={() =>
                                      handleStatusChange(apt.id, "complete")
                                    }
                                    disabled={isUpdating}
                                  >
                                    <Check className="w-3 h-3" />
                                    Complete
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-1"
                                  onClick={() =>
                                    handleCancelAppointment(apt.id)
                                  }
                                  disabled={isUpdating}
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </Button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {selectedAppointment && (
          <AppointmentDetailsDrawer
            appointment={selectedAppointment}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            role="admin"
          />
        )}
      </div>

      {/* Create Appointment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
            <DialogDescription>
              Book an appointment on behalf of a patient.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAppointment} className="space-y-4">
            {/* Doctor */}
            <div>
              <Label htmlFor="ca-doctor">Doctor</Label>
              <Select
                value={createForm.doctorId}
                onValueChange={(v) =>
                  setCreateForm((p) => ({ ...p, doctorId: v }))
                }
              >
                <SelectTrigger
                  id="ca-doctor"
                  className={`mt-1 ${createErrors.doctorId ? "border-destructive" : ""}`}
                >
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      Dr. {d.firstName} {d.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createErrors.doctorId && (
                <p className="text-xs text-destructive mt-1">
                  {createErrors.doctorId}
                </p>
              )}
            </div>

            {/* Patient */}
            <div>
              <Label htmlFor="ca-patient">Patient</Label>
              {patients.length > 0 ? (
                <Select
                  value={createForm.patientId}
                  onValueChange={(v) =>
                    setCreateForm((p) => ({ ...p, patientId: v }))
                  }
                >
                  <SelectTrigger
                    id="ca-patient"
                    className={`mt-1 ${createErrors.patientId ? "border-destructive" : ""}`}
                  >
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((pt) => (
                      <SelectItem key={pt.id} value={pt.id}>
                        {pt.firstName} {pt.lastName}
                        {pt.email ? ` — ${pt.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="ca-patient"
                  type="number"
                  min="1"
                  placeholder="Enter patient ID"
                  value={createForm.patientId}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, patientId: e.target.value }))
                  }
                  className={`mt-1 ${createErrors.patientId ? "border-destructive" : ""}`}
                />
              )}
              {createErrors.patientId && (
                <p className="text-xs text-destructive mt-1">
                  {createErrors.patientId}
                </p>
              )}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ca-date">Date</Label>
                <Input
                  id="ca-date"
                  type="date"
                  value={createForm.date}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, date: e.target.value }))
                  }
                  className={`mt-1 ${createErrors.date ? "border-destructive" : ""}`}
                />
                {createErrors.date && (
                  <p className="text-xs text-destructive mt-1">
                    {createErrors.date}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="ca-time">Start Time</Label>
                <Input
                  id="ca-time"
                  type="time"
                  value={createForm.startTime}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, startTime: e.target.value }))
                  }
                  className={`mt-1 ${createErrors.startTime ? "border-destructive" : ""}`}
                />
                {createErrors.startTime && (
                  <p className="text-xs text-destructive mt-1">
                    {createErrors.startTime}
                  </p>
                )}
              </div>
            </div>

            {/* Amount & Payment method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ca-amount">Amount (EGP)</Label>
                <Input
                  id="ca-amount"
                  type="number"
                  min="0"
                  value={createForm.amount}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  className={`mt-1 ${createErrors.amount ? "border-destructive" : ""}`}
                />
                {createErrors.amount && (
                  <p className="text-xs text-destructive mt-1">
                    {createErrors.amount}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="ca-payment">Payment</Label>
                <Select
                  value={createForm.paymentMethod}
                  onValueChange={(v) =>
                    setCreateForm((p) => ({
                      ...p,
                      paymentMethod: v as "Cash" | "Visa",
                    }))
                  }
                >
                  <SelectTrigger id="ca-payment" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Visa">Visa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 gradient-bg border-0"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Appointment"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
