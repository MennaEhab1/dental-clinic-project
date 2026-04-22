import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { AuthCredentials, RegisterData } from "@/types";
import { authService } from "@/services/api";

// Backend UserDTO structure: { userName, email, role, token, userId?, id? }
interface BackendUser {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  userName: string;
  email: string;
  role: string;
  token: string;
  userId?: string; // Patient/User ID from backend
  id?: string; // Alternative ID field name
}

function normalizeRole(role?: string): "patient" | "doctor" | "admin" {
  const normalized = (role || "patient").toLowerCase();
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("doctor") || normalized.includes("dentist")) {
    return "doctor";
  }
  return "patient";
}

function normalizeBackendUser(raw: BackendUser): BackendUser {
  const userName = raw.userName || "";
  const normalizedUserName = userName
    .replace(/[_\-.]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  const parts = normalizedUserName.split(/\s+/).filter(Boolean);

  const explicitFirstName = (raw.firstName || "").trim();
  const explicitLastName = (raw.lastName || "").trim();

  let firstNameFromResponse = explicitFirstName;
  let lastNameFromResponse = explicitLastName;

  if (explicitFirstName && !explicitLastName) {
    const firstNameParts = explicitFirstName
      .replace(/[_\-.]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .split(/\s+/)
      .filter(Boolean);

    if (firstNameParts.length > 1) {
      firstNameFromResponse = firstNameParts[0];
      lastNameFromResponse = firstNameParts.slice(1).join(" ");
    }
  }

  const firstNameFromUserName = parts[0] || "";
  const lastNameFromUserName = parts.slice(1).join(" ");

  return {
    ...raw,
    id: raw.id || raw.userId,
    userId: raw.userId || raw.id,
    role: normalizeRole(raw.role),
    firstName: firstNameFromResponse || firstNameFromUserName,
    lastName: lastNameFromResponse || lastNameFromUserName,
  };
}

interface AuthContextType {
  user: BackendUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Store user data and token from backend
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore authentication state from localStorage on mount
    const restoreAuthState = () => {
      try {
        const storedUserJson = localStorage.getItem("auth_user");
        if (storedUserJson) {
          const storedUser = normalizeBackendUser(
            JSON.parse(storedUserJson) as BackendUser,
          );
          console.debug(
            "[AuthContext] Restored user from localStorage:",
            storedUser.userName,
          );
          setUser(storedUser);
        } else {
          console.debug("[AuthContext] No stored user found");
        }
      } catch (e) {
        console.error("[AuthContext] Failed to restore auth state:", e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuthState();

    // Listen for global logout events (dispatched by api layer on 401)
    const onAuthLogout = () => {
      setUser(null);
      try {
        localStorage.removeItem("auth_user");
      } catch (e) {
        console.error(
          "[AuthContext] Failed to remove user from localStorage:",
          e,
        );
      }
    };
    window.addEventListener("auth:logout", onAuthLogout);
    return () => window.removeEventListener("auth:logout", onAuthLogout);
  }, []);

  // Login: Send credentials to backend, receive user + token
  const login = async (credentials: AuthCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      const userData = normalizeBackendUser(response.data as BackendUser);
      // Store user data in memory and localStorage
      setUser(userData);
      try {
        localStorage.setItem("auth_user", JSON.stringify(userData));
        console.debug("[AuthContext] User persisted to localStorage");
      } catch (e) {
        console.error(
          "[AuthContext] Failed to persist user to localStorage:",
          e,
        );
      }
      // Token is stored in authService/api.ts and attached to future requests
    } catch (err) {
      // Re-throw so callers (pages) can show friendly errors
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Register: Send new user data to backend, receive user + token
  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      const userData = normalizeBackendUser(response.data as BackendUser);

      // Check if token was returned
      if (!userData || !userData.token) {
        // Registration succeeded but no token - likely email confirmation required
        console.warn(
          "[AuthContext] ⚠️  Registration succeeded but backend requires email confirmation",
        );
        console.warn(
          "[AuthContext] User must confirm their email before they can log in",
        );

        // Store minimal user info but don't set authenticated state
        // The error message will inform the user to check their email
        const errorMsg =
          "Registration successful! Please check your email to confirm your account before logging in.";
        throw new Error(errorMsg);
      }

      // Token was returned - normal flow continues
      setUser(userData);
      try {
        localStorage.setItem("auth_user", JSON.stringify(userData));
        console.debug("[AuthContext] User persisted to localStorage");
      } catch (e) {
        console.error(
          "[AuthContext] Failed to persist user to localStorage:",
          e,
        );
      }
      // Token is stored in authService/api.ts and attached to future requests

      // ===== PATIENT DATA SYNC DEBUG =====
      // After successful registration, attempt to fetch patient data
      // to verify the patient record exists in the backend patient table
      console.warn(
        "[AuthContext] 🔍 CHECKING PATIENT DATA SYNC - Attempting to verify patient record was created...",
      );

      try {
        const checkResult = await authService.verifyPatientExists();
        if (checkResult.success) {
          console.log(
            "✅ [AuthContext] Patient record verified - Patient data exists in backend!",
            checkResult.data,
          );
        } else {
          console.error(
            "❌ [AuthContext] Patient record NOT found - Backend patient table may be out of sync",
            checkResult,
          );
        }
      } catch (verifyError) {
        console.error(
          "⚠️ [AuthContext] Failed to verify patient record:",
          verifyError,
        );
      }
      // ===== END DEBUG =====
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout: Clear user from memory, token will be removed from authService
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      // Clear in-memory user state
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
