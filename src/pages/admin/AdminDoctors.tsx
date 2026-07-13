// import { useState, useEffect } from "react";
// import { motion } from "framer-motion";
// import { DashboardLayout } from "@/components/layout/DashboardLayout";
// import { LoadingCard } from "@/components/common/LoadingSpinner";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import { DoctorInfoDialog } from "@/components/admin/DoctorInfoDialog";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Search,
//   Plus,
//   Edit,
//   Trash2,
//   Star,
//   Filter,
//   ToggleLeft,
//   ToggleRight,
// } from "lucide-react";
// import { adminDoctorService, specializationService } from "@/services/api";
// import type { Doctor } from "@/types";
// import { toast } from "@/hooks/use-toast";

// interface DoctorFormData {
//   fullName: string;
//   email: string;
//   password?: string;
//   specialityID: number;
//   workingHours?: number;
//   consultationFee?: number;
// }

// export default function AdminDoctors() {
//   const [doctors, setDoctors] = useState<Doctor[]>([]);
//   const [specializations, setSpecializations] = useState<
//     { id: number; name: string }[]
//   >([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [specialtyFilter, setSpecialtyFilter] = useState("all");
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
//   const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
//   const [infoOpen, setInfoOpen] = useState(false);
//   const [formData, setFormData] = useState<DoctorFormData>({
//     fullName: "",
//     email: "",
//     specialityID: 0,
//     workingHours: 0,
//     consultationFee: 0,
//   });

//   // Fetch doctors on mount
//   useEffect(() => {
//     fetchDoctors();
//     fetchSpecializations();
//   }, []);

//   const fetchSpecializations = async () => {
//     try {
//       const res = await specializationService.getAll();
//       const items = (res.data || []).map((s: { id: number; name: string }) => ({
//         id: s.id,
//         name: s.name,
//       }));
//       setSpecializations(items);
//       // Set default specialityID to first item if not yet set
//       if (items.length > 0) {
//         setFormData((prev) => ({
//           ...prev,
//           specialityID: prev.specialityID || items[0].id,
//         }));
//       }
//     } catch {
//       // non-critical — dropdown will show fallback
//     }
//   };

//   const fetchDoctors = async () => {
//     try {
//       setIsLoading(true);
//       const response = await adminDoctorService.getAll();
//       setDoctors(response.data);
//     } catch (error) {
//       console.error("Failed to fetch doctors:", error);
//       toast({
//         title: "Error",
//         description: "Failed to load doctors",
//         variant: "destructive",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const filteredDoctors = doctors.filter((d) => {
//     const matchesSearch = `${d.firstName} ${d.lastName} ${d.email}`
//       .toLowerCase()
//       .includes(searchQuery.toLowerCase());
//     const matchesSpecialty =
//       specialtyFilter === "all" ||
//       String(d.specialty).toLowerCase() === specialtyFilter.toLowerCase();
//     return matchesSearch && matchesSpecialty;
//   });

//   const buildFormDataFromDoctor = (
//     doctor: Doctor & {
//       gender?: string;
//       address?: string;
//       specialization?: string;
//       fullName?: string;
//       specialityName?: string;
//     },
//   ): DoctorFormData => {
//     const defaultId = specializations[0]?.id ?? 0;
//     const matchedSpec = specializations.find(
//       (s) =>
//         s.name.toLowerCase().replace(/\s+/g, "") ===
//         String(
//           doctor.specialityName ?? doctor.specialization ?? doctor.specialty,
//         )
//           .toLowerCase()
//           .replace(/[-\s]/g, ""),
//     );
//     const fullName =
//       doctor.fullName?.trim() ||
//       `${doctor.firstName ?? ""} ${doctor.lastName ?? ""}`.trim();

//     return {
//       fullName,
//       email: doctor.email,
//       password: "",
//       specialityID: matchedSpec?.id ?? defaultId,
//       workingHours: doctor.workingHours ?? doctor.experience ?? 0,
//       consultationFee: doctor.consultationFee ?? doctor.salary ?? 0,
//     };
//   };

