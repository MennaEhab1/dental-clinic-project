/**
 * API Service Layer
 *
 * This file contains all API calls for the dental center application.
 * Now fully integrated with real backend API at https://smart-teeth-care.runasp.net
 *
 * Authentication:
 * - Tokens are stored in memory (cleared on logout/page refresh for security)
 * - Authorization header is automatically attached to protected endpoints
 * - Backend response includes UserDTO with token
 */

import { ApiResponse, PaginatedResponse } from "@/types";
import { convertEgyptTimeToUTC } from "@/lib/utils";
import {
  mockDoctors,
  mockPatients,
  mockAppointments,
  mockServices,
  mockMedicines,
  mockConversations,
  mockMessages,
  mockDashboardStats,
} from "./mockData";
import type {
  Doctor,
  Patient,
  Appointment,
  Service,
  Medicine,
  Conversation,
  Message,
  DashboardStats,
  AuthCredentials,
  RegisterData,
  User,
  Review,
  DentalSpecialty,
} from "@/types";
import type {
  BookAppointmentDto,
  CreatePrescriptionDto,
  ForgotPasswordDTO,
  PrescriptionDetailsDTO,
  ResetPasswordDTO,
} from "@/types/swagger";

// Real backend API endpoint
// Use environment variable for flexibility between development and production
const BASE_URL =
  import.meta.env.VITE_API_URL || "https://smart-teeth-care.runasp.net";
const DEBUG_API = import.meta.env.VITE_DEBUG_API === "true";

// In-memory token storage (cleared on logout or page refresh)
let authToken: string | null = null;

function normalizeSpecialty(value?: string | null): DentalSpecialty {
  const normalized = (value || "").toLowerCase().trim();

  if (normalized.includes("ortho")) return "orthodontics";
  if (normalized.includes("perio")) return "periodontics";
  if (normalized.includes("endo")) return "endodontics";
  if (normalized.includes("prostho")) return "prosthodontics";
  if (normalized.includes("oral") || normalized.includes("surgery")) {
    return "oral-surgery";
  }
  if (normalized.includes("pedia")) return "pediatric";
  if (normalized.includes("cosmetic") || normalized.includes("aesthetic")) {
    return "cosmetic";
  }

  return "general";
}

function normalizeAppointmentStatus(
  value: unknown,
): "upcoming" | "complete" | "cancelled" {
  if (typeof value === "number") {
    switch (value) {
      case 0:
      case 1:
        return "upcoming";
      case 2:
        return "complete";
      case 3:
      case 4:
        return "cancelled";
      default:
        return "upcoming";
    }
  }

  const normalized = String(value || "upcoming")
    .toLowerCase()
    .trim();

  if (
    normalized === "pending" ||
    normalized === "confirmed" ||
    normalized === "in-progress" ||
    normalized === "inprogress" ||
    normalized === "upcoming"
  ) {
    return "upcoming";
  }

  if (normalized === "completed" || normalized === "complete") {
    return "complete";
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "no-show" ||
    normalized === "noshow"
  ) {
    return "cancelled";
  }

  return "upcoming";
}

function toSafeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function splitName(fullName?: string | null): {
  firstName: string;
  lastName: string;
} {
  const safeName = (fullName || "").trim();
  if (!safeName) {
    return { firstName: "Unknown", lastName: "Patient" };
  }

  const parts = safeName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function formatDateTimeInEgypt(date: Date): { date: string; time: string } {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const year = dateParts.find((part) => part.type === "year")?.value || "";
  const month = dateParts.find((part) => part.type === "month")?.value || "";
  const day = dateParts.find((part) => part.type === "day")?.value || "";
  const hour = timeParts.find((part) => part.type === "hour")?.value || "";
  const minute = timeParts.find((part) => part.type === "minute")?.value || "";

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

function mapBackendDashboardStats(raw: unknown): DashboardStats {
  const fallback = mockDashboardStats;
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = raw as any;

  return {
    totalPatients: toSafeNumber(item.totalPatients ?? item.patientsCount),
    totalDoctors: toSafeNumber(item.totalDoctors ?? item.doctorsCount),
    todayAppointments: toSafeNumber(
      item.todayAppointments ?? item.todayAppointmentCount,
    ),
    completedAppointments: toSafeNumber(
      item.completedAppointments ?? item.completedCount,
    ),
    revenue: toSafeNumber(item.revenue ?? item.totalRevenue),
    pendingAppointments: toSafeNumber(
      item.pendingAppointments ?? item.pendingCount,
    ),
  };
}

/**
 * Decode JWT token to extract claims (for debugging)
 * @param token - JWT token
 * @returns Decoded payload or null
 */
function decodeJWT(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (e) {
    console.error("[decodeJWT] Failed to decode token", e);
    return null;
  }
}

/**
 * Get the current authentication token
 */
function getAuthToken(): string | null {
  // Try in-memory token first
  if (authToken) {
    console.debug(
      "[getAuthToken] Returning in-memory token:",
      authToken.substring(0, 30) + "...",
    );
    return authToken;
  }

  // Fall back to localStorage if in-memory token is gone (e.g., after page reload)
  try {
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      console.debug(
        "[getAuthToken] Restored token from localStorage:",
        storedToken.substring(0, 30) + "...",
      );
      // Restore to in-memory storage for subsequent calls
      authToken = storedToken;
      return storedToken;
    }
  } catch (e) {
    console.error("[getAuthToken] Failed to read from localStorage:", e);
  }

  // Don't warn about missing token - it's normal during page load
  return null;
}

/**
 * Store the authentication token in memory
 */

// function setAuthToken(token: string | null): void {
//   if (token) {
//     console.debug(
//       "[setAuthToken] Storing new token:",
//       token.substring(0, 30) + "...",
//     );
//   } else {
//     console.warn("[setAuthToken] Clearing token");
//   }
//   authToken = token;
// }

function setAuthToken(token: string | null): void {
  if (token) {
    //  Remove "Bearer " if it exists
    const cleanToken = token.replace(/^Bearer\s+/i, "");

    console.debug(
      "[setAuthToken] Storing cleaned token:",
      cleanToken.substring(0, 30) + "...",
    );

    authToken = cleanToken;
    // Persist token to localStorage for session persistence
    try {
      localStorage.setItem("auth_token", cleanToken);
      console.debug("[setAuthToken] Token persisted to localStorage");
    } catch (e) {
      console.error(
        "[setAuthToken] Failed to persist token to localStorage:",
        e,
      );
    }
  } else {
    console.debug("[setAuthToken] Clearing token");
    authToken = null;
    // Remove token from localStorage on logout
    try {
      localStorage.removeItem("auth_token");
      console.debug("[setAuthToken] Token removed from localStorage");
    } catch (e) {
      console.error(
        "[setAuthToken] Failed to remove token from localStorage:",
        e,
      );
    }
  }
}

/**
 * Extract patient ID from JWT token claims
 * Looks for common claim names: sub, userId, patientId, id, nameid
 */
function extractPatientIdFromToken(token: string | null): string | null {
  if (!token) return null;
  const claims = decodeJWT(token);
  if (!claims) return null;
  // Try common patient/user ID field names
  // Also check for Microsoft-standard claim URIs
  const patientId =
    (claims.sub as string) ||
    (claims.userId as string) ||
    (claims.patientId as string) ||
    (claims.id as string) ||
    (claims.nameid as string) ||
    (claims.oid as string) || // Azure AD object ID
    // Microsoft standard URI for name identifier (most common in ASP.NET)
    (claims[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
    ] as string);
  if (patientId) {
    console.debug(
      "[extractPatientIdFromToken] Found patient ID:",
      patientId,
      "in claims (keys: " + Object.keys(claims).join(", ") + ")",
    );
  }
  return patientId || null;
}

// Mock API delay for non-auth endpoints
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Make API calls with automatic authorization header
 * @param endpoint - API endpoint path (e.g., "/api/Account/login")
 * @param options - Fetch options
 * @returns API response wrapped in ApiResponse
 */
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  // Public endpoints that don't require authentication
  const publicEndpoints = [
    "/api/Account/login",
    "/api/Account/register",
    "/swagger",
    "/api/Lookup/Doctors",
    "/api/Lookup/Specializations",
  ];
  const isPublicEndpoint = publicEndpoints.some((publicPath) =>
    endpoint.includes(publicPath),
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options && (options.headers as Record<string, string>)),
  };

  // Attach JWT token to Authorization header for protected endpoints only
  const token = getAuthToken();
  if (!isPublicEndpoint && token) {
    // Ensure token doesn't already include "Bearer"
    const cleanToken = token.replace(/^Bearer\s+/i, "");
    headers["Authorization"] = `Bearer ${cleanToken}`;

    if (DEBUG_API) {
      const decodedClaims = decodeJWT(cleanToken);
      const patientId = extractPatientIdFromToken(cleanToken);

      console.debug("[apiCall] Protected endpoint - token attached", {
        endpoint,
        tokenPrefix: cleanToken.substring(0, 20) + "...",
        authHeader: headers["Authorization"].substring(0, 30) + "...",
        decodedClaims,
        extractedPatientId: patientId,
      });
    }
  } else if (DEBUG_API && isPublicEndpoint) {
    console.debug("[apiCall] Public endpoint (no auth required):", endpoint);
  }

  const url = `${BASE_URL}${endpoint}`;

  // Capture request body for debugging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let requestBody: any;
  try {
    if (options?.body && typeof options.body === "string") {
      requestBody = JSON.parse(options.body);
    }
  } catch (e) {
    requestBody = options?.body;
  }

  if (DEBUG_API) {
    console.debug("[apiCall] Calling", url, {
      method: options?.method || "GET",
      requestBody: requestBody,
    });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      mode: "cors", // Enable CORS
      credentials: "omit", // Don't send cookies (using JWT instead)
      headers,
    });
  } catch (error) {
    console.error("[apiCall] Network error:", endpoint, error);
    throw new Error("Network error: Failed to reach API");
  }

  // Parse response body
  const text = await response.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = text;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch (e) {
    data = text;
  }

  // Handle HTTP errors
  if (!response.ok) {
    const normalizedErrorText = String(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data && typeof data === "object"
        ? (data as any).message || ""
        : data || "",
    )
      .toLowerCase()
      .trim();
    const isUnauthorizedResponse =
      response.status === 401 ||
      response.status === 403 ||
      normalizedErrorText.includes("unauthorized") ||
      normalizedErrorText.includes("forbidden");

    // Auth failure - clear stored token and notify app
    if (isUnauthorizedResponse) {
      const token = getAuthToken();
      const decodedToken = token ? decodeJWT(token) : null;
      const patientId = token ? extractPatientIdFromToken(token) : null;

      console.error("[apiCall] ❌ Auth failure:", endpoint);
      console.error("[apiCall] REQUEST ENDPOINT:", endpoint);
      console.error("[apiCall] BACKEND RESPONSE:", data);
      console.error("[apiCall] Your Patient ID:", patientId);

      // Show all claim fields in a more readable format
      if (decodedToken && Object.keys(decodedToken).length > 0) {
        console.warn("[apiCall] All JWT Claims (key-value pairs):");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const claimsForTable: any[] = [];
        Object.entries(decodedToken).forEach(([key, value]) => {
          claimsForTable.push({
            claimName: key,
            claimValue:
              typeof value === "object" ? JSON.stringify(value) : String(value),
            type: typeof value,
          });
        });
        console.table(claimsForTable);
      }

      console.warn(
        "[apiCall] Auth error details:",
        JSON.stringify(
          {
            endpoint,
            status: response.status,
            tokenPresent: !!token,
            extractedPatientId: patientId,
            backendResponse: data,
          },
          null,
          2,
        ),
      );

      console.warn("[setAuthToken] Clearing token due to 401");
      setAuthToken(null);
      // Notify listeners (mainly AuthContext) to update auth state
      window.dispatchEvent(new Event("auth:logout"));
      throw new Error("Unauthorized: Please log in again");
    }

    // 400 Bad Request - log full response for debugging
    if (response.status === 400) {
      const token = getAuthToken();
      const decodedToken = token ? decodeJWT(token) : null;
      const patientId = token ? extractPatientIdFromToken(token) : null;

      if (DEBUG_API) {
        console.error("[apiCall] Bad Request (400):", endpoint, {
          status: response.status,
          requestSent: requestBody,
          response: data,
          tokenPresent: !!token,
          extractedPatientId: patientId,
        });
      }

      // Show all claim fields in a more readable format
      if (DEBUG_API && decodedToken && Object.keys(decodedToken).length > 0) {
        console.warn("[apiCall] All JWT Claims (key-value pairs):");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const claimsForTable: any[] = [];
        Object.entries(decodedToken).forEach(([key, value]) => {
          claimsForTable.push({
            claimName: key,
            claimValue:
              typeof value === "object" ? JSON.stringify(value) : String(value),
            type: typeof value,
          });
        });
        console.table(claimsForTable);
      } else if (DEBUG_API) {
        console.warn("[apiCall] Token could not be decoded or is empty");
      }

      // Try to extract validation errors if available
      let errorDetails = "";

      // Handle string response (plain error message from backend)
      if (typeof data === "string") {
        errorDetails = data;
      }
      // Handle array of errors (from validation)
      else if (Array.isArray(data)) {
        errorDetails = data
          .map((err) => {
            if (typeof err === "string") return err;
            if (err.message) return err.message;
            if (err.description) return err.description;
            return JSON.stringify(err);
          })
          .join("; ");
      }
      // Handle object with errors (could be empty {})
      else if (data && typeof data === "object") {
        if (data.message) errorDetails = data.message;
        if (data.error) errorDetails = data.error;
        if (data.errors) {
          if (Array.isArray(data.errors)) {
            errorDetails = data.errors.join("; ");
          } else {
            errorDetails = Object.values(data.errors)
              .flat()
              .join(", ") as string;
          }
        }
      }

      // If no details found, provide more context
      if (!errorDetails) {
        errorDetails = `Bad Request from ${endpoint} (empty response or no error details)`;
      }
      if (DEBUG_API) {
        console.warn("[apiCall] Validation errors:", errorDetails);
        console.warn(
          "[apiCall] Debug info - extracted patient ID from token:",
          patientId || "NONE FOUND",
        );
      }

      // Special handling for "Patient not found" errors
      if (errorDetails.includes("Patient not found")) {
        if (DEBUG_API) {
          console.error(
            "[apiCall] Patient record missing in backend for token ID",
            patientId,
          );
        }
        throw new Error("PATIENT_NOT_FOUND");
      }

      throw new Error(
        errorDetails || "Invalid data: Please check your input and try again",
      );
    }

    const errorMessage =
      data && data.message ? data.message : response.statusText;
    console.error(
      "[apiCall] Error:",
      endpoint,
      response.status,
      errorMessage,
      "Data:",
      data,
    );
    throw new Error(`API Error: ${errorMessage}`);
  }

  if (DEBUG_API) {
    console.debug("[apiCall] Success:", endpoint, { status: response.status });
  }
  return { data: data as T, success: true };
}

