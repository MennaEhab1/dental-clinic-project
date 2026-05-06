import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  ChevronRight,
  Filter,
  Droplet,
  AlertTriangle,
  Pill,
  Loader2,
} from "lucide-react";
import type { Patient } from "@/types";
import type { PrescriptionDetailsDTO } from "@/types/swagger";
import { doctorService, prescriptionService } from "@/services/api";

export default function DoctorPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [prescriptionsByPatient, setPrescriptionsByPatient] = useState<
    Record<string, PrescriptionDetailsDTO[]>
  >({});
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [recordsByPatient, setRecordsByPatient] = useState<
    Record<
      string,
      {
        id: string;
        diagnosis: string;
        treatment: string;
        type: string;
        date: string;
      }[]
    >
  >({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const appointmentsRes = await doctorService.getAppointments();

        const uniquePatients = appointmentsRes.data
          .map((item) => item.patient)
          .filter((item): item is Patient => !!item)
          .filter(
            (item, index, array) =>
              array.findIndex((entry) => entry.id === item.id) === index,
          );

        setPatients(uniquePatients);

        // Pre-fetch prescriptions for all unique patients
        const prescriptionsMap: Record<string, PrescriptionDetailsDTO[]> = {};
        await Promise.allSettled(
          uniquePatients.map(async (p) => {
            try {
              const res = await prescriptionService.getByPatient(p.id);
              prescriptionsMap[p.id] = res.data || [];
            } catch {
              prescriptionsMap[p.id] = [];
            }
          }),
        );
        setPrescriptionsByPatient(prescriptionsMap);

        const mapped = appointmentsRes.data.reduce<
          Record<
            string,
            {
              id: string;
              diagnosis: string;
              treatment: string;
              type: string;
              date: string;
            }[]
          >
        >((acc, appointment) => {
          const patientId = appointment.patientId;
          if (!patientId) return acc;

          const current = acc[patientId] || [];
          current.push({
            id: appointment.id,
            diagnosis: appointment.service?.name || "Dental consultation",
            treatment: appointment.notes || "Follow-up and treatment plan",
            type: appointment.status,
            date: appointment.date,
          });
          acc[patientId] = current;
          return acc;
        }, {});

        setRecordsByPatient(mapped);
      } catch (error) {
        console.error("Failed to fetch patients:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPatients = patients.filter((p) => {
    const matchesSearch = `${p.firstName} ${p.lastName} ${p.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesGender = genderFilter === "all" || p.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  const getPatientRecords = (patientId: string) => {
    return recordsByPatient[patientId] || [];
  };

  const loadPrescriptionsForPatient = async (patientId: string) => {
    if (prescriptionsByPatient[patientId] !== undefined) return; // already loaded
    setLoadingPrescriptions(true);
    try {
      const res = await prescriptionService.getByPatient(patientId);
      setPrescriptionsByPatient((prev) => ({
        ...prev,
        [patientId]: res.data || [],
      }));
    } catch {
      setPrescriptionsByPatient((prev) => ({ ...prev, [patientId]: [] }));
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  const calculateAge = (dob: string) => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground">
            My Patients
          </h1>
          <p className="text-muted-foreground text-sm">
            View and manage your patient list
          </p>
        </motion.div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search patients by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Patients Grid */}
        {isLoading ? (
          <LoadingCard />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient, index) => {
              const records = getPatientRecords(patient.id);
              return (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="hover:shadow-card transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setProfileOpen(true);
                      loadPrescriptionsForPatient(patient.id);
                    }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={patient.avatar} />
                          <AvatarFallback>
                            {patient.firstName[0]}
                            {patient.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground truncate">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {patient.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px]">
                              {calculateAge(patient.dateOfBirth)} yrs •{" "}
                              {patient.gender}
                            </Badge>
                            {records.length > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-primary/5 text-primary"
                              >
                                {records.length} records
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {filteredPatients.length === 0 && !isLoading && (
          <p className="text-center text-muted-foreground py-12">
            No patients found matching your search.
          </p>
        )}

        {/* Patient Profile Dialog */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                Patient Profile
              </DialogTitle>
            </DialogHeader>
            {selectedPatient && (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedPatient.avatar} />
                    <AvatarFallback className="text-lg">
                      {selectedPatient.firstName[0]}
                      {selectedPatient.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      ID: {selectedPatient.id}
                    </p>
                    <Badge
                      className={`mt-1 ${selectedPatient.isActive !== false ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                    >
                      {selectedPatient.isActive !== false
                        ? "Active"
                        : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" /> {selectedPatient.email}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" /> {selectedPatient.phone}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                    <MapPin className="w-3.5 h-3.5" /> {selectedPatient.address}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />{" "}
                    {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}{" "}
                    ({calculateAge(selectedPatient.dateOfBirth)} yrs)
                  </div>
                  {selectedPatient.bloodType && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Droplet className="w-3.5 h-3.5" /> Blood:{" "}
                      {selectedPatient.bloodType}
                    </div>
                  )}
                </div>

                {selectedPatient.allergies &&
                  selectedPatient.allergies.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-warning" />{" "}
                        Allergies
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedPatient.allergies.map((a, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="bg-warning/10 text-warning text-xs"
                          >
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Medical Records
                  </h4>
                  <div className="space-y-2">
                    {getPatientRecords(selectedPatient.id).length > 0 ? (
                      getPatientRecords(selectedPatient.id).map((rec) => (
                        <div
                          key={rec.id}
                          className="p-3 rounded-lg border border-border text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">
                              {rec.diagnosis}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize"
                            >
                              {rec.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {rec.treatment}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(rec.date).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No medical records found
                      </p>
                    )}
                  </div>
                </div>

                {/* Prescriptions Section */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Pill className="w-3 h-3" /> Prescriptions
                  </h4>
                  {loadingPrescriptions ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                    </div>
                  ) : (prescriptionsByPatient[selectedPatient.id] || [])
                      .length > 0 ? (
                    <div className="space-y-2">
                      {(prescriptionsByPatient[selectedPatient.id] || []).map(
                        (rx) => (
                          <div
                            key={rx.prescriptionId}
                            className="p-3 rounded-lg border border-border text-sm"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-foreground text-xs">
                                Rx #{rx.prescriptionId}
                              </p>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(rx.date).toLocaleDateString()}
                              </span>
                            </div>
                            <ul className="space-y-0.5">
                              {(rx.medicines || []).map((med, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-muted-foreground"
                                >
                                  • {med.medicineName}{" "}
                                  {med.dosage ? `— ${med.dosage}` : ""}{" "}
                                  {med.frequency ? `(${med.frequency})` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No prescriptions found
                    </p>
                  )}
                </div>

                <Button
                  className="w-full gradient-bg border-0"
                  onClick={() => setProfileOpen(false)}
                >
                  <FileText className="w-4 h-4 mr-2" /> Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
