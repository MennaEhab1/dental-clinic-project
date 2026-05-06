import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Star,
  Filter,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { adminDoctorService, specializationService } from "@/services/api";
import type { Doctor } from "@/types";
import { toast } from "@/hooks/use-toast";

interface DoctorFormData {
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  specialityID: number;
  experience?: number;
  consultationFee?: number;
  bio?: string;
  gender: string;
  address: string;
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specializations, setSpecializations] = useState<
    { id: number; name: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>({
    fullName: "",
    email: "",
    phone: "",
    specialityID: 0,
    experience: 0,
    consultationFee: 0,
    bio: "",
    gender: "",
    address: "",
  });

  // Fetch doctors on mount
  useEffect(() => {
    fetchDoctors();
    fetchSpecializations();
  }, []);

  const fetchSpecializations = async () => {
    try {
      const res = await specializationService.getAll();
      const items = (res.data || []).map((s: { id: number; name: string }) => ({
        id: s.id,
        name: s.name,
      }));
      setSpecializations(items);
      // Set default specialityID to first item if not yet set
      if (items.length > 0) {
        setFormData((prev) => ({
          ...prev,
          specialityID: prev.specialityID || items[0].id,
        }));
      }
    } catch {
      // non-critical — dropdown will show fallback
    }
  };

  const fetchDoctors = async () => {
    try {
      setIsLoading(true);
      const response = await adminDoctorService.getAll();
      setDoctors(response.data);
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
      toast({
        title: "Error",
        description: "Failed to load doctors",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    const matchesSearch = `${d.firstName} ${d.lastName} ${d.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesSpecialty =
      specialtyFilter === "all" ||
      String(d.specialty).toLowerCase() === specialtyFilter.toLowerCase();
    return matchesSearch && matchesSpecialty;
  });

  const handleOpenDialog = (doctor?: Doctor) => {
    const defaultId = specializations[0]?.id ?? 0;
    // Warn if specializations haven't loaded yet (prevents specialityID: 0 being sent)
    if (specializations.length === 0) {
      toast({
        title: "Please wait",
        description:
          "Specializations are still loading. Try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    if (doctor) {
      // Find the matching specialization ID by name
      const matchedSpec = specializations.find(
        (s) =>
          s.name.toLowerCase().replace(/\s+/g, "") ===
          String(doctor.specialty).toLowerCase().replace(/[-\s]/g, ""),
      );
      setEditingDoctor(doctor);
      setFormData({
        fullName: `${doctor.firstName} ${doctor.lastName}`.trim(),
        email: doctor.email,
        password: "",
        phone: doctor.phone || "",
        specialityID: matchedSpec?.id ?? defaultId,
        experience: doctor.experience || 0,
        consultationFee: doctor.consultationFee || 0,
        bio: doctor.bio || "",
        gender: (doctor as Doctor & { gender?: string }).gender || "",
        address: (doctor as Doctor & { address?: string }).address || "",
      });
    } else {
      setEditingDoctor(null);
      setFormData({
        fullName: "",
        email: "",
        password: "",
        phone: "",
        specialityID: defaultId,
        experience: 0,
        consultationFee: 0,
        bio: "",
        gender: "",
        address: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDoctor(null);
  };

  const handleSaveDoctor = async () => {
    if (!formData.fullName.trim() || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!formData.specialityID || formData.specialityID <= 0) {
      toast({
        title: "Error",
        description:
          specializations.length === 0
            ? "Specializations are still loading, please wait a moment and try again"
            : "Please select a specialty",
        variant: "destructive",
      });
      return;
    }

    if (!editingDoctor && !formData.password?.trim()) {
      toast({
        title: "Error",
        description: "Password is required when creating a doctor",
        variant: "destructive",
      });
      return;
    }

    // Validate password meets ASP.NET Identity defaults to avoid backend 500
    if (!editingDoctor && formData.password) {
      const pwd = formData.password;
      const missing: string[] = [];
      if (pwd.length < 8) missing.push("at least 8 characters");
      if (!/[A-Z]/.test(pwd)) missing.push("an uppercase letter");
      if (!/[a-z]/.test(pwd)) missing.push("a lowercase letter");
      if (!/[0-9]/.test(pwd)) missing.push("a number");
      if (!/[^A-Za-z0-9]/.test(pwd))
        missing.push("a special character (e.g. !@#$%)");
      if (missing.length > 0) {
        toast({
          title: "Weak Password",
          description: `Password must contain: ${missing.join(", ")}`,
          variant: "destructive",
        });
        return;
      }
    }

    const password = (formData.password ?? "").trim();
    if (!editingDoctor && !password) {
      // Redundant safety check — should have been caught above, but guard here too
      toast({
        title: "Error",
        description: "Password is required",
        variant: "destructive",
      });
      return;
    }

    const createPayload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      password,
      salary: Math.max(0, Number(formData.consultationFee ?? 0)),
      workingHours: Math.max(0, Number(formData.experience ?? 0)),
      hiringDate: new Date().toISOString(),
      specialityID: formData.specialityID,
      gender: formData.gender,
      address: formData.address.trim(),
    };
    const serviceData = createPayload;

    try {
      setIsSubmitting(true);
      if (editingDoctor) {
        // Update existing doctor
        const response = await adminDoctorService.update(
          editingDoctor.id,
          serviceData,
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to update doctor");
        }
        // Optimistically update local state so the new name/values show immediately
        const nameParts = formData.fullName.trim().split(/\s+/);
        setDoctors((prev) =>
          prev.map((d) =>
            d.id === editingDoctor.id
              ? {
                  ...d,
                  firstName: nameParts[0] || d.firstName,
                  lastName: nameParts.slice(1).join(" ") || d.lastName,
                  consultationFee:
                    formData.consultationFee ?? d.consultationFee,
                  experience: formData.experience ?? d.experience,
                }
              : d,
          ),
        );
        toast({ title: "Success", description: "Doctor updated successfully" });
      } else {
        // Create new doctor
        const response = await adminDoctorService.create(serviceData);
        if (!response.success) {
          throw new Error(response.message || "Failed to create doctor");
        }
        toast({ title: "Success", description: "Doctor created successfully" });
      }
      await fetchDoctors();
      handleCloseDialog();
    } catch (error) {
      console.error("Failed to save doctor:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save doctor";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this doctor?")) return;

    try {
      await adminDoctorService.delete(id);
      setDoctors((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Success", description: "Doctor deleted successfully" });
    } catch (error) {
      console.error("Failed to delete doctor:", error);
      toast({
        title: "Error",
        description: "Failed to delete doctor",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (doctor: Doctor) => {
    try {
      await adminDoctorService.toggleStatus(doctor.id);
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === doctor.id ? { ...d, isActive: !(d.isActive ?? true) } : d,
        ),
      );
      const newStatus = !(doctor.isActive ?? true)
        ? "activated"
        : "deactivated";
      toast({
        title: "Success",
        description: `Doctor ${newStatus} successfully`,
      });
    } catch (error) {
      console.error("Failed to toggle doctor status:", error);
      toast({
        title: "Error",
        description: "Failed to update doctor status",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Doctor Management
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage doctors, specialties, and schedules
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="gradient-bg border-0"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Doctor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingDoctor ? "Edit Doctor" : "Add New Doctor"}
                </DialogTitle>
                <DialogDescription>
                  {editingDoctor
                    ? "Update the doctor's information below."
                    : "Fill in the details to add a new doctor."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Dr. John Smith"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="doctor@dentalcare.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                {!editingDoctor && (
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      placeholder="Min 8 chars, A-Z, a-z, 0-9, !@#$%"
                      value={formData.password || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Must include uppercase, lowercase, number, and special
                      character
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+1 555-0000"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Specialty</Label>
                  <Select
                    value={String(formData.specialityID)}
                    onValueChange={(val) =>
                      setFormData({ ...formData, specialityID: Number(val) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializations.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Experience (years)</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={formData.experience || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          experience: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Consultation Fee ($)</Label>
                    <Input
                      type="number"
                      placeholder="150"
                      value={formData.consultationFee || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          consultationFee: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(val) =>
                        setFormData({ ...formData, gender: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Address *</Label>
                    <Input
                      placeholder="123 Main St"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    placeholder="Doctor's biography..."
                    value={formData.bio || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    className="w-full gradient-bg border-0"
                    onClick={handleSaveDoctor}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Doctor"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleCloseDialog}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search doctors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-44">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Specialty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {specializations.map((s) => (
                <SelectItem key={s.id} value={s.name.toLowerCase()}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <LoadingCard />
        ) : filteredDoctors.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center pb-12">
              <p className="text-muted-foreground">No doctors found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredDoctors.map((doctor, i) => (
              <motion.div
                key={doctor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="hover:shadow-card transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={doctor.avatar} />
                        <AvatarFallback>
                          {(
                            doctor.firstName?.[0] ??
                            doctor.email?.[0] ??
                            "D"
                          ).toUpperCase()}
                          {(doctor.lastName?.[0] ?? "").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground">
                                Dr. {doctor.firstName} {doctor.lastName}
                              </p>
                              <Badge
                                variant={
                                  doctor.isActive !== false
                                    ? "default"
                                    : "secondary"
                                }
                                className={`text-[10px] px-1.5 py-0 ${
                                  doctor.isActive !== false
                                    ? "bg-green-500/15 text-green-600 border-green-500/30"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {doctor.isActive !== false
                                  ? "Active"
                                  : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground capitalize">
                              {doctor.specialty.replace("-", " ")}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={
                                doctor.isActive !== false
                                  ? "Deactivate"
                                  : "Activate"
                              }
                              onClick={() => handleToggleStatus(doctor)}
                            >
                              {doctor.isActive !== false ? (
                                <ToggleRight className="w-4 h-4 text-green-500" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenDialog(doctor)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(doctor.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-warning fill-warning" />{" "}
                            {doctor.rating || 0}
                          </span>
                          <span>{doctor.experience} yrs exp</span>
                          <span>${doctor.consultationFee}/visit</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doctor.workingDays?.slice(0, 3).map((d) => (
                            <Badge
                              key={d}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {d.slice(0, 3)}
                            </Badge>
                          ))}
                          {doctor.workingDays &&
                            doctor.workingDays.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{doctor.workingDays.length - 3}
                              </Badge>
                            )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