//   const handleOpenDialog = async (doctor?: Doctor) => {
//     const defaultId = specializations[0]?.id ?? 0;
//     if (specializations.length === 0) {
//       toast({
//         title: "Please wait",
//         description:
//           "Specializations are still loading. Try again in a moment.",
//         variant: "destructive",
//       });
//       return;
//     }

//     if (doctor) {
//       try {
//         const response = await adminDoctorService.getById(doctor.id);
//         const doctorDetails = response.success
//           ? ((response.data as Doctor & {
//               gender?: string;
//               address?: string;
//               specialization?: string;
//               specialityName?: string;
//               fullName?: string;
//             }) ?? doctor)
//           : doctor;

//         setEditingDoctor(doctorDetails as Doctor);
//         setFormData(buildFormDataFromDoctor(doctorDetails));
//       } catch {
//         toast({
//           title: "Error",
//           description: "Failed to load doctor details",
//           variant: "destructive",
//         });
//         return;
//       }
//     } else {
//       setEditingDoctor(null);
//       setFormData({
//         fullName: "",
//         email: "",
//         password: "",
//         specialityID: defaultId,
//         workingHours: 0,
//         consultationFee: 0,
//       });
//     }

//     setDialogOpen(true);
//   };

//   const handleViewDoctor = async (doctor: Doctor) => {
//     try {
//       const response = await adminDoctorService.getById(doctor.id);

//       if (response.success) {
//         setSelectedDoctor(response.data);
//         setInfoOpen(true);
//       }
//     } catch {
//       toast({
//         title: "Error",
//         description: "Failed to load doctor information",
//         variant: "destructive",
//       });
//     }
//   };
//   const handleCloseDialog = () => {
//     setDialogOpen(false);
//     setEditingDoctor(null);
//   };

//   const handleSaveDoctor = async () => {
//     if (!formData.fullName.trim() || !formData.email) {
//       toast({
//         title: "Error",
//         description: "Please fill in all required fields",
//         variant: "destructive",
//       });
//       return;
//     }

//     if (!formData.specialityID || formData.specialityID <= 0) {
//       toast({
//         title: "Error",
//         description:
//           specializations.length === 0
//             ? "Specializations are still loading, please wait a moment and try again"
//             : "Please select a specialty",
//         variant: "destructive",
//       });
//       return;
//     }

//     if (!editingDoctor && !formData.password?.trim()) {
//       toast({
//         title: "Error",
//         description: "Password is required when creating a doctor",
//         variant: "destructive",
//       });
//       return;
//     }

//     // Validate password meets ASP.NET Identity defaults to avoid backend 500
//     if (!editingDoctor && formData.password) {
//       const pwd = formData.password;
//       const missing: string[] = [];
//       if (pwd.length < 8) missing.push("at least 8 characters");
//       if (!/[A-Z]/.test(pwd)) missing.push("an uppercase letter");
//       if (!/[a-z]/.test(pwd)) missing.push("a lowercase letter");
//       if (!/[0-9]/.test(pwd)) missing.push("a number");
//       if (!/[^A-Za-z0-9]/.test(pwd))
//         missing.push("a special character (e.g. !@#$%)");
//       if (missing.length > 0) {
//         toast({
//           title: "Weak Password",
//           description: `Password must contain: ${missing.join(", ")}`,
//           variant: "destructive",
//         });
//         return;
//       }
//     }

//     const password = (formData.password ?? "").trim();
//     if (!editingDoctor && !password) {
//       // Redundant safety check — should have been caught above, but guard here too
//       toast({
//         title: "Error",
//         description: "Password is required",
//         variant: "destructive",
//       });
//       return;
//     }

//     const createPayload = {
//       fullName: formData.fullName.trim(),
//       email: formData.email.trim(),
//       password,
//       salary: Math.max(0, Number(formData.consultationFee ?? 0)),
//       workingHours: Math.max(0, Number(formData.workingHours ?? 0)),
//       hiringDate: new Date().toISOString(),
//       specialityID: formData.specialityID,
//     };
//     const updatePayload = {
//       fullName: formData.fullName.trim(),
//       salary: Math.max(0, Number(formData.consultationFee ?? 0)),
//       workingHours: Math.max(0, Number(formData.workingHours ?? 0)),
//       specialityID: formData.specialityID,
//     };
//     const serviceData = editingDoctor ? updatePayload : createPayload;

