import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    gender: "",
    address: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailSent, setEmailSent] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };
const today = new Date();

const maxDate = new Date(
  today.getFullYear() - 1,
  today.getMonth(),
  today.getDate(),
);

const minDate = new Date(
  today.getFullYear() - 120,
  today.getMonth(),
  today.getDate(),
);
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    // Optional: validate date of birth format if provided
    if (formData.dateOfBirth && isNaN(Date.parse(formData.dateOfBirth))) {
      newErrors.dateOfBirth = "Please enter a valid date of birth";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else {
      // Validate password strength (backend requirement)
      const hasUpperCase = /[A-Z]/.test(formData.password);
      const hasLowerCase = /[a-z]/.test(formData.password);
      const hasSpecialChar = /[^a-zA-Z0-9]/.test(formData.password); // Non-alphanumeric

      if (!hasUpperCase || !hasLowerCase || !hasSpecialChar) {
        const missing = [];
        if (!hasUpperCase) missing.push("uppercase letter");
        if (!hasLowerCase) missing.push("lowercase letter");
        if (!hasSpecialChar) missing.push("special character (!@#$%^&* etc.)");
        newErrors.password = `Password must contain: ${missing.join(", ")}`;
      }
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        role: "patient",
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: (formData.gender as "male" | "female" | "other") || undefined,
        address: formData.address || undefined,
      });
      toast.success("Account created successfully!");
      navigate("/patient/dashboard");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.";

      // Backend requires email confirmation — registration succeeded but no token issued
      if (
        errorMessage.toLowerCase().includes("check your email") ||
        errorMessage.toLowerCase().includes("confirm your account")
      ) {
        setEmailSent(true);
        return;
      }

      toast.error(errorMessage);
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Email-confirmation waiting screen
  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-card text-center"
        >
          <MailCheck className="w-14 h-14 text-primary mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground mt-3">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">
              {formData.email}
            </span>
            . Open it to activate your account, then sign in.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Didn't receive it? Check your spam folder or try registering again.
          </p>
          <Button asChild className="mt-6 w-full gradient-bg border-0">
            <Link to="/login">Back to Sign In</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&h=1600&fit=crop"
          alt="Dental Care"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-background via-transparent to-transparent" />
        <div className="absolute inset-0 gradient-bg opacity-20" />
      </div>

      {/* Right Side - Form */}
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
              src="/public/LogoLunare.png"
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
              Create your account
            </h1>
            <p className="text-muted-foreground mt-2">
              Join us for better dental care
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className={`mt-2 ${errors.firstName ? "border-destructive" : ""}`}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className={`mt-2 ${errors.lastName ? "border-destructive" : ""}`}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="dateOfBirth">Date of birth</Label>
                {/* <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className={`mt-2 ${errors.dateOfBirth ? "border-destructive" : ""}`}
                /> */}
                <Input
  id="dateOfBirth"
  name="dateOfBirth"
  type="date"
  value={formData.dateOfBirth}
  onChange={handleChange}
  min={minDate.toISOString().split("T")[0]}
  max={maxDate.toISOString().split("T")[0]}
  className={`mt-2 ${errors.dateOfBirth ? "border-destructive" : ""}`}
/>

{errors.dateOfBirth && (
  <p className="text-xs text-destructive mt-1">
    {errors.dateOfBirth}
  </p>
)}
                {errors.dateOfBirth && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.dateOfBirth}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange as any}
                  className={`mt-2 w-full px-3 py-2 border rounded-md bg-black/20`}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street, City, Country"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`mt-2 ${errors.email ? "border-destructive" : ""}`}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 555-123-4567"
                  className={`mt-2 ${errors.phone ? "border-destructive" : ""}`}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
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
                  <p className="text-xs text-destructive mt-1">
                    {errors.password}
                  </p>
                )}
                {!errors.password && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Password must contain: uppercase, lowercase, and special
                    character (!@#$%^&*)
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className={`mt-2 ${errors.confirmPassword ? "border-destructive" : ""}`}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.confirmPassword}
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
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
