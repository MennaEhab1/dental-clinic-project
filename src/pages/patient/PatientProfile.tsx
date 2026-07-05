import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Camera,
  Save,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { authService, patientService } from "@/services/api";
import type { Patient } from "@/types";

function buildFallbackPatient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any,
): Patient {
  return {
    id: user?.id || user?.userId || "patient-local",
    email: user?.email || "",
    firstName: user?.firstName || user?.userName || "Patient",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    avatar: user?.avatar,
    role: "patient",
    dateOfBirth: user?.dateOfBirth || "",
    gender: user?.gender || "other",
    address: user?.address || "",
    bloodType: user?.bloodType,
    allergies: user?.allergies,
    isActive: true,
    emergencyContact: user?.emergencyContact,
    insuranceInfo: user?.insuranceInfo,
    createdAt: user?.createdAt || new Date().toISOString(),
    updatedAt: user?.updatedAt || new Date().toISOString(),
  };
}

export default function PatientProfile() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient>(buildFallbackPatient(user));
  const [isLoading, setIsLoading] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null); // base64 for display
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // File for upload
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    gender: "other" as "male" | "female" | "other",
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [notifications, setNotifications] = useState({
    appointments: true,
    messages: true,
    reminders: true,
    promotions: false,
  });

  useEffect(() => {
    const fetchPatient = async () => {
      const fallback = buildFallbackPatient(user);

      const loadCachedPatient = (): Patient | null => {
        try {
          const raw = localStorage.getItem("patient_profile_cache");
          if (!raw) return null;
          return JSON.parse(raw) as Patient;
        } catch (error) {
          console.warn(
            "[PatientProfile] Failed to parse cached profile",
            error,
          );
          return null;
        }
      };

      const cachePatient = (profile: Patient) => {
        try {
          localStorage.setItem(
            "patient_profile_cache",
            JSON.stringify(profile),
          );
        } catch (error) {
          console.warn("[PatientProfile] Failed to cache profile", error);
        }
      };

      try {
        const profileResponse = await patientService.getProfile(fallback);
        const cached = loadCachedPatient();
        const nextPatient = profileResponse.data || cached || fallback;
        setPatient(nextPatient);
        cachePatient(nextPatient);
      } catch (error) {
        console.error("Failed to fetch patient profile:", error);
        const cached = loadCachedPatient();
        const nextPatient = cached || fallback;
        setPatient(nextPatient);
        cachePatient(nextPatient);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatient();
  }, [user]);

  useEffect(() => {
    setFormData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      address: patient.address,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
    });
  }, [patient]);

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please choose an image smaller than 5 MB.",
        variant: "destructive",
      });
      return;
    }

    // Keep File for upload + generate base64 preview for display
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
      toast({
        title: "Photo selected",
        description: "New photo preview loaded. Click Save Changes to apply.",
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    try {
      // Build payload — always fall back to existing patient values so the
      // backend never receives empty strings for its required fields.
      const firstName = (
        formData.firstName.trim() ||
        patient.firstName ||
        ""
      ).trim();
      const lastName = (
        formData.lastName.trim() ||
        patient.lastName ||
        ""
      ).trim();
      const phone = (formData.phone.trim() || patient.phone || "").trim();
      const address = (formData.address.trim() || patient.address || "").trim();
      const gender = formData.gender || patient.gender || "other";
      const dateOfBirth = formData.dateOfBirth || patient.dateOfBirth || null;

      // Validate required fields BEFORE sending to avoid 400 from backend
      const missing: string[] = [];
      if (!firstName) missing.push("First Name");
      if (!lastName) missing.push("Last Name");
      if (!phone) missing.push("Phone");
      if (!address) missing.push("Address");
      if (!gender) missing.push("Gender");

      if (missing.length > 0) {
        toast({
          title: "Missing required fields",
          description: `Please fill in: ${missing.join(", ")}.`,
          variant: "destructive",
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        firstName,
        lastName,
        phone,
        address,
        gender,
        dateOfBirth,
      };
      // Attach the selected File so updateProfile can append it to FormData
      if (avatarFile) payload.profileImage = avatarFile;

      console.log(
        "[PatientProfile] PUT /api/patient/profile payload fields:",
        Object.keys(payload),
      );

      const updated = await patientService.updateProfile(payload, patient);

      const updatedPatient: Patient = {
        ...updated.data,
        ...(avatarPreview ? { avatar: avatarPreview } : {}),
      };

      setPatient(updatedPatient);

      try {
        localStorage.setItem(
          "patient_profile_cache",
          JSON.stringify(updatedPatient),
        );
        window.dispatchEvent(new Event("patient:profile-updated"));
      } catch (error) {
        console.warn("[PatientProfile] Failed to cache updated profile", error);
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save profile changes.",
        variant: "destructive",
      });
    }
  };

  const handlePasswordChange = async () => {
    const currentPassword = passwords.current.trim();
    const newPassword = passwords.new.trim();
    const confirmPassword = passwords.confirm.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Missing required fields",
        description: "Please fill in current, new, and confirmation password.",
        variant: "destructive",
      });
      return;
    }

    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast({
        title: "Password Changed",
        description: "Your password has been updated.",
      });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      console.error("Failed to update password:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="patient">
        <LoadingCard />
      </DashboardLayout>
    );
  }

  const avatarSrc = avatarPreview || patient.avatar || "";

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground">
            Profile & Settings
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your personal information and preferences
          </p>
        </motion.div>

        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Personal Information */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={avatarSrc} />
                      <AvatarFallback className="text-xl">
                        {patient.firstName[0]}
                        {patient.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                      onClick={handleAvatarClick}
                      type="button"
                      title="Change profile photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {patient.firstName} {patient.lastName}
                    </p>
                    {/* <p className="text-sm text-muted-foreground">
                      Patient ID: {patient.id}
                    </p> */}
                    {/* <Badge className="mt-1 bg-success/10 text-success">
                      Active
                    </Badge> */}
                    {avatarPreview && (
                      <p className="text-xs text-muted-foreground mt-1">
                        New photo selected — click Save to apply.
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" /> First Name
                    </Label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" /> Last Name
                    </Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </Label>
                    <Input type="email" value={patient.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" /> Phone
                    </Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" /> Address
                    </Label>
                    <Input
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" /> Date of Birth
                    </Label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dateOfBirth: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gender: e.target.value as "male" | "female" | "other",
                        })
                      }
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <Button onClick={handleSave} className="gradient-bg border-0">
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Lock className="w-5 h-5" /> Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={passwords.current}
                    onChange={(e) =>
                      setPasswords({ ...passwords, current: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={passwords.new}
                    onChange={(e) =>
                      setPasswords({ ...passwords, new: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirm: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={handlePasswordChange}
                  variant="outline"
                  disabled={isChangingPassword}
                >
                  <Lock className="w-4 h-4 mr-2" /> Update Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display">
                    Appearance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        Dark Mode
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Toggle between light and dark themes
                      </p>
                    </div>
                    <ThemeToggle />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-display">
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      key: "appointments",
                      label: "Appointment Reminders",
                      desc: "Get notified about upcoming appointments",
                    },
                    {
                      key: "messages",
                      label: "New Messages",
                      desc: "Get notified when you receive a message",
                    },
                    {
                      key: "reminders",
                      label: "Health Reminders",
                      desc: "Periodic dental health tips and reminders",
                    },
                    {
                      key: "promotions",
                      label: "Promotions",
                      desc: "Special offers and discounts",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.desc}
                        </p>
                      </div>
                      <Switch
                        checked={
                          notifications[item.key as keyof typeof notifications]
                        }
                        onCheckedChange={(checked) =>
                          setNotifications({
                            ...notifications,
                            [item.key]: checked,
                          })
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