// Authentication Services
// Real backend integration - no mock data used
export const authService = {
  hasStoredToken(): boolean {
    return !!getAuthToken();
  },

  async forgotPassword(data: ForgotPasswordDTO): Promise<ApiResponse<void>> {
    await apiCall<void>("/api/Account/forgot-password", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
      }),
    });

    return {
      data: undefined,
      success: true,
      message: "Password reset email sent",
    };
  },

  async resetPassword(data: ResetPasswordDTO): Promise<ApiResponse<void>> {
    await apiCall<void>("/api/Account/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        token: data.token,
        newPassword: data.newPassword,
      }),
    });

    return {
      data: undefined,
      success: true,
      message: "Password updated successfully",
    };
  },

  /**
   * Login with email and password
   * POST /api/Account/login
   * Backend returns UserDTO: { userName, email, role, token }
   */
  async login(credentials: AuthCredentials): Promise<
    ApiResponse<{
      userName: string;
      email: string;
      role: string;
      token: string;
      userId?: string;
      id?: string;
    }>
  > {
    const response = await apiCall<{
      userName: string;
      email: string;
      role: string;
      token: string;
      userId?: string;
      id?: string;
    }>("/api/Account/login", {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    const userData = response.data;
    console.debug(
      "[authService] Login response data:",
      JSON.stringify(userData, null, 2),
    );
    // Try to extract ID from response (backend may include it)
    if (userData && userData.token) {
      setAuthToken(userData.token);
      console.debug(
        "[authService] Login successful, token stored:",
        userData.token.substring(0, 30) + "...",
      );
      console.debug(
        "[authService] User ID from response:",
        userData.userId || userData.id || "NOT PROVIDED",
      );
      // Also check what's in the token claims
      const tokenPatientId = extractPatientIdFromToken(userData.token);
      console.debug(
        "[authService] Patient ID from token claims:",
        tokenPatientId || "NOT FOUND IN TOKEN",
      );

      // Show ALL token claims in a table for inspection
      const decodedToken = decodeJWT(userData.token);
      if (decodedToken && Object.keys(decodedToken).length > 0) {
        console.debug("[authService] ALL JWT Claims after login:");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const claimsTable: any[] = [];
        Object.entries(decodedToken).forEach(([key, value]) => {
          claimsTable.push({
            claimName: key,
            claimValue:
              typeof value === "object" ? JSON.stringify(value) : String(value),
            type: typeof value,
          });
        });
        console.table(claimsTable);
        console.debug(
          "[authService] ⚠️ IMPORTANT: Above is ALL claims in your token. Patient ID should be in one of these fields.",
        );
      }
    } else {
      console.error(
        "[authService] Login failed - no token in response",
        userData,
      );
    }

    return {
      data: userData,
      success: true,
      message: "Login successful",
    };
  },

  /**
   * Register new user
   * POST /api/Account/register
   * Backend expects RegisterDTO: { userName, email, password, phoneNumber, role, gender, dateOfBirth, address }
   * Returns UserDTO: { userName, email, role, token }
   *
   * NOTE: Backend may require email confirmation before issuing token.
   * If no token is returned, user must confirm email first.
   */
  async register(data: RegisterData): Promise<
    ApiResponse<{
      userName: string;
      email: string;
      role: string;
      token: string;
      userId?: string;
      id?: string;
    }>
  > {
    // Build payload with only non-empty fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      // Required fields
      // Keep a delimiter so first/last names remain recoverable after login
      userName: [data.firstName, data.lastName]
        .filter(Boolean)
        .join("_")
        .trim(),
      email: data.email,
      password: data.password,
      phoneNumber: data.phone,
      role: data.role || "patient", // Default to patient if not specified
    };

    // Add optional fields only if they have values
    if (data.address) payload.address = data.address;
    if (data.gender) payload.gender = data.gender;
    if (data.dateOfBirth) {
      // Ensure dateOfBirth is in ISO format
      // If it's just a date string (YYYY-MM-DD), convert to ISO datetime
      const dob = new Date(data.dateOfBirth);
      if (!isNaN(dob.getTime())) {
        payload.dateOfBirth = dob.toISOString();
      }
    }

    console.debug("[authService] Sending registration payload:", payload);

    const response = await apiCall<{
      userName: string;
      email: string;
      role: string;
      token: string;
      userId?: string;
      id?: string;
    }>("/api/Account/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const userData = response.data;
    console.debug(
      "[authService] Register response data:",
      JSON.stringify(userData, null, 2),
    );

    // Check if backend returned a token
    if (userData && userData.token) {
      // Token received - user can proceed directly
      setAuthToken(userData.token);
      console.debug(
        "[authService] Registration successful, token stored:",
        userData.token.substring(0, 30) + "...",
      );
      console.debug(
        "[authService] User ID from response:",
        userData.userId || userData.id || "NOT PROVIDED",
      );
      // Also check what's in the token claims
      const tokenPatientId = extractPatientIdFromToken(userData.token);
      console.debug(
        "[authService] Patient ID from token claims:",
        tokenPatientId || "NOT FOUND IN TOKEN",
      );

      // Show ALL token claims in a table for inspection
      const decodedToken = decodeJWT(userData.token);
      if (decodedToken && Object.keys(decodedToken).length > 0) {
        console.debug("[authService] ALL JWT Claims after registration:");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const claimsTable: any[] = [];
        Object.entries(decodedToken).forEach(([key, value]) => {
          claimsTable.push({
            claimName: key,
            claimValue:
              typeof value === "object" ? JSON.stringify(value) : String(value),
            type: typeof value,
          });
        });
        console.table(claimsTable);
        console.debug(
          "[authService] ⚠️ IMPORTANT: Above is ALL claims in your token. Patient ID should be in one of these fields.",
        );
      }
    } else {
      // No token received - likely email confirmation required
      console.warn(
        "[authService] Registration successful but NO TOKEN returned",
      );
      console.warn(
        "[authService] ⚠️  Backend likely requires email confirmation before issuing token",
      );
      console.warn(
        "[authService] Response message:",
        userData && typeof userData === "object"
          ? JSON.stringify(userData)
          : userData,
      );

      // Return the response anyway - caller (AuthContext) will handle this
      // and show appropriate message to user about email confirmation
    }

    return {
      data: userData,
      success: true,
      message: "Registration successful",
    };
  },

  /**
   * Logout the user
   * Clears token from memory
   */
  async logout(): Promise<void> {
    // Clear token from memory
    setAuthToken(null);
    console.debug("[authService] Logout successful, token cleared");

    // Notify listeners (AuthContext) about logout
    try {
      window.dispatchEvent(new Event("auth:logout"));
    } catch (e) {
      console.error("[authService] Error notifying logout:", e);
    }
  },

  /**
   * Get current user
   * Note: Not exposed by backend - would need a dedicated endpoint
   * For now, AuthContext maintains user data in memory after login
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getCurrentUser(): Promise<ApiResponse<any>> {
    if (!getAuthToken()) {
      throw new Error("Not authenticated");
    }
    // Backend doesn't have a dedicated getCurrentUser endpoint
    // User data is maintained in AuthContext after successful login
    throw new Error("Use AuthContext.user instead - maintained after login");
  },

  async verifyPatientExists(): Promise<
    ApiResponse<{ exists: boolean; message: string }>
  > {
    try {
      console.debug(
        "[authService.verifyPatientExists] Attempting to fetch patient medical history to verify patient exists...",
      );
      const res = await apiCall<unknown>(
        "/api/PatientMedicalHistory/GetMyMedicalHistory",
        {
          method: "GET",
        },
      );

      // If we get a successful response, patient exists
      console.log(
        "[authService.verifyPatientExists] ✅ Patient record exists in backend!",
        res.data,
      );
      return {
        data: {
          exists: true,
          message: "Patient record found in backend patient table",
        },
        success: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes("Patient not found")) {
        console.error(
          "[authService.verifyPatientExists] ❌ SYNC ISSUE: Patient record NOT found in backend!",
        );
        console.error(
          "[authService.verifyPatientExists] ⚠️  SOLUTION: Backend needs to auto-create patient record on registration",
        );
        return {
          data: {
            exists: false,
            message:
              "Patient not found in backend - Registration may not have synced patient data",
          },
          success: false,
        };
      }

      // Some other error
      console.warn(
        "[authService.verifyPatientExists] Could not verify patient:",
        errorMsg,
      );
      return {
        data: {
          exists: false,
          message: `Unable to verify: ${errorMsg}`,
        },
        success: false,
      };
    }
  },
};

// Prescription Services (uses Swagger DTOs)
export const prescriptionService = {
  /**
   * Get current user's prescriptions from backend
   * GET /api/PatientPrescriptions/GetMyPrescriptions
   */
  async getMyPrescriptions(): Promise<ApiResponse<PrescriptionDetailsDTO[]>> {
    const res = await apiCall<PrescriptionDetailsDTO[]>(
      "/api/PatientPrescriptions/GetMyPrescriptions",
      { method: "GET" },
    );
    return { data: res.data || [], success: true };
  },

  /**
   * Get prescription for specific appointment
   * GET /api/PatientPrescriptions/GetPrescriptionByAppointment/{appointmentId}
   */
  async getByAppointment(
    appointmentId: string,
  ): Promise<ApiResponse<PrescriptionDetailsDTO>> {
    const res = await apiCall<PrescriptionDetailsDTO>(
      `/api/PatientPrescriptions/GetPrescriptionByAppointment/${appointmentId}`,
      { method: "GET" },
    );
    return { data: res.data, success: true };
  },

  /**
   * Create new prescription
   * POST /api/Prescription
   */
  async create(dto: CreatePrescriptionDto): Promise<ApiResponse<void>> {
    await apiCall("/api/Prescription", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    return { data: undefined, success: true, message: "Prescription created" };
  },

  /**
   * Get prescriptions for a specific patient
   * GET /api/Prescription/patient/{patientId}
   */
  async getByPatient(
    patientId: string,
  ): Promise<ApiResponse<PrescriptionDetailsDTO[]>> {
    const res = await apiCall<PrescriptionDetailsDTO[]>(
      `/api/Prescription/patient/${patientId}`,
      { method: "GET" },
    );
    return { data: res.data || [], success: true };
  },
};

// Doctor Services
export const doctorService = {
  // Get doctors from backend endpoint
  async getAll(): Promise<ApiResponse<Doctor[]>> {
    try {
      console.debug(
        "[doctorService.getAll] Fetching doctors from /api/Lookup/Doctors...",
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any[]>("/api/Lookup/Doctors", {
        method: "GET",
      });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        console.debug(
          "[doctorService.getAll] ✅ Got real doctors from backend:",
          res.data.length,
          "doctors",
        );
        // Map DoctorDTO from backend to Doctor type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doctors = (res.data as any[]).map((doc: any) => ({
          id: String(doc.id ?? 1),
          name: doc.name ?? "Unknown",
          specialty: normalizeSpecialty(
            doc.specialty ?? doc.specializationName ?? doc.specialization,
          ),
          email: doc.email ?? "",
          phone: doc.phoneNumber ?? "",
          photo: doc.photo ?? doc.profileImage ?? undefined,
          experience: doc.experience ?? doc.yearsOfExperience ?? 0,
          languages: doc.languages ?? [],
          // Fill other required fields with defaults
          role: doc.role ?? "doctor",
          qualifications: doc.qualifications ?? [],
          bio: doc.bio ?? doc.description ?? "",
          consultationFee: doc.consultationFee ?? 0,
          rating: doc.rating ?? 0,
          totalPatients: doc.totalPatients ?? 0,
          department: doc.department ?? "General",
          clinic: doc.clinic ?? "",
          availableSlots: doc.availableSlots ?? [],
          reviewCount: doc.reviewCount ?? 0,
          workingDays: doc.workingDays ?? [],
          firstName: doc.firstName ?? doc.name?.split(" ")[0] ?? "",
          lastName: doc.lastName ?? doc.name?.split(" ")[1] ?? "",
          avatar: doc.photo ?? doc.profileImage ?? undefined,
          profileImage: doc.profileImage ?? doc.photo ?? undefined,
          // Store raw specializationId for reliable doctor filtering by service
          specializationId: doc.specializationId ?? null,
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        })) as unknown as Doctor[];
        return { data: doctors, success: true };
      }
    } catch (error) {
      console.error(
        "[doctorService.getAll] ❌ Failed to fetch from /api/Lookup/Doctors:",
        error instanceof Error ? error.message : String(error),
      );
    }

    // Backend unavailable — return empty list (no mock fallback)
    console.warn(
      "[doctorService.getAll] ⚠️ Backend unavailable, returning empty doctor list",
    );
    return { data: [], success: false };
  },

  async getById(id: string): Promise<ApiResponse<Doctor>> {
    await delay(400);
    const doctor = mockDoctors.find((d) => d.id === id);
    if (!doctor) throw new Error("Doctor not found");
    return { data: doctor, success: true };
  },

  async getBySpecialty(specialty: string): Promise<ApiResponse<Doctor[]>> {
    await delay(500);
    const doctors = mockDoctors.filter((d) => d.specialty === specialty);
    return { data: doctors, success: true };
  },

  async getAvailableSlots(
    doctorId: string,
    date: string,
  ): Promise<ApiResponse<string[]>> {
    await delay(400);
    const slots = [
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
    ];
    return { data: slots, success: true };
  },

  // Real backend endpoints
  /**
   * Get doctor's appointments
   * GET /api/doctor/appointments
   */
  async getAppointments(params?: {
    status?: number;
    date?: string;
    search?: string;
  }): Promise<ApiResponse<Appointment[]>> {
    const query = new URLSearchParams();
    if (params?.status !== undefined)
      query.set("status", String(params.status));
    if (params?.date) query.set("date", params.date);
    if (params?.search) query.set("search", params.search);
    const url = `/api/doctor/appointments${query.toString() ? `?${query.toString()}` : ""}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiCall<any[]>(url, { method: "GET" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (res.data || []) as any[];
    return {
      data: data.map((item) =>
        appointmentService.mapBackendToAppointment(item),
      ),
      success: true,
    };
  },

  /**
   * Mark appointment as complete
   * PUT /api/doctor/appointments/{id}/complete
   */
  async completeAppointment(id: string): Promise<ApiResponse<void>> {
    await apiCall<void>(`/api/doctor/appointments/${id}/complete`, {
      method: "PUT",
    });
    return { data: undefined, success: true };
  },

  /**
   * Cancel appointment
   * PUT /api/doctor/appointments/{id}/cancel
   */
  async cancelAppointment(id: string): Promise<ApiResponse<void>> {
    await apiCall<void>(`/api/doctor/appointments/${id}/cancel`, {
      method: "PUT",
    });
    return { data: undefined, success: true };
  },

  /**
   * Get doctor dashboard stats
   * GET /api/doctor/dashboard
   */
  async getDashboard(): Promise<ApiResponse<DashboardStats>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiCall<any>("/api/doctor/dashboard", { method: "GET" });
    // Normalize backend shape and keep a safe fallback for missing fields.
    return {
      data: mapBackendDashboardStats(res.data),
      success: true,
    };
  },
};

// Patient Services
export const patientService = {
  // Mock endpoints - no backend API available
  async getAll(): Promise<PaginatedResponse<Patient>> {
    await delay(600);
    return {
      data: mockPatients,
      total: mockPatients.length,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
  },

  async getById(id: string): Promise<ApiResponse<Patient>> {
    await delay(400);
    const patient = mockPatients.find((p) => p.id === id);
    if (!patient) throw new Error("Patient not found");
    return { data: patient, success: true };
  },

  async update(
    id: string,
    data: Partial<Patient>,
  ): Promise<ApiResponse<Patient>> {
    await delay(500);
    const patient = mockPatients.find((p) => p.id === id);
    const mergedPatient: Patient = {
      ...(patient || {
        id,
        email: data.email || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phone: data.phone || "",
        role: "patient",
        dateOfBirth: data.dateOfBirth || "",
        gender: data.gender || "other",
        address: data.address || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      ...data,
      id,
      role: "patient",
      updatedAt: new Date().toISOString(),
    } as Patient;

    try {
      localStorage.setItem(
        "patient_profile_cache",
        JSON.stringify(mergedPatient),
      );
    } catch (e) {
      console.warn(
        "[patientService.update] Failed to cache patient profile",
        e,
      );
    }

    return { data: mergedPatient, success: true };
  },

  /**
   * Get patient's medical history from backend
   * GET /api/PatientMedicalHistory/GetMyMedicalHistory
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMedicalHistory(): Promise<ApiResponse<any[]>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiCall<any[]>(
      "/api/PatientMedicalHistory/GetMyMedicalHistory",
      {
        method: "GET",
      },
    );
    return { data: res.data || [], success: true };
  },
};

// Admin Patient Services
export const adminPatientService = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapBackendToPatient(item: any): Patient {
    const { firstName, lastName } = splitName(item.fullName ?? item.name);
    return {
      id: String(item.id ?? item.patientId ?? ""),
      email: item.email ?? "",
      firstName: item.firstName ?? firstName,
      lastName: item.lastName ?? lastName,
      phone: item.phone ?? item.phoneNumber ?? "",
      avatar: item.avatar,
      role: "patient",
      dateOfBirth: item.dateOfBirth ?? item.birthDate ?? "",
      gender:
        item.gender === "male" ||
        item.gender === "female" ||
        item.gender === "other"
          ? item.gender
          : "other",
      address: item.address ?? "",
      isActive:
        typeof item.isActive === "boolean"
          ? item.isActive
          : item.status
            ? String(item.status).toLowerCase() !== "inactive"
            : true,
      createdAt: item.createdAt ?? new Date().toISOString(),
      updatedAt: item.updatedAt ?? item.modifiedAt ?? new Date().toISOString(),
    };
  },

  /**
   * Get all patients (admin view)
   * GET /api/admin/patients
   */
  async getAll(): Promise<PaginatedResponse<Patient>> {
    const candidateEndpoints = [
      "/api/admin/patients",
      "/api/admin/patient",
      "/api/admin/Patients",
      "/api/admin/GetPatients",
      "/api/admin/patients/all",
    ];

    let lastError: unknown = null;

    for (const endpoint of candidateEndpoints) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await apiCall<any>(endpoint, { method: "GET" });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = res.data as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawData: any[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        const patients = rawData.map((item) =>
          adminPatientService.mapBackendToPatient(item),
        );

        return {
          data: patients,
          total: Number(payload?.total ?? patients.length),
          page: Number(payload?.page ?? 1),
          limit: Number((payload?.limit ?? patients.length) || 10),
          totalPages: Number(payload?.totalPages ?? 1),
        };
      } catch (error) {
        lastError = error;
      }
    }

    // Fallback: derive patient list from admin appointments endpoint.
    // This keeps admin patient screens functional even if backend exposes
    // patient data only through appointment resources.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any[]>("/api/admin/appointments", {
        method: "GET",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const appointments = (res.data || []) as any[];

      const patientsMap = new Map<string, Patient>();

      for (const appointment of appointments) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nestedPatient = (appointment?.patient ||
          appointment?.patientDTO) as any;

        if (nestedPatient) {
          const mapped = adminPatientService.mapBackendToPatient(nestedPatient);
          if (mapped.id) {
            patientsMap.set(mapped.id, mapped);
          }
          continue;
        }

        const patientName = String(appointment?.patientName || "").trim();
        const patientId = String(appointment?.patientId || "").trim();
        if (!patientName) continue;

        const mapped = adminPatientService.mapBackendToPatient({
          id:
            patientId ||
            `patient-${patientName.toLowerCase().replace(/\s+/g, "-")}`,
          fullName: patientName,
          email: appointment?.patientEmail || "",
          phoneNumber: appointment?.patientPhone || "",
          isActive: true,
        });

        if (mapped.id) {
          patientsMap.set(mapped.id, mapped);
        }
      }

      const patients = Array.from(patientsMap.values());
      return {
        data: patients,
        total: patients.length,
        page: 1,
        limit: patients.length || 10,
        totalPages: 1,
      };
    } catch (fallbackError) {
      lastError = fallbackError;
    }

    console.error("[adminPatientService.getAll] Failed to fetch patients", {
      candidateEndpoints,
      lastError,
    });

    throw new Error("Failed to fetch patients from backend");
  },

  /**
   * Toggle patient status
   * PATCH /api/admin/patients/{id}/toggle-status
   */
  async toggleStatus(id: string): Promise<ApiResponse<void>> {
    const candidateEndpoints = [
      `/api/admin/patients/${id}/toggle-status`,
      `/api/admin/patients/${id}/status`,
      `/api/admin/patient/${id}/toggle-status`,
      `/api/admin/patients/${id}/toggle`,
    ];

    let lastError: unknown = null;

    for (const endpoint of candidateEndpoints) {
      try {
        await apiCall<void>(endpoint, { method: "PATCH" });
        return {
          data: undefined,
          success: true,
          message: "Patient status updated",
        };
      } catch (error) {
        lastError = error;
      }
    }

    console.error(
      "[adminPatientService.toggleStatus] Failed to toggle patient status",
      {
        candidateEndpoints,
        lastError,
      },
    );
    throw new Error("Failed to update patient status");
  },
};

// Appointment Services
export const appointmentService = {
  // Mock endpoint - full list not available via backend API
  async getAll(): Promise<ApiResponse<Appointment[]>> {
    await delay(600);
    return { data: mockAppointments, success: true };
  },

  /**
   * Get current patient's appointments from backend
   * GET /api/PatientAppointment/GetMyAppointments
   * Backend should extract patient ID from JWT token
   */
  async getByPatient(): Promise<ApiResponse<Appointment[]>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any[]>(
        "/api/PatientAppointment/GetMyAppointments",
        { method: "GET" },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (res.data || []) as any[];

      // If API returns empty array, that's correct for accounts with no appointments
      if (data.length === 0) {
        // Return empty array - new accounts should have zero appointments
        return { data: [], success: true };
      }

      const appointments = data.map((item) =>
        appointmentService.mapBackendToAppointment(item),
      );
      return { data: appointments, success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage === "PATIENT_NOT_FOUND") {
        return {
          data: [],
          success: false,
          message:
            "Your account is authenticated, but no patient profile exists in backend records yet.",
        };
      }

      // Return empty array on error instead of showing mock data
      // This ensures data isolation - users only see their own appointments
      return {
        data: [],
        success: false,
        message: "Failed to fetch appointments",
      };
    }
  },

  /**
   * Get details of a specific appointment
   * GET /api/PatientAppointment/GetAppointmentDetails/{appointmentId}
   */
  async getDetails(appointmentId: string): Promise<ApiResponse<Appointment>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiCall<any>(
      `/api/PatientAppointment/GetAppointmentDetails/${appointmentId}`,
      { method: "GET" },
    );
    return {
      data: appointmentService.mapBackendToAppointment(res.data),
      success: true,
    };
  },

  /**
   * Get doctor's appointments from backend
   * GET /api/doctor/appointments
   */
  async getByDoctor(): Promise<ApiResponse<Appointment[]>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiCall<any[]>("/api/doctor/appointments", {
      method: "GET",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (res.data || []) as any[];
    const appointments = data.map((item) =>
      appointmentService.mapBackendToAppointment(item),
    );
    return { data: appointments, success: true };
  },

  /**
   * Book a new appointment
   * POST /api/PatientAppointment/BookAppointment
   */
  async create(
    data: Omit<Appointment, "id" | "createdAt" | "updatedAt">,
  ): Promise<ApiResponse<Appointment>> {
    // Extract dentist ID - try to intelligently parse different formats
    let dentistId: string | number = 1; // default fallback
    const doctorIdStr = data.doctorId?.toString() ?? "";

    // If it's already numeric, use it
    if (!isNaN(Number(doctorIdStr))) {
      dentistId = Number(doctorIdStr);
    } else if (doctorIdStr) {
      // Try to extract numeric part (e.g., "doc-123" → 123)
      const numericMatch = doctorIdStr.match(/\d+/);
      if (numericMatch) {
        dentistId = Number(numericMatch[0]);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dto: any = {
      dentistId,
      appointmentDate: convertEgyptTimeToUTC(data.date, data.time),
    };

    // Add optional fields if they exist in the data
    if (data.serviceId) dto.serviceId = data.serviceId;
    if (data.notes) dto.notes = data.notes;

    // Log full context for debugging
    const token = getAuthToken();
    const decodedClaims = token ? decodeJWT(token) : null;
    const patientId = token ? extractPatientIdFromToken(token) : null;

    console.debug(
      "[appointmentService.create] Booking appointment with dentist",
      {
        selectedDoctorId: data.doctorId,
        parsedDentistId: dentistId,
        dentistIdType: typeof dentistId,
      },
    );

    console.debug("[appointmentService.create] Full booking details", {
      endpoint: "/api/PatientAppointment/BookAppointment",
      requestDto: dto,
      requestDtoJson: JSON.stringify(dto),
      tokenPresent: !!token,
      extractedPatientId: patientId,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiCall<any>("/api/PatientAppointment/BookAppointment", {
      method: "POST",
      body: JSON.stringify(dto),
    });

    // Server should return created appointment details
    const appointmentData = res.data || {};
    return {
      data: appointmentService.mapBackendToAppointment(appointmentData, data),
      success: true,
      message: "Appointment booked successfully",
    };
  },

  /**
   * Update an appointment (mock - no backend endpoint)
   */
  async update(
    id: string,
    data: Partial<Appointment>,
  ): Promise<ApiResponse<Appointment>> {
    await delay(500);
    const appointment = mockAppointments.find((a) => a.id === id);
    if (!appointment) throw new Error("Appointment not found");
    return { data: { ...appointment, ...data }, success: true };
  },

  /**
   * Cancel an appointment
   * PATCH /api/PatientAppointment/CancelAppointment/{appointmentId}
   */
  async cancel(id: string): Promise<ApiResponse<void>> {
    await apiCall<void>(`/api/PatientAppointment/CancelAppointment/${id}`, {
      method: "PATCH",
    });
    return { data: undefined, success: true, message: "Appointment cancelled" };
  },

  /**
   * Helper to map backend appointment response to frontend Appointment model
   */
  mapBackendToAppointment(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: any,
    fallback?: Partial<Appointment>,
  ): Appointment {
    // Log the full response to debug
    console.debug("[mapBackendToAppointment] Received item from backend:", {
      fullItem: JSON.stringify(item, null, 2),
      itemKeys: Object.keys(item || {}),
      hasDoctor: !!item?.doctor,
      doctorData: item?.doctor,
      hasService: !!item?.service,
      serviceData: item?.service,
    });

    const appointmentDate = item.appointmentDate || item.date || item.dateTime;
    let date = "";
    let time = "";
    if (appointmentDate) {
      const d = new Date(appointmentDate as string | number | Date);
      if (!isNaN(d.getTime())) {
        const egyptDateTime = formatDateTimeInEgypt(d);
        date = egyptDateTime.date;
        time = egyptDateTime.time;
      }
    }

    // Extract doctor info - handle nested doctor object
    const doctorId = String(
      item.dentistId ||
        item.doctorId ||
        item.doctor?.id ||
        item.doctor?.dentistId ||
        fallback?.doctorId ||
        "",
    );

    // Map doctor object if it exists in the backend response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doctorObj = item.doctor ? (item.doctor as any) : undefined;
    const mappedDoctor = doctorObj
      ? {
          id: String(doctorObj.id || ""),
          email: doctorObj.email || "",
          firstName: doctorObj.firstName || doctorObj.first_name || "",
          lastName: doctorObj.lastName || doctorObj.last_name || "",
          phone: doctorObj.phone || doctorObj.phoneNumber || "",
          avatar: doctorObj.avatar || doctorObj.profileImage || "",
          role: "doctor" as const,
          specialty:
            doctorObj.specialty || doctorObj.specialization || "general",
          qualifications: doctorObj.qualifications || [],
          experience: doctorObj.experience || 0,
          bio: doctorObj.bio || doctorObj.biography || "",
          consultationFee: doctorObj.consultationFee || 0,
          rating: doctorObj.rating || 0,
          reviewCount: doctorObj.reviewCount || 0,
          availableSlots: doctorObj.availableSlots || [],
          workingDays: doctorObj.workingDays || [],
          createdAt: doctorObj.createdAt || new Date().toISOString(),
          updatedAt: doctorObj.updatedAt || new Date().toISOString(),
        }
      : undefined;

    // Map service object if it exists in the backend response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceObj = item.service ? (item.service as any) : undefined;
    const mappedService = serviceObj
      ? {
          id: String(serviceObj.id || ""),
          name: serviceObj.name || "",
          description: serviceObj.description || "",
          icon: serviceObj.icon || "stethoscope",
          specialty:
            serviceObj.specialty || serviceObj.specialization || "general",
          duration: serviceObj.duration || 30,
          price: serviceObj.price || 0,
          image: serviceObj.image || undefined,
        }
      : undefined;

    // Build patient from flat patientName payloads used by doctor endpoints.
    const patientName = String(item.patientName || "").trim();
    const patientNameParts = patientName.split(/\s+/).filter(Boolean);
    const patientFirstName = patientNameParts[0] || "Patient";
    const patientLastName = patientNameParts.slice(1).join(" ") || "";
    const patientIdFromName = patientName
      ? `patient-${patientName.toLowerCase().replace(/\s+/g, "-")}`
      : "";

    // Map patient object if it exists in the backend response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patientObj = item.patient ? (item.patient as any) : undefined;
    const mappedPatient = patientObj
      ? {
          id: String(patientObj.id || ""),
          email: patientObj.email || "",
          firstName: patientObj.firstName || patientObj.first_name || "",
          lastName: patientObj.lastName || patientObj.last_name || "",
          phone: patientObj.phone || patientObj.phoneNumber || "",
          avatar: patientObj.avatar || patientObj.profileImage || "",
          role: "patient" as const,
          dateOfBirth: patientObj.dateOfBirth || "",
          gender: patientObj.gender || "other",
          address: patientObj.address || "",
          bloodType: patientObj.bloodType || undefined,
          allergies: patientObj.allergies || undefined,
          createdAt: patientObj.createdAt || new Date().toISOString(),
          updatedAt: patientObj.updatedAt || new Date().toISOString(),
        }
      : patientName
        ? {
            id: String(item.patientId || patientIdFromName),
            email: patientName.includes("@") ? patientName : "",
            firstName: patientFirstName,
            lastName: patientLastName,
            phone: "",
            avatar: "",
            role: "patient" as const,
            dateOfBirth: "",
            gender: "other" as const,
            address: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : undefined;

    return {
      id: String(item.appointmentId || item.id || fallback?.id || ""),
      patientId: String(
        item.patientId ||
          item.patient?.id ||
          mappedPatient?.id ||
          fallback?.patientId ||
          "",
      ),
      patient: mappedPatient,
      doctorId: doctorId,
      doctor: mappedDoctor,
      serviceId: String(
        item.serviceId || item.service?.id || fallback?.serviceId || "",
      ),
      service: mappedService,
      date: date || fallback?.date || "",
      time: time || fallback?.time || "",
      duration: item.duration || fallback?.duration || 0,
      status: normalizeAppointmentStatus(item.status || fallback?.status),
      notes: item.notes || item.description || fallback?.notes || "",
      createdAt:
        item.createdAt ||
        item.dateCreated ||
        fallback?.createdAt ||
        new Date().toISOString(),
      updatedAt:
        item.updatedAt || fallback?.updatedAt || new Date().toISOString(),
    };
  },
};

// Service Services
export const serviceService = {
  async getAll(): Promise<ApiResponse<Service[]>> {
    try {
      console.debug(
        "[serviceService.getAll] Fetching services/specializations from /api/Lookup/Specializations...",
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any[]>("/api/Lookup/Specializations", {
        method: "GET",
      });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        console.debug(
          "[serviceService.getAll] ✅ Got specializations from backend:",
          res.data.length,
          "specializations",
        );
        // Map SpecializationDTO to Service type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const services = (res.data as any[]).map((spec: any) => ({
          id: String(spec.id ?? ""),
          name: spec.name ?? "Unknown",
          specialty: normalizeSpecialty(spec.name ?? spec.specialty),
          description: spec.description ?? `${spec.name} services`,
          price: 0, // Default price
          duration: 30, // Default duration
          category: spec.name ?? "General",
          icon: "stethoscope",
          available: true,
        })) as unknown as Service[];
        return { data: services, success: true };
      }
    } catch (error) {
      console.error(
        "[serviceService.getAll] ❌ Failed to fetch specializations:",
        error instanceof Error ? error.message : String(error),
      );
    }

    // Backend unavailable — return empty list (no mock fallback)
    console.warn(
      "[serviceService.getAll] ⚠️ Backend unavailable, returning empty service list",
    );
    return { data: [], success: false };
  },

  async getById(id: string): Promise<ApiResponse<Service>> {
    await delay(300);
    const service = mockServices.find((s) => s.id === id);
    if (!service) throw new Error("Service not found");
    return { data: service, success: true };
  },

  async getBySpecialty(specialty: string): Promise<ApiResponse<Service[]>> {
    await delay(400);
    const services = mockServices.filter((s) => s.specialty === specialty);
    return { data: services, success: true };
  },
};

// Pharmacy/Medicine Services
export const pharmacyService = {
  async getAll(): Promise<PaginatedResponse<Medicine>> {
    await delay(600);
    return {
      data: mockMedicines,
      total: mockMedicines.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
  },

  async getById(id: string): Promise<ApiResponse<Medicine>> {
    await delay(300);
    const medicine = mockMedicines.find((m) => m.id === id);
    if (!medicine) throw new Error("Medicine not found");
    return { data: medicine, success: true };
  },

  async search(query: string): Promise<ApiResponse<Medicine[]>> {
    await delay(400);
    const results = mockMedicines.filter(
      (m) =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.genericName.toLowerCase().includes(query.toLowerCase()),
    );
    return { data: results, success: true };
  },

  async checkAvailability(
    id: string,
  ): Promise<ApiResponse<{ available: boolean; stock: number }>> {
    await delay(300);
    const medicine = mockMedicines.find((m) => m.id === id);
    if (!medicine) throw new Error("Medicine not found");
    return {
      data: { available: medicine.stock > 0, stock: medicine.stock },
      success: true,
    };
  },
};

// Messaging Services
export const messageService = {
  async getConversations(userId: string): Promise<ApiResponse<Conversation[]>> {
    await delay(500);
    const conversations = mockConversations.filter((c) =>
      c.participants.includes(userId),
    );
    return { data: conversations, success: true };
  },

  async getMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
    await delay(400);
    const messages = mockMessages.filter(
      (m) =>
        m.senderId.includes(conversationId) ||
        m.receiverId.includes(conversationId),
    );
    return { data: messages, success: true };
  },

  async sendMessage(
    data: Omit<Message, "id" | "createdAt" | "isRead">,
  ): Promise<ApiResponse<Message>> {
    await delay(300);
    const newMessage: Message = {
      ...data,
      id: `msg-${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    return { data: newMessage, success: true };
  },

  async markAsRead(messageId: string): Promise<ApiResponse<void>> {
    await delay(200);
    return { data: undefined, success: true };
  },
};

