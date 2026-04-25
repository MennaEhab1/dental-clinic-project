import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/api";
import { toast } from "sonner";

function getQueryValue(searchParams: URLSearchParams, ...keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) return value;
  }

  return "";
}

function validatePassword(value: string): string | null {
  if (!value) return "New password is required";
  if (value.length < 6) return "Password must be at least 6 characters";

  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(value);

  if (!hasUpperCase || !hasLowerCase || !hasSpecialChar) {
    const missing = [];
    if (!hasUpperCase) missing.push("uppercase letter");
    if (!hasLowerCase) missing.push("lowercase letter");
    if (!hasSpecialChar) missing.push("special character");
    return `Password must contain ${missing.join(", ")}`;
  }

  return null;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = useMemo(
    () => getQueryValue(searchParams, "email", "Email"),
    [searchParams],
  );
  const token = useMemo(() => {
    const rawToken = getQueryValue(searchParams, "token", "Token");
    return rawToken.replace(/ /g, "+");
  }, [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  const validateForm = () => {
    const nextErrors: {
      newPassword?: string;
      confirmPassword?: string;
      form?: string;
    } = {};

    if (!email || !token) {
      nextErrors.form =
        "This reset link is incomplete. Open the full link from your email again.";
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      nextErrors.newPassword = passwordError;
    }

    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      console.debug("[ResetPasswordPage] Submitting reset with:", {
        email,
        token,
        newPasswordLength: newPassword.length,
      });
      await authService.resetPassword({
        email,
        token,
        newPassword,
      });
      toast.success("Password updated. You can now sign in.");
      navigate("/login", {
        replace: true,
        state: { resetEmail: email },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reset password";
      toast.error(message);
      setErrors((previous) => ({ ...previous, form: message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
            <div className="mb-8 text-center">
              <h1 className="font-display text-2xl font-bold text-foreground">
                Reset Password
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Enter a new password for {email || "your account"}.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {errors.form && (
                <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                  {errors.form}
                </p>
              )}

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative mt-2">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className={errors.newPassword ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-destructive mt-1">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative mt-2">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat the new password"
                    className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gradient-bg border-0"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Back to login
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}