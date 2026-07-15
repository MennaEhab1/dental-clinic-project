import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Search, Eye, Mail, Phone, User, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AdminPatient {
  id: number;
  patientName: string;
  email: string;
  phone: string;
  gender: string;
  profileImageUrl: string | null;
}

const BASE_URL = "https://smart-teeth-care.runasp.net";
const MIN_AGE = 1;
const MAX_AGE = 120;

const today = new Date();

const maxDate = new Date(
  today.getFullYear() - MIN_AGE,
  today.getMonth(),
  today.getDate(),
)
  .toISOString()
  .split("T")[0];

const minDate = new Date(
  today.getFullYear() - MAX_AGE,
  today.getMonth(),
  today.getDate(),
)
  .toISOString()
  .split("T")[0];
const getToken = () => localStorage.getItem("auth_token") || "";

export default function AdminPatients() {
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<AdminPatient | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    address: "",
    gender: "",
    dateOfBirth: "",
  });

  const extractTemporaryPassword = (payload: unknown): string | null => {
    if (!payload || typeof payload !== "object") return null;
    const data = payload as Record<string, unknown>;
    const direct =
      data.temporaryPassword ??
      data.tempPassword ??
      data.password ??
      data.generatedPassword;

    if (typeof direct === "string" && direct.trim()) return direct.trim();

    const nested =
      data.data && typeof data.data === "object"
        ? (data.data as Record<string, unknown>)
        : null;

    const nestedValue =
      nested?.temporaryPassword ??
      nested?.tempPassword ??
      nested?.password ??
      nested?.generatedPassword;

    return typeof nestedValue === "string" && nestedValue.trim()
      ? nestedValue.trim()
      : null;
  };
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/api/adminPatient`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setPatients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatientById = async (id: number): Promise<AdminPatient | null> => {
    try {
      const res = await fetch(`${BASE_URL}/api/adminPatient/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return await res.json();
    } catch {
      return null;
    }
  };

  const handleAddPatient = async () => {
    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.phoneNumber.trim() ||
      !formData.address.trim() ||
      !formData.gender ||
      !formData.dateOfBirth
    ) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${BASE_URL}/api/adminPatient`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          address: formData.address.trim(),
          gender: formData.gender,
          dateOfBirth: new Date(formData.dateOfBirth).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to add patient");
      }

      const extractedPassword = extractTemporaryPassword(data);
      setTemporaryPassword(extractedPassword);

      toast({
        title: "Patient Added",
        description: extractedPassword
          ? `Temporary Password: ${extractedPassword}`
          : "Patient created successfully. Temporary password was not returned.",
      });

      setAddDialogOpen(false);

      setFormData({
        fullName: "",
        email: "",
        phoneNumber: "",
        address: "",
        gender: "",
        dateOfBirth: "",
      });

      await fetchPatients();
    } catch (error: unknown) {
      console.error(error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add patient",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewPatient = async (patient: AdminPatient) => {
    const details = await fetchPatientById(patient.id);
    setSelectedPatient(details ?? patient);
    setDialogOpen(true);
  };

  const filtered = patients.filter((p) =>
    `${p.patientName} ${p.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const getInitials = (name: string) => {
    const parts = name.trim().split(/[\s_]+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Patient Management
            </h1>
            <p className="text-muted-foreground text-sm">
              View and manage all patient accounts
            </p>
          </div>

          {/* Add Patient Button */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg border-0">
                <Plus className="w-4 h-4 mr-2" /> Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">
                  Add New Patient
                </DialogTitle>
                <DialogDescription>
                  Fill in the details to add a new patient.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>fullName *</Label>
                  <Input
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>PhoneNumber</Label>
                  <Input
                    placeholder="+1 555-0000"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>email</Label>
                  <Input
                    type="email"
                    placeholder="patient@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    placeholder="Address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                {/* <div className="space-y-2">
                  <Label>Date Of Birth</Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                  />
                </div> */}
                <div className="space-y-2">
  <Label>Date Of Birth</Label>
  <Input
    type="date"
    value={formData.dateOfBirth}
    min={minDate}
    max={maxDate}
    onChange={(e) =>
      setFormData({ ...formData, dateOfBirth: e.target.value })
    }
  />
  <p className="text-xs text-muted-foreground">
    Age must be between {MIN_AGE} and {MAX_AGE} years.
  </p>
</div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="w-full gradient-bg border-0"
                    onClick={handleAddPatient}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Adding..." : "Add Patient"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* LIST */}
        {isLoading ? (
          <LoadingCard />
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center pb-12">
              <p className="text-muted-foreground">No patients found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {filtered.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:shadow-soft transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={patient.profileImageUrl ?? undefined}
                        />
                        <AvatarFallback>
                          {getInitials(patient.patientName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {patient.patientName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {patient.email} • {patient.gender || "—"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void handleViewPatient(patient)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* VIEW DIALOG */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                Patient Details
              </DialogTitle>
            </DialogHeader>
            {selectedPatient && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={selectedPatient.profileImageUrl ?? undefined}
                    />
                    <AvatarFallback className="text-lg">
                      {getInitials(selectedPatient.patientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {selectedPatient.patientName}
                    </h3>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Mail className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Email</p>
                      <p className="text-xs font-medium text-foreground">
                        {selectedPatient.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Phone</p>
                      <p className="text-xs font-medium text-foreground">
                        {selectedPatient.phone || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <User className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Gender
                      </p>
                      <p className="text-xs font-medium text-foreground capitalize">
                        {selectedPatient.gender || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(temporaryPassword)}
          onOpenChange={(open) => {
            if (!open) setTemporaryPassword(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                Temporary Password
              </DialogTitle>
              <DialogDescription>
                Share this temporary password with the patient.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={temporaryPassword ?? ""} readOnly />
              <Button
                className="w-full"
                onClick={async () => {
                  if (!temporaryPassword) return;
                  try {
                    await navigator.clipboard.writeText(temporaryPassword);
                    toast({
                      title: "Copied",
                      description: "Temporary password copied to clipboard",
                    });
                  } catch {
                    toast({
                      title: "Copy Failed",
                      description: "Could not copy password to clipboard",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Copy Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
