import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { authService } from "@/services/api";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const { login, user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const resolveDashboardRoute = (role?: string) => {
    const normalizedRole = (role || "").toLowerCase();
    if (normalizedRole.includes("admin")) return "/admin/dashboard";
    if (
      normalizedRole.includes("doctor") ||
      normalizedRole.includes("dentist")
    ) {
      return "/doctor/dashboard";
    }
    return "/patient/dashboard";
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(resolveDashboardRoute(user?.role), { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, user?.role]);

  useEffect(() => {
    const resetEmail =
      (location.state as { resetEmail?: string } | null)?.resetEmail || "";
    if (resetEmail) {
      setEmail(resetEmail);
    }
  }, [location.state]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await login({ email, password });
      toast.success("Welcome back!");
      const redirectFrom = (location.state as { from?: string } | null)?.from;
      if (redirectFrom) {
        navigate(redirectFrom, { replace: true });
        return;
      }

      const storedUserRaw = localStorage.getItem("auth_user");
      const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
      navigate(resolveDashboardRoute(storedUser?.role), { replace: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotPasswordEmail || !/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
      setForgotPasswordError("Enter a valid email address");
      return;
    }

    setIsSendingReset(true);
    setForgotPasswordError("");

    try {
      await authService.forgotPassword({ email: forgotPasswordEmail });
      toast.success("Password reset email sent. Check your inbox.");
      setForgotPasswordOpen(false);
      setEmail(forgotPasswordEmail);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send reset email";
      setForgotPasswordError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sm:mx-auto sm:w-full sm:max-w-md"
        >
          <Link to="/" className="flex items-center justify-center gap-2 mb-8">
            <img
              src="/LogoLunare.png"
              alt="Lunare Logo"
              className="
      h-8
      sm:h-10
      md:h-12
      lg:h-14
      xl:h-16
      2xl:h-18
      w-auto
      object-contain
      transition-all
      duration-300
    "
            />
          </Link>

          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Welcome back
            </h1>
            <p className="text-muted-foreground mt-2">
              Sign in to access your account
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`mt-2 ${errors.email ? "border-destructive" : ""}`}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordEmail(email);
                      setForgotPasswordError("");
                      setForgotPasswordOpen(true);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={errors.password ? "border-destructive" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gradient-bg border-0"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-2 text-muted-foreground">
                    Backend authentication
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>Use your real backend account credentials.</p>
                <p className="text-xs">
                  If login fails, verify the account first in Swagger.
                </p>
              </div>
            </div> */}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
            <DialogDescription>
              Enter your email and we will ask the backend to send you a reset
              link.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="forgot-email">Email address</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="you@example.com"
                className={`mt-2 ${forgotPasswordError ? "border-destructive" : ""}`}
              />
              {forgotPasswordError && (
                <p className="text-xs text-destructive mt-1">
                  {forgotPasswordError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full gradient-bg border-0"
              disabled={isSendingReset}
            >
              {isSendingReset ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1600170311833-c2cf5280ce49?w=1200&h=1600&fit=crop"
          alt="Dental Care"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
        <div className="absolute inset-0 gradient-bg opacity-20" />
      </div>
    </div>
  );
}

/*admin@site.test ---  P@ssw0rd!1 */
/*{
  "email": "smartteethtest@gmail.com",
  "password": "Doctor123!"
} 
  ahmedhassan@smartteeth.com -nourali@smartteeth.com- Doctor@123 
khaledmahmoud@smartteeth.com
*/