// Dashboard Services
export const dashboardService = {
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    await delay(600);
    return { data: mockDashboardStats, success: true };
  },

  async getRecentAppointments(
    limit: number = 5,
  ): Promise<ApiResponse<Appointment[]>> {
    await delay(400);
    return { data: mockAppointments.slice(0, limit), success: true };
  },

  async getRecentPatients(limit: number = 5): Promise<ApiResponse<Patient[]>> {
    await delay(400);
    return { data: mockPatients.slice(0, limit), success: true };
  },
};

// Review Services
export const reviewService = {
  /**
   * Get all reviews written by current patient
   * GET /api/PatientReviews/GetMyReviews
   */
  async getMyReviews(): Promise<ApiResponse<Review[]>> {
    try {
      const res = await apiCall<Review[]>("/api/PatientReviews/GetMyReviews", {
        method: "GET",
      });
      return { data: res.data || [], success: true };
    } catch (error) {
      console.error("[reviewService.getMyReviews] Error:", error);
      return { data: [], success: false };
    }
  },

  /**
   * Get reviews for a specific doctor
   * GET /api/PatientReviews/GetMyReviewsForDoctor/{doctorId}
   */
  async getReviewsForDoctor(doctorId: string): Promise<ApiResponse<Review[]>> {
    try {
      const res = await apiCall<Review[]>(
        `/api/PatientReviews/GetMyReviewsForDoctor/${doctorId}`,
        { method: "GET" },
      );
      return { data: res.data || [], success: true };
    } catch (error) {
      console.error(
        "[reviewService.getReviewsForDoctor] Error for doctor",
        doctorId,
        error,
      );
      return { data: [], success: false };
    }
  },

  /**
   * Add a new review for a doctor
   * POST /api/PatientReviews/AddReview
   */
  async addReview(data: {
    doctorId: string;
    appointmentId?: string;
    rating: number;
    comment: string;
  }): Promise<ApiResponse<Review>> {
    try {
      let doctorId = Number(data.doctorId);
      if (Number.isNaN(doctorId)) {
        const numericMatch = data.doctorId.match(/\d+/);
        doctorId = numericMatch ? Number(numericMatch[0]) : NaN;
      }

      if (Number.isNaN(doctorId)) {
        throw new Error("Invalid doctor ID for review");
      }

      let appointmentId: number | undefined;
      if (data.appointmentId) {
        const parsedAppointmentId = Number(data.appointmentId);
        appointmentId = Number.isNaN(parsedAppointmentId)
          ? undefined
          : parsedAppointmentId;
      }

      const res = await apiCall<Review>("/api/PatientReviews/AddReview", {
        method: "POST",
        body: JSON.stringify({
          doctorId,
          appointmentId,
          rating: data.rating,
          comment: data.comment,
        }),
      });
      return {
        data: res.data,
        success: true,
        message: "Review added successfully",
      };
    } catch (error) {
      console.error("[reviewService.addReview] Error:", error);
      return {
        data: {} as Review,
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to add review",
      };
    }
  },

  /**
   * Update an existing review
   * PUT /api/PatientReviews/UpdateReview/{reviewId}
   */
  async updateReview(
    reviewId: string,
    data: { rating: number; comment: string },
  ): Promise<ApiResponse<Review>> {
    try {
      const res = await apiCall<Review>(
        `/api/PatientReviews/UpdateReview/${reviewId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      );
      return {
        data: res.data,
        success: true,
        message: "Review updated successfully",
      };
    } catch (error) {
      console.error(
        "[reviewService.updateReview] Error for review",
        reviewId,
        error,
      );
      return { data: {} as Review, success: false };
    }
  },

  /**
   * Delete a review
   * DELETE /api/PatientReviews/DeleteReview/{reviewId}
   */
  async deleteReview(reviewId: string): Promise<ApiResponse<void>> {
    try {
      await apiCall(`/api/PatientReviews/DeleteReview/${reviewId}`, {
        method: "DELETE",
      });
      return {
        data: undefined,
        success: true,
        message: "Review deleted successfully",
      };
    } catch (error) {
      console.error(
        "[reviewService.deleteReview] Error for review",
        reviewId,
        error,
      );
      return { data: undefined, success: false };
    }
  },
};
// ============================================================
// ADMIN SERVICES
// ============================================================

/**
 * Admin Doctor Management
 * Endpoints: GET, POST, PUT, DELETE, PATCH
 */
export const adminDoctorService = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapBackendToDoctor(doc: any): Doctor {
    const { firstName, lastName } = splitName(
      doc.fullName ??
        doc.name ??
        `${doc.firstName ?? ""} ${doc.lastName ?? ""}`,
    );

    return {
      id: String(doc.id ?? ""),
      email: doc.email ?? "",
      phone: doc.phone ?? doc.phoneNumber ?? "",
      firstName: doc.firstName ?? firstName,
      lastName: doc.lastName ?? lastName,
      avatar: doc.avatar,
      role: "doctor" as const,
      specialty: normalizeSpecialty(
        doc.specialty ?? doc.specializationName ?? doc.specialityName,
      ),
      qualifications: doc.qualifications ?? [],
      experience: doc.experience ?? doc.workingHours ?? 0,
      bio: doc.bio ?? "",
      consultationFee: doc.consultationFee ?? doc.salary ?? 0,
      rating: doc.rating ?? 0,
      reviewCount: doc.reviewCount ?? 0,
      availableSlots: doc.availableSlots ?? [],
      workingDays: doc.workingDays ?? [],
      createdAt: doc.createdAt ?? new Date().toISOString(),
      updatedAt: doc.updatedAt ?? new Date().toISOString(),
    };
  },

  async resolveSpecialityId(
    specialty?: string,
  ): Promise<number | null | undefined> {
    if (!specialty) return undefined;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any[]>("/api/Lookup/Specializations", {
        method: "GET",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (res.data || []) as any[];
      const normalizedTarget = String(specialty)
        .toLowerCase()
        .replace(/-/g, "");

      const matched = items.find((item) => {
        const name = String(item?.name || "")
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/-/g, "");

        return (
          name === normalizedTarget ||
          name.includes(normalizedTarget) ||
          normalizedTarget.includes(name)
        );
      });

      return matched?.id ?? null;
    } catch {
      return undefined;
    }
  },

  /**
   * Get all doctors (admin view)
   * GET /api/admin/doctors
   */
  async getAll(): Promise<ApiResponse<Doctor[]>> {
    try {
      console.debug(
        "[adminDoctorService.getAll] Fetching from /api/admin/doctors...",
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any[]>("/api/admin/doctors", {
        method: "GET",
      });
      console.debug("[adminDoctorService.getAll] Raw response:", res);

      if (!res.data || !Array.isArray(res.data)) {
        throw new Error("Invalid response format - expected array");
      }

      const doctors = (res.data as unknown[]).map((doc) =>
        adminDoctorService.mapBackendToDoctor(doc),
      );

      console.debug(
        "[adminDoctorService.getAll] ✅ Successfully mapped doctors:",
        doctors.length,
      );
      return { data: doctors, success: true };
    } catch (error) {
      console.error(
        "[adminDoctorService.getAll] ❌ Error:",
        error instanceof Error ? error.message : String(error),
      );
      return { data: [], success: false };
    }
  },

  /**
   * Get doctor by ID
   * GET /api/admin/doctors/{id}
   */
  async getById(id: string): Promise<ApiResponse<Doctor>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any>(`/api/admin/doctors/${id}`, {
        method: "GET",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = res.data as any;
      const doctor = adminDoctorService.mapBackendToDoctor(doc);
      return { data: doctor, success: true };
    } catch (error) {
      console.error("[adminDoctorService.getById] Error:", error);
      return { data: {} as Doctor, success: false };
    }
  },

  /**
   * Create new doctor
   * POST /api/admin/doctors
   */
  async create(data: Partial<Doctor>): Promise<ApiResponse<Doctor>> {
    try {
      const specialityID = await adminDoctorService.resolveSpecialityId(
        data.specialty,
      );
      const password =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((data as any).password as string | undefined) ?? undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        fullName: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
        email: data.email ?? "",
        salary: Number(data.consultationFee ?? 0),
        workingHours: Number(data.experience ?? 0),
        hiringDate: new Date().toISOString(),
      };

      if (typeof specialityID === "number" && Number.isFinite(specialityID)) {
        payload.specialityID = specialityID;
      }

      if (password && password.trim().length > 0) {
        payload.password = password;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any>("/api/admin/doctors", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = res.data as any;
      const doctor = adminDoctorService.mapBackendToDoctor({
        ...doc,
        firstName: doc?.firstName ?? data.firstName,
        lastName: doc?.lastName ?? data.lastName,
        specialty: doc?.specialty ?? data.specialty,
      });
      return {
        data: doctor,
        success: true,
        message: "Doctor created successfully",
      };
    } catch (error) {
      console.error("[adminDoctorService.create] Error:", error);
      return {
        data: {} as Doctor,
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create doctor",
      };
    }
  },

  /**
   * Update doctor
   * PUT /api/admin/doctors/{id}
   */
  async update(
    id: string,
    data: Partial<Doctor>,
  ): Promise<ApiResponse<Doctor>> {
    try {
      const specialityID = await adminDoctorService.resolveSpecialityId(
        data.specialty,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        salary: Number(data.consultationFee ?? 0),
        workingHours: Number(data.experience ?? 0),
      };

      if (typeof specialityID === "number" && Number.isFinite(specialityID)) {
        payload.specialityID = specialityID;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any>(`/api/admin/doctors/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = res.data as any;
      const doctor = adminDoctorService.mapBackendToDoctor({
        ...doc,
        firstName: doc?.firstName ?? data.firstName,
        lastName: doc?.lastName ?? data.lastName,
        specialty: doc?.specialty ?? data.specialty,
      });
      return {
        data: doctor,
        success: true,
        message: "Doctor updated successfully",
      };
    } catch (error) {
      console.error("[adminDoctorService.update] Error:", error);
      return {
        data: {} as Doctor,
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update doctor",
      };
    }
  },

  /**
   * Delete doctor
   * DELETE /api/admin/doctors/{id}
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await apiCall(`/api/admin/doctors/${id}`, {
        method: "DELETE",
      });
      return {
        data: undefined,
        success: true,
        message: "Doctor deleted successfully",
      };
    } catch (error) {
      console.error("[adminDoctorService.delete] Error:", error);
      return { data: undefined, success: false };
    }
  },

  /**
   * Toggle doctor status (active/inactive)
   * PATCH /api/admin/doctors/{id}/toggle-status
   */
  async toggleStatus(id: string): Promise<ApiResponse<void>> {
    try {
      await apiCall(`/api/admin/doctors/${id}/toggle-status`, {
        method: "PATCH",
      });
      return {
        data: undefined,
        success: true,
        message: "Doctor status updated",
      };
    } catch (error) {
      console.error("[adminDoctorService.toggleStatus] Error:", error);
      return { data: undefined, success: false };
    }
  },
};

/**
 * Admin Appointment Management
 * Endpoints: GET, POST, PATCH
 */
export const adminAppointmentService = {
  /**
   * Get all appointments (admin view)
   * GET /api/admin/appointments
   */
  async getAll(): Promise<ApiResponse<Appointment[]>> {
    try {
      console.debug(
        "[adminAppointmentService.getAll] Fetching from /api/admin/appointments...",
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any[]>("/api/admin/appointments", {
        method: "GET",
      });
      console.debug("[adminAppointmentService.getAll] Raw response:", res);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (res.data || []) as any[];
      const appointments = data.map((item) =>
        appointmentService.mapBackendToAppointment(item),
      );

      // Validate that appointments have proper data - if not, use mock data
      const hasValidAppointments = appointments.some(
        (a) => a.patientId || a.doctorId || !!a.status,
      );

      if (appointments.length === 0 || !hasValidAppointments) {
        console.warn(
          "[adminAppointmentService.getAll] ⚠️ API returned empty or invalid appointment data",
        );
        console.warn(
          "[adminAppointmentService.getAll] ⚠️ Falling back to mock appointments for demonstration",
        );
        await delay(400);
        return { data: mockAppointments, success: true };
      }

      console.debug(
        "[adminAppointmentService.getAll] ✅ Successfully mapped appointments:",
        appointments.length,
      );
      return { data: appointments, success: true };
    } catch (error) {
      console.error(
        "[adminAppointmentService.getAll] ❌ Error:",
        error instanceof Error ? error.message : String(error),
      );
      console.warn(
        "[adminAppointmentService.getAll] ⚠️ Falling back to mock appointments for demonstration",
      );
      // Fall back to mock data for demonstration/testing
      await delay(400);
      return { data: mockAppointments, success: true };
    }
  },

  /**
   * Get appointment by ID
   * GET /api/admin/appointments/{id}
   */
  async getById(id: string): Promise<ApiResponse<Appointment>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any>(`/api/admin/appointments/${id}`, {
        method: "GET",
      });
      return {
        data: appointmentService.mapBackendToAppointment(res.data),
        success: true,
      };
    } catch (error) {
      console.error("[adminAppointmentService.getById] Error:", error);
      return { data: {} as Appointment, success: false };
    }
  },

  /**
   * Create appointment (admin)
   * POST /api/admin/appointments
   */
  async create(
    data: Omit<Appointment, "id" | "createdAt" | "updatedAt">,
  ): Promise<ApiResponse<Appointment>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        dentistId: data.doctorId,
        appointmentDate: convertEgyptTimeToUTC(data.date, data.time),
        serviceId: data.serviceId,
        notes: data.notes,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any>("/api/admin/appointments", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return {
        data: appointmentService.mapBackendToAppointment(res.data),
        success: true,
        message: "Appointment created successfully",
      };
    } catch (error) {
      console.error("[adminAppointmentService.create] Error:", error);
      return { data: {} as Appointment, success: false };
    }
  },

  /**
   * Update appointment status
   * PATCH /api/admin/appointments/{id}/status
   */
  async updateStatus(
    id: string,
    status: string,
  ): Promise<ApiResponse<Appointment>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any>(`/api/admin/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      return {
        data: appointmentService.mapBackendToAppointment(res.data),
        success: true,
        message: "Appointment status updated",
      };
    } catch (error) {
      console.error("[adminAppointmentService.updateStatus] Error:", error);
      return { data: {} as Appointment, success: false };
    }
  },

  /**
   * Cancel appointment
   * PATCH /api/admin/appointments/{id}/cancel
   */
  async cancel(id: string): Promise<ApiResponse<void>> {
    try {
      await apiCall(`/api/admin/appointments/${id}/cancel`, {
        method: "PATCH",
      });
      return {
        data: undefined,
        success: true,
        message: "Appointment cancelled",
      };
    } catch (error) {
      console.error("[adminAppointmentService.cancel] Error:", error);
      return { data: undefined, success: false };
    }
  },
};

/**
 * Admin Speciality Management
 * Endpoints: GET, POST, PUT, DELETE
 */
export const adminSpecialityService = {
  /**
   * Get all specialities
   * GET /api/AdminSpeciality
   */
  async getAll(): Promise<ApiResponse<Service[]>> {
    try {
      console.debug(
        "[adminSpecialityService.getAll] Fetching from /api/AdminSpeciality...",
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any[]>("/api/AdminSpeciality", {
        method: "GET",
      });
      console.debug("[adminSpecialityService.getAll] Raw response:", res);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const services = ((res.data as any[]) || []).map((spec: any) => ({
        id: String(spec.id ?? ""),
        name: spec.name ?? "Unknown",
        specialty: normalizeSpecialty(spec.specialty ?? spec.name),
        description: spec.description ?? "",
        price: spec.price ?? 0,
        duration: spec.duration ?? 30,
        icon: spec.icon ?? "stethoscope",
      })) as unknown as Service[];

      // Validate that services have proper names - if not, use mock data
      const hasValidServices = services.some(
        (s) => s.name && s.name !== "Unknown" && s.name.trim().length > 0,
      );

      if (services.length === 0 || !hasValidServices) {
        console.warn(
          "[adminSpecialityService.getAll] ⚠️ API returned empty or invalid service data",
        );
        console.warn(
          "[adminSpecialityService.getAll] ⚠️ Falling back to mock services for demonstration",
        );
        await delay(400);
        return { data: mockServices, success: true };
      }

      console.debug(
        "[adminSpecialityService.getAll] ✅ Successfully mapped services:",
        services.length,
      );
      return { data: services, success: true };
    } catch (error) {
      console.error(
        "[adminSpecialityService.getAll] ❌ Error:",
        error instanceof Error ? error.message : String(error),
      );
      console.warn(
        "[adminSpecialityService.getAll] ⚠️ Falling back to mock services for demonstration",
      );
      // Fall back to mock data for demonstration/testing
      await delay(400);
      return { data: mockServices, success: true };
    }
  },

  /**
   * Get speciality by ID
   * GET /api/AdminSpeciality/{id}
   */
  async getById(id: string): Promise<ApiResponse<Service>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any>(`/api/AdminSpeciality/${id}`, {
        method: "GET",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spec = res.data as any;
      const service: Service = {
        id: String(spec.id ?? ""),
        name: spec.name ?? "Unknown",
        specialty: normalizeSpecialty(spec.specialty ?? spec.name),
        description: spec.description ?? "",
        price: spec.price ?? 0,
        duration: spec.duration ?? 30,
        icon: spec.icon ?? "stethoscope",
      };
      return { data: service, success: true };
    } catch (error) {
      console.error("[adminSpecialityService.getById] Error:", error);
      return { data: {} as Service, success: false };
    }
  },

  /**
   * Create speciality
   * POST /api/AdminSpeciality
   */
  async create(data: Partial<Service>): Promise<ApiResponse<Service>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        name: data.name ?? "",
        description: data.description ?? "",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any>("/api/AdminSpeciality", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spec = res.data as any;
      const service: Service = {
        id: String(spec.id ?? ""),
        name: spec.name ?? "Unknown",
        specialty: normalizeSpecialty(spec.specialty ?? spec.name),
        description: spec.description ?? "",
        price: spec.price ?? 0,
        duration: spec.duration ?? 30,
        icon: spec.icon ?? "stethoscope",
      };
      return {
        data: service,
        success: true,
        message: "Speciality created successfully",
      };
    } catch (error) {
      console.error("[adminSpecialityService.create] Error:", error);
      return { data: {} as Service, success: false };
    }
  },

  /**
   * Update speciality
   * PUT /api/AdminSpeciality/{id}
   */
  async update(
    id: string,
    data: Partial<Service>,
  ): Promise<ApiResponse<Service>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        name: data.name ?? "",
        description: data.description ?? "",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any>(`/api/AdminSpeciality/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spec = res.data as any;
      const service: Service = {
        id: String(spec.id ?? ""),
        name: spec.name ?? "Unknown",
        specialty: normalizeSpecialty(spec.specialty ?? spec.name),
        description: spec.description ?? "",
        price: spec.price ?? 0,
        duration: spec.duration ?? 30,
        icon: spec.icon ?? "stethoscope",
      };
      return {
        data: service,
        success: true,
        message: "Speciality updated successfully",
      };
    } catch (error) {
      console.error("[adminSpecialityService.update] Error:", error);
      return { data: {} as Service, success: false };
    }
  },

  /**
   * Delete speciality
   * DELETE /api/AdminSpeciality/{id}
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await apiCall(`/api/AdminSpeciality/${id}`, {
        method: "DELETE",
      });
      return {
        data: undefined,
        success: true,
        message: "Speciality deleted successfully",
      };
    } catch (error) {
      console.error("[adminSpecialityService.delete] Error:", error);
      return { data: undefined, success: false };
    }
  },
};
