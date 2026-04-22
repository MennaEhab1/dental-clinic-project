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
import { Search, Plus, Edit, Trash2, Star, Filter } from "lucide-react";
import { adminDoctorService } from "@/services/api";
import type { Doctor } from "@/types";
import { toast } from "@/hooks/use-toast";

interface DoctorFormData {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone?: string;
  specialty: string;
  experience?: number;
  consultationFee?: number;
  bio?: string;
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialty: "general",
    experience: 0,
    consultationFee: 0,
    bio: "",
  });

  // Fetch doctors on mount
  useEffect(() => {
    fetchDoctors();
  }, []);

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
      specialtyFilter === "all" || d.specialty === specialtyFilter;
    return matchesSearch && matchesSpecialty;
  });

  const handleOpenDialog = (doctor?: Doctor) => {
    if (doctor) {
      setEditingDoctor(doctor);
      setFormData({
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        password: "",
        phone: doctor.phone || "",
        specialty: doctor.specialty,
        experience: doctor.experience || 0,
        consultationFee: doctor.consultationFee || 0,
        bio: doctor.bio || "",
      });
    } else {
      setEditingDoctor(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        specialty: "general",
        experience: 0,
        consultationFee: 0,
        bio: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDoctor(null);
  };

  const handleSaveDoctor = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
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

    try {
      setIsSubmitting(true);
      if (editingDoctor) {
        // Update existing doctor
        const response = await adminDoctorService.update(
          editingDoctor.id,
          formData,
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to update doctor");
        }
        toast({ title: "Success", description: "Doctor updated successfully" });
      } else {
        // Create new doctor
        const response = await adminDoctorService.create(formData);
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
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                    />
                  </div>
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
                      placeholder="Set initial password"
                      value={formData.password || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
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
                    value={formData.specialty}
                    onValueChange={(specialty) =>
                      setFormData({ ...formData, specialty })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "general",
                        "orthodontics",
                        "cosmetic",
                        "oral-surgery",
                        "pediatric",
                        "endodontics",
                        "periodontics",
                        "prosthodontics",
                      ].map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.replace("-", " ")}
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
              {[
                "general",
                "orthodontics",
                "cosmetic",
                "oral-surgery",
                "pediatric",
                "endodontics",
                "periodontics",
                "prosthodontics",
              ].map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace("-", " ")}
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
                        <AvatarImage src={doctor.profileImage} />
                        <AvatarFallback>
                          {doctor.firstName[0]}
                          {doctor.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">
                              Dr. {doctor.firstName} {doctor.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {doctor.specialty.replace("-", " ")}
                            </p>
                          </div>
                          <div className="flex gap-1">
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
