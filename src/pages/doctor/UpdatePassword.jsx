import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, KeyRound } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/api";
import { toast } from "@/hooks/use-toast";

export default function UpdatePassword() {
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setPasswords((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const currentPassword = passwords.current.trim();
    const newPassword = passwords.next.trim();
    const confirmPassword = passwords.confirm.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Missing required fields",
        description: "Please fill in current, new, and confirmation password.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast({
        title: "Password Changed",
        description: "Your password has been updated.",
      });

      setPasswords({
        current: "",
        next: "",
        confirm: "",
      });
    } catch (error) {
      console.error("Failed to update doctor password:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground">
            Update Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Change your doctor account password using your current credentials.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-display">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="doctor-current-password">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="doctor-current-password"
                      type="password"
                      value={passwords.current}
                      onChange={handleChange("current")}
                      placeholder="Enter your current password"
                      className="pl-10"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctor-new-password">New Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="doctor-new-password"
                      type="password"
                      value={passwords.next}
                      onChange={handleChange("next")}
                      placeholder="Enter your new password"
                      className="pl-10"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctor-confirm-password">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="doctor-confirm-password"
                      type="password"
                      value={passwords.confirm}
                      onChange={handleChange("confirm")}
                      placeholder="Confirm your new password"
                      className="pl-10"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
