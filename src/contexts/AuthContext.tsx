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
  userName: string;
  email: string;
  role: string;
  token: string;
  userId?: string; // Patient/User ID from backend
  id?: string; // Alternative ID field name
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
          const storedUser = JSON.parse(storedUserJson) as BackendUser;
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
      const userData = response.data as BackendUser;
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
      const userData = response.data as BackendUser;
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