//     try {
//       setIsSubmitting(true);
//       if (editingDoctor) {
//         const response = await adminDoctorService.update(
//           editingDoctor.id,
//           serviceData,
//         );
//         if (!response.success) {
//           throw new Error(response.message || "Failed to update doctor");
//         }

//         const updatedDoctor = response.data as Doctor & {
//           gender?: string;
//           address?: string;
//           specialization?: string;
//           fullName?: string;
//         };
//         const nameParts = formData.fullName.trim().split(/\s+/);
//         setDoctors((prev) =>
//           prev.map((d) =>
//             d.id === editingDoctor.id
//               ? {
//                   ...d,
//                   firstName: updatedDoctor.firstName || nameParts[0] || d.firstName,
//                   lastName:
//                     updatedDoctor.lastName ||
//                     nameParts.slice(1).join(" ") ||
//                     d.lastName,
//                   consultationFee:
//                     updatedDoctor.consultationFee ??
//                     formData.consultationFee ??
//                     d.consultationFee,
//                   experience:
//                     updatedDoctor.workingHours ??
//                     updatedDoctor.experience ??
//                     formData.workingHours ??
//                     d.experience,
//                   specialty: updatedDoctor.specialty || d.specialty,
//                   email: updatedDoctor.email || d.email,
//                 }
//               : d,
//           ),
//         );
//         const refreshedDoctor = await adminDoctorService.getById(editingDoctor.id);
//         if (refreshedDoctor.success && refreshedDoctor.data) {
//           setSelectedDoctor(refreshedDoctor.data);
//         }
//         toast({ title: "Success", description: "Doctor updated successfully" });
//       } else {
//         const response = await adminDoctorService.create(serviceData);
//         if (!response.success) {
//           throw new Error(response.message || "Failed to create doctor");
//         }
//         toast({ title: "Success", description: "Doctor created successfully" });
//       }
//       await fetchDoctors();
//       handleCloseDialog();
//     } catch (error) {
//       console.error("Failed to save doctor:", error);
//       const errorMessage =
//         error instanceof Error ? error.message : "Failed to save doctor";
//       toast({
//         title: "Error",
//         description: errorMessage,
//         variant: "destructive",
//       });
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleDelete = async (id: string) => {
//     if (!confirm("Are you sure you want to delete this doctor?")) return;

//     try {
//       await adminDoctorService.delete(id);
//       setDoctors((prev) => prev.filter((d) => d.id !== id));
//       toast({ title: "Success", description: "Doctor deleted successfully" });
//     } catch (error) {
//       console.error("Failed to delete doctor:", error);
//       toast({
//         title: "Error",
//         description: "Failed to delete doctor",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleToggleStatus = async (doctor: Doctor) => {
//     try {
//       await adminDoctorService.toggleStatus(doctor.id);
//       setDoctors((prev) =>
//         prev.map((d) =>
//           d.id === doctor.id ? { ...d, isActive: !(d.isActive ?? true) } : d,
//         ),
//       );
//       const newStatus = !(doctor.isActive ?? true)
//         ? "activated"
//         : "deactivated";
//       toast({
//         title: "Success",
//         description: `Doctor ${newStatus} successfully`,
//       });
//     } catch (error) {
//       console.error("Failed to toggle doctor status:", error);
//       toast({
//         title: "Error",
//         description: "Failed to update doctor status",
//         variant: "destructive",
//       });
//     }
//   };

//   return (
//     <DashboardLayout role="admin">
//       <div className="space-y-6">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
//         >
//           <div>
//             <h1 className="font-display text-2xl font-bold text-foreground">
//               Doctor Management
//             </h1>
//             <p className="text-muted-foreground text-sm">
//               Manage doctors, specialties, and schedules
//             </p>
//           </div>
//           <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
//             <DialogTrigger asChild>
//               <Button
//                 className="gradient-bg border-0"
//                 onClick={() => handleOpenDialog()}
//               >
//                 <Plus className="w-4 h-4 mr-2" /> Add Doctor
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="max-w-lg">
//               <DialogHeader>
//                 <DialogTitle className="font-display">
//                   {editingDoctor ? "Edit Doctor" : "Add New Doctor"}
//                 </DialogTitle>
//                 <DialogDescription>
//                   {editingDoctor
//                     ? "Update the doctor's information below."
//                     : "Fill in the details to add a new doctor."}
//                 </DialogDescription>
//               </DialogHeader>
//               <div className="space-y-4">
//                 <div className="space-y-2">
//                   <Label>Full Name *</Label>
//                   <Input
//                     placeholder="Dr. John Smith"
//                     value={formData.fullName}
//                     onChange={(e) =>
//                       setFormData({ ...formData, fullName: e.target.value })
//                     }
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Email *</Label>
//                   <Input
//                     type="email"
//                     placeholder="doctor@dentalcare.com"
//                     value={formData.email}
//                     onChange={(e) =>
//                       setFormData({ ...formData, email: e.target.value })
//                     }
//                   />
//                 </div>
//                 {!editingDoctor && (
//                   <div className="space-y-2">
//                     <Label>Password *</Label>
//                     <Input
//                       type="password"
//                       placeholder="Min 8 chars, A-Z, a-z, 0-9, !@#$%"
//                       value={formData.password || ""}
//                       onChange={(e) =>
//                         setFormData({ ...formData, password: e.target.value })
//                       }
//                     />
//                     <p className="text-xs text-muted-foreground">
//                       Must include uppercase, lowercase, number, and special
//                       character
//                     </p>
//                   </div>
//                 )}
//                 <div className="space-y-2">
//                   <Label>Specialization</Label>
//                   <Select
//                     value={String(formData.specialityID)}
//                     onValueChange={(val) =>
//                       setFormData({ ...formData, specialityID: Number(val) })
//                     }
//                   >
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select specialization" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {specializations.map((s) => (
//                         <SelectItem key={s.id} value={String(s.id)}>
//                           {s.name}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="grid grid-cols-2 gap-4">
//                   <div className="space-y-2">
//                     <Label>Working Hours</Label>
//                     <Input
//                       type="number"
//                       placeholder="8"
//                       value={formData.workingHours || ""}
//                       onChange={(e) =>
//                         setFormData({
//                           ...formData,
//                           workingHours: parseInt(e.target.value) || 0,
//                         })
//                       }
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <Label>Consultation Fee ($)</Label>
//                     <Input
//                       type="number"
//                       placeholder="150"
//                       value={formData.consultationFee || ""}
//                       onChange={(e) =>
//                         setFormData({
//                           ...formData,
//                           consultationFee: parseInt(e.target.value) || 0,
//                         })
//                       }
//                     />
//                   </div>
//                 </div>
//                 <div className="flex gap-2 pt-2">
//                   <Button
//                     className="w-full gradient-bg border-0"
//                     onClick={handleSaveDoctor}
//                     disabled={isSubmitting}
//                   >
//                     {isSubmitting ? "Saving..." : "Save Doctor"}
//                   </Button>
//                   <Button
//                     variant="outline"
//                     className="w-full"
//                     onClick={handleCloseDialog}
//                     disabled={isSubmitting}
//                   >
//                     Cancel
//                   </Button>
//                 </div>
//               </div>
//             </DialogContent>
//           </Dialog>
//         </motion.div>

//         <div className="flex flex-col sm:flex-row gap-3">
//           <div className="relative flex-1">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//             <Input
//               placeholder="Search doctors..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="pl-9"
//             />
//           </div>
//           <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
//             <SelectTrigger className="w-44">
//               <Filter className="w-4 h-4 mr-2" />
//               <SelectValue placeholder="Specialty" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All Specialties</SelectItem>
//               {specializations.map((s) => (
//                 <SelectItem key={s.id} value={s.name.toLowerCase()}>
//                   {s.name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//         {isLoading ? (
//           <LoadingCard />
//         ) : filteredDoctors.length === 0 ? (
//           <Card>
//             <CardContent className="pt-12 text-center pb-12">
//               <p className="text-muted-foreground">No doctors found</p>
//             </CardContent>
//           </Card>
//         ) : (
//           <div className="grid md:grid-cols-2 gap-4">
//             {filteredDoctors.map((doctor, i) => (
//               <motion.div
//                 key={doctor.id}
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ delay: i * 0.05 }}
//               >
//                 <Card
//                   className="hover:shadow-card transition-all cursor-pointer"
//                   onClick={() => void handleViewDoctor(doctor)}
//                 >
//                   <CardContent className="p-5">
//                     <div className="flex items-start gap-4">
//                       <Avatar className="h-14 w-14">
//                         <AvatarImage src={doctor.avatar} />
//                         <AvatarFallback>
//                           {(
//                             doctor.firstName?.[0] ??
//                             doctor.email?.[0] ??
//                             "D"
//                           ).toUpperCase()}
//                           {(doctor.lastName?.[0] ?? "").toUpperCase()}
//                         </AvatarFallback>
//                       </Avatar>
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-start justify-between">
//                           <div>
//                             <div className="flex items-center gap-2">
//                               <p className="font-semibold text-foreground">
//                                 {doctor.firstName} {doctor.lastName}
//                               </p>
//                               <Badge
//                                 variant={
//                                   doctor.isActive !== false
//                                     ? "default"
//                                     : "secondary"
//                                 }
//                                 className={`text-[10px] px-1.5 py-0 ${
//                                   doctor.isActive !== false
//                                     ? "bg-green-500/15 text-green-600 border-green-500/30"
//                                     : "bg-muted text-muted-foreground"
//                                 }`}
//                               >
//                                 {doctor.isActive !== false
//                                   ? "Active"
//                                   : "Inactive"}
//                               </Badge>
//                             </div>
//                             <p className="text-xs text-muted-foreground capitalize">
//                               {doctor.specialty.replace("-", " ")}
//                             </p>
//                           </div>
//                           <div className="flex gap-1">
//                             <Button
//                               variant="ghost"
//                               size="icon"
//                               className="h-8 w-8"
//                               title={
//                                 doctor.isActive !== false
//                                   ? "Deactivate"
//                                   : "Activate"
//                               }
//                               onClick={(event) => {
//                                 event.stopPropagation();
//                                 void handleToggleStatus(doctor);
//                               }}
//                             >
//                               {doctor.isActive !== false ? (
//                                 <ToggleRight className="w-4 h-4 text-green-500" />
//                               ) : (
//                                 <ToggleLeft className="w-4 h-4 text-muted-foreground" />
//                               )}
//                             </Button>
//                             <Button
//                               variant="ghost"
//                               size="icon"
//                               className="h-8 w-8"
//                               onClick={(event) => {
//                                 event.stopPropagation();
//                                 void handleOpenDialog(doctor);
//                               }}
//                             >
//                               <Edit className="w-3.5 h-3.5" />
//                             </Button>
//                             <Button
//                               variant="ghost"
//                               size="icon"
//                               className="h-8 w-8 text-destructive hover:text-destructive"
//                               onClick={(event) => {
//                                 event.stopPropagation();
//                                 void handleDelete(doctor.id);
//                               }}
//                             >
//                               <Trash2 className="w-3.5 h-3.5" />
//                             </Button>
//                           </div>
//                         </div>
//                         <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
//                           <span className="flex items-center gap-1">
//                             <Star className="w-3 h-3 text-warning fill-warning" />{" "}
//                             {doctor.rating || 0}
//                           </span>
//                           <span>{doctor.experience} yrs exp</span>
//                           <span>${doctor.consultationFee}/visit</span>
//                         </div>
//                         <div className="flex flex-wrap gap-1 mt-2">
//                           {doctor.workingDays?.slice(0, 3).map((d) => (
//                             <Badge
//                               key={d}
//                               variant="outline"
//                               className="text-[10px]"
//                             >
//                               {d.slice(0, 3)}
//                             </Badge>
//                           ))}
//                           {doctor.workingDays &&
//                             doctor.workingDays.length > 3 && (
//                               <Badge variant="outline" className="text-[10px]">
//                                 +{doctor.workingDays.length - 3}
//                               </Badge>
//                             )}
//                         </div>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               </motion.div>
//             ))}
//           </div>
//         )}
//       </div>
//       {selectedDoctor && (
//         <DoctorInfoDialog
//           doctor={selectedDoctor}
//           open={infoOpen}
//           onOpenChange={setInfoOpen}
//         />
//       )}
//     </DashboardLayout>
//   );
// }























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
import { DoctorInfoDialog } from "@/components/admin/DoctorInfoDialog";
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
  specialityID: number;
  workingHours?: number;
  consultationFee?: number;
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specializations, setSpecializations] = useState<{ id: number; name: string }[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [formData, setFormData] = useState<DoctorFormData>({
    fullName: "",
    email: "",
    specialityID: 0,
    workingHours: 0,
    consultationFee: 0,
  });

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
      if (items.length > 0) {
        setFormData((prev) => ({
          ...prev,
          specialityID: prev.specialityID || items[0].id,
        }));
      }
    } catch {
      // non-critical
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

  const buildFormDataFromDoctor = (
    doctor: Doctor & {
      gender?: string;
      address?: string;
      specialization?: string;
      fullName?: string;
      specialityName?: string;
    },
  ): DoctorFormData => {
    const defaultId = specializations[0]?.id ?? 0;
    const matchedSpec = specializations.find(
      (s) =>
        s.name.toLowerCase().replace(/\s+/g, "") ===
        String(
          doctor.specialityName ?? doctor.specialization ?? doctor.specialty,
        )
          .toLowerCase()
          .replace(/[-\s]/g, ""),
    );
    const fullName =
      doctor.fullName?.trim() ||
      `${doctor.firstName ?? ""} ${doctor.lastName ?? ""}`.trim();

    return {
      fullName,
      email: doctor.email,
      password: "",
      specialityID: matchedSpec?.id ?? defaultId,
      workingHours: doctor.workingHours ?? doctor.experience ?? 0,
      consultationFee: doctor.consultationFee ?? doctor.salary ?? 0,
    };
  };

  const handleOpenDialog = async (doctor?: Doctor) => {
    const defaultId = specializations[0]?.id ?? 0;
    if (specializations.length === 0) {
      toast({
        title: "Please wait",
        description: "Specializations are still loading. Try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    if (doctor) {
      try {
        const response = await adminDoctorService.getById(doctor.id);
        const doctorDetails = response.success
          ? ((response.data as Doctor & {
              gender?: string;
              address?: string;
              specialization?: string;
              specialityName?: string;
              fullName?: string;
            }) ?? doctor)
          : doctor;

        setEditingDoctor(doctorDetails as Doctor);
        setFormData(buildFormDataFromDoctor(doctorDetails));
      } catch {
        toast({
          title: "Error",
          description: "Failed to load doctor details",
          variant: "destructive",
        });
        return;
      }
    } else {
      setEditingDoctor(null);
      setFormData({
        fullName: "",
        email: "",
        password: "",
        specialityID: defaultId,
        workingHours: 0,
        consultationFee: 0,
      });
    }

    setDialogOpen(true);
  };

  const handleViewDoctor = async (doctor: Doctor) => {
    try {
      const response = await adminDoctorService.getById(doctor.id);
      if (response.success) {
        setSelectedDoctor(response.data);
        setInfoOpen(true);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load doctor information",
        variant: "destructive",
      });
    }
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
      workingHours: Math.max(0, Number(formData.workingHours ?? 0)),
      hiringDate: new Date().toISOString(),
      specialityID: formData.specialityID,
    };
    const updatePayload = {
      fullName: formData.fullName.trim(),
      salary: Math.max(0, Number(formData.consultationFee ?? 0)),
      workingHours: Math.max(0, Number(formData.workingHours ?? 0)),
      specialityID: formData.specialityID,
    };
    const serviceData = editingDoctor ? updatePayload : createPayload;

    try {
      setIsSubmitting(true);
      if (editingDoctor) {
        const response = await adminDoctorService.update(
          editingDoctor.id,
          serviceData,
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to update doctor");
        }

        const updatedDoctor = response.data as Doctor & {
          gender?: string;
          address?: string;
          specialization?: string;
          fullName?: string;
        };
        const nameParts = formData.fullName.trim().split(/\s+/);
        setDoctors((prev) =>
          prev.map((d) =>
            d.id === editingDoctor.id
              ? {
                  ...d,
                  firstName: updatedDoctor.firstName || nameParts[0] || d.firstName,
                  lastName:
                    updatedDoctor.lastName ||
                    nameParts.slice(1).join(" ") ||
                    d.lastName,
                  consultationFee:
                    updatedDoctor.consultationFee ??
                    formData.consultationFee ??
                    d.consultationFee,
                  experience:
                    updatedDoctor.workingHours ??
                    updatedDoctor.experience ??
                    formData.workingHours ??
                    d.experience,
                  specialty: updatedDoctor.specialty || d.specialty,
                  email: updatedDoctor.email || d.email,
                }
              : d,
          ),
        );
        const refreshedDoctor = await adminDoctorService.getById(editingDoctor.id);
        if (refreshedDoctor.success && refreshedDoctor.data) {
          setSelectedDoctor(refreshedDoctor.data);
        }
        toast({ title: "Success", description: "Doctor updated successfully" });
      } else {
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
      const errorMessage = error instanceof Error ? error.message : "";
      const hasAppointments =
        errorMessage.toLowerCase().includes("upcoming appointments") ||
        errorMessage.toLowerCase().includes("appointments are finished");

      toast({
        title: hasAppointments ? "Cannot Delete Doctor" : "Error",
        description: hasAppointments
          ? "This doctor has upcoming appointments. Please wait until all appointments are finished before deleting."
          : "Failed to delete doctor",
        variant: "destructive",
      });
    }
  };



  // const handleToggleStatus = async (doctor: Doctor) => {
  //   const isCurrentlyActive = doctor.isActive !== false;

  //   if (isCurrentlyActive) {
  //     try {
  //       await adminDoctorService.toggleStatus(doctor.id);
  //       setDoctors((prev) =>
  //         prev.map((d) =>
  //           d.id === doctor.id ? { ...d, isActive: false } : d,
  //         ),
  //       );
  //       toast({ title: "Success", description: "Doctor deactivated successfully" });
  //     } catch (error) {
  //       const errorMessage = error instanceof Error ? error.message : "";
  //       const hasAppointments =
  //         errorMessage.toLowerCase().includes("upcoming appointments") ||
  //         errorMessage.toLowerCase().includes("cancelappointments");

  //       if (hasAppointments) {
  //         const countMatch = errorMessage.match(/has (\d+) upcoming/);
  //         const count = countMatch ? countMatch[1] : "some";

  //         const confirmed = confirm(
  //           `This doctor has ${count} upcoming appointment(s). Do you want to cancel them and deactivate the doctor?`
  //         );

  //         if (confirmed) {
  //           try {
  //             const token = localStorage.getItem("auth_token");
  //             const res = await fetch(
  //               `https://smart-teeth-care.runasp.net/api/admin/doctors/toggle-status/${doctor.id}?cancelAppointments=true`,
  //               {
  //                 method: "PUT",
  //                 headers: {
  //                   Authorization: `Bearer ${token}`,
  //                 },
  //               }
  //             );

  //             if (!res.ok) {
  //               throw new Error("Failed to deactivate doctor");
  //             }

  //             setDoctors((prev) =>
  //               prev.map((d) =>
  //                 d.id === doctor.id ? { ...d, isActive: false } : d,
  //               ),
  //             );
  //             toast({
  //               title: "Success",
  //               description: "Doctor deactivated and appointments cancelled successfully",
  //             });
  //           } catch {
  //             toast({
  //               title: "Error",
  //               description: "Failed to deactivate doctor",
  //               variant: "destructive",
  //             });
  //           }
  //         }
  //       } else {
  //         toast({
  //           title: "Error",
  //           description: "Failed to update doctor status",
  //           variant: "destructive",
  //         });
  //       }
  //     }
  //   } else {
  //     try {
  //       await adminDoctorService.toggleStatus(doctor.id);
  //       setDoctors((prev) =>
  //         prev.map((d) =>
  //           d.id === doctor.id ? { ...d, isActive: true } : d,
  //         ),
  //       );
  //       toast({ title: "Success", description: "Doctor activated successfully" });
  //     } catch {
  //       toast({
  //         title: "Error",
  //         description: "Failed to activate doctor",
  //         variant: "destructive",
  //       });
  //     }
  //   }
  // };
const handleToggleStatus = async (doctor: Doctor) => {
  const isCurrentlyActive = doctor.isActive !== false;

  if (isCurrentlyActive) {
    // ✅ اسأل المستخدم أولاً قبل ما نبعت أي request
    const hasAppointmentsChoice = confirm(
      `Do you want to cancel this doctor's upcoming appointments and deactivate them?\n\nClick OK to cancel appointments and deactivate.\nClick Cancel to deactivate only if no appointments exist.`
    );

    if (hasAppointmentsChoice) {
      // بعت مع cancelAppointments=true مباشرة
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(
          `https://smart-teeth-care.runasp.net/api/admin/doctors/toggle-status/${doctor.id}?cancelAppointments=true`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed");
        setDoctors((prev) =>
          prev.map((d) => d.id === doctor.id ? { ...d, isActive: false } : d)
        );
        toast({ title: "Success", description: "Doctor deactivated and appointments cancelled successfully" });
      } catch {
        toast({ title: "Error", description: "Failed to deactivate doctor", variant: "destructive" });
      }
    } else {
      // بعت بدون cancelAppointments - لو مفيش مواعيد هيتعمل deactivate
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(
          `https://smart-teeth-care.runasp.net/api/admin/doctors/toggle-status/${doctor.id}?cancelAppointments=false`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) {
          const data = await res.json();
          const msg = data?.message || "";
          if (msg.toLowerCase().includes("upcoming appointments") || msg.toLowerCase().includes("cancelappointments")) {
            toast({
              title: "Cannot Deactivate",
              description: "This doctor has upcoming appointments. Please cancel them first or choose to cancel them when deactivating.",
              variant: "destructive",
            });
          } else {
            toast({ title: "Error", description: "Failed to deactivate doctor", variant: "destructive" });
          }
          return;
        }
        setDoctors((prev) =>
          prev.map((d) => d.id === doctor.id ? { ...d, isActive: false } : d)
        );
        toast({ title: "Success", description: "Doctor deactivated successfully" });
      } catch {
        toast({ title: "Error", description: "Failed to deactivate doctor", variant: "destructive" });
      }
    }
  } else {
    // Activate
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        `https://smart-teeth-care.runasp.net/api/admin/doctors/toggle-status/${doctor.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed");
      setDoctors((prev) =>
        prev.map((d) => d.id === doctor.id ? { ...d, isActive: true } : d)
      );
      toast({ title: "Success", description: "Doctor activated successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to activate doctor", variant: "destructive" });
    }
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
                      Must include uppercase, lowercase, number, and special character
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Select
                    value={String(formData.specialityID)}
                    onValueChange={(val) =>
                      setFormData({ ...formData, specialityID: Number(val) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialization" />
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
                    <Label>Working Hours</Label>
                    <Input
                      type="number"
                      placeholder="8"
                      value={formData.workingHours || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          workingHours: parseInt(e.target.value) || 0,
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
                <Card
                  className="hover:shadow-card transition-all cursor-pointer"
                  onClick={() => void handleViewDoctor(doctor)}
                >
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
                                {doctor.firstName} {doctor.lastName}
                              </p>
                              <Badge
                                variant={
                                  doctor.isActive !== false ? "default" : "secondary"
                                }
                                className={`text-[10px] px-1.5 py-0 ${
                                  doctor.isActive !== false
                                    ? "bg-green-500/15 text-green-600 border-green-500/30"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {doctor.isActive !== false ? "Active" : "Inactive"}
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
                                doctor.isActive !== false ? "Deactivate" : "Activate"
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleToggleStatus(doctor);
                              }}
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
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleOpenDialog(doctor);
                              }}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDelete(doctor.id);
                              }}
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
                            <Badge key={d} variant="outline" className="text-[10px]">
                              {d.slice(0, 3)}
                            </Badge>
                          ))}
                          {doctor.workingDays && doctor.workingDays.length > 3 && (
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
      {selectedDoctor && (
        <DoctorInfoDialog
          doctor={selectedDoctor}
          open={infoOpen}
          onOpenChange={setInfoOpen}
        />
      )}
    </DashboardLayout>
  );
}
