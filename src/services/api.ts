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
} from "@/types";
import type {
  BookAppointmentDto,
  CreatePrescriptionDto,
  PrescriptionDetailsDTO,
} from "@/types/swagger";

// Real backend API endpoint
// Use environment variable for flexibility between development and production
const BASE_URL =
  import.meta.env.VITE_API_URL || "https://smart-teeth-care.runasp.net";

// In-memory token storage (cleared on logout or page refresh)
let authToken: string | null = null;

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
    console.warn("[setAuthToken] Clearing token");
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
  if (isPublicEndpoint) {
    console.debug("[apiCall] Public endpoint (no auth required):", endpoint);
  } else if (token) {
    //  Ensure token doesn't already include "Bearer"
    const cleanToken = token.replace(/^Bearer\s+/i, "");

    headers["Authorization"] = `Bearer ${cleanToken}`;

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

  console.debug("[apiCall] Calling", url, {
    method: options?.method || "GET",
    requestBody: requestBody,
  });

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
    // 401 Unauthorized - clear stored token and notify app
    if (response.status === 401) {
      const token = getAuthToken();
      const decodedToken = token ? decodeJWT(token) : null;
      const patientId = token ? extractPatientIdFromToken(token) : null;

      console.error("[apiCall] ❌ 401 Unauthorized:", endpoint);
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
        "[apiCall] 401 Error details:",
        JSON.stringify(
          {
            endpoint,
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

      console.error("[apiCall] ❌ Booking Failed (400):", endpoint);
      console.error("[apiCall] REQUEST SENT TO BACKEND:");
      console.error(requestBody);
      console.error("[apiCall] BACKEND ERROR RESPONSE:");
      console.error(data);
      console.error("[apiCall] Your Patient ID:", patientId);

      console.warn("[apiCall] Bad Request (400): " + endpoint, {
        status: response.status,
        requestSent: requestBody,
        requestSentJson: JSON.stringify(requestBody),
        response: data,
        tokenPresent: !!token,
        tokenLength: token?.length || 0,
        extractedPatientId: patientId,
      });

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
      } else {
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
      console.warn("[apiCall] Validation errors:", errorDetails);
      console.warn(
        "[apiCall] Debug info - extracted patient ID from token:",
        patientId || "NONE FOUND",
      );

      // Special handling for "Patient not found" errors
      if (errorDetails.includes("Patient not found")) {
        console.error(
          "[apiCall] ❌ CRITICAL: Backend cannot find patient record",
        );
        console.error("[apiCall] Patient ID from token:", patientId);
        console.error("[apiCall] ⚠️  Possible solutions:");
        console.error(
          "[apiCall]    1. Backend needs to sync patient records from auth system",
        );
        console.error(
          "[apiCall]    2. New patient may need to be created in patient database",
        );
        console.error(
          "[apiCall]    3. Contact backend team to verify patient data sync",
        );
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

  console.debug("[apiCall] Success:", endpoint, { status: response.status });
  return { data: data as T, success: true };
}

// Authentication Services
// Real backend integration - no mock data used
export const authService = {
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
      // Username cannot contain spaces, so concatenate without space
      userName: `${data.firstName}${data.lastName}`.trim(),
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
    // Store JWT token in memory (not localStorage)
    if (userData && userData.token) {
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
      console.error(
        "[authService] Registration failed - no token in response",
        userData,
      );
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
};

// Prescription Services (uses Swagger DTOs)
export const prescriptionService = {
  /**
   * Get current user's prescriptions from backend
   * GET /api/PatientPrescriptions
   */
  async getMyPrescriptions(): Promise<ApiResponse<PrescriptionDetailsDTO[]>> {
    const res = await apiCall<PrescriptionDetailsDTO[]>(
      "/api/PatientPrescriptions",
      { method: "GET" },
    );
    return { data: res.data || [], success: true };
  },

  /**
   * Get prescription for specific appointment
   * GET /api/PatientPrescriptions/appointment/{appointmentId}
   */
  async getByAppointment(
    appointmentId: string,
  ): Promise<ApiResponse<PrescriptionDetailsDTO>> {
    const res = await apiCall<PrescriptionDetailsDTO>(
      `/api/PatientPrescriptions/appointment/${appointmentId}`,
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
          specialty: doc.specializationName ?? "General",
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
          profileImage: doc.profileImage ?? doc.photo ?? undefined,
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

    // Fall back to mock data if backend unavailable
    console.warn(
      "[doctorService.getAll] ⚠️ Backend unavailable, using mock doctors for demo purposes",
    );
    await delay(600);
    return { data: mockDoctors, success: true };
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
    // Use mock data if backend doesn't return the expected structure
    return {
      data: res.data || mockDashboardStats,
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
    if (!patient) throw new Error("Patient not found");
    return { data: { ...patient, ...data }, success: true };
  },

  /**
   * Get patient's medical history from backend
   * GET /api/PatientMedicalHistory
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMedicalHistory(): Promise<ApiResponse<any[]>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiCall<any[]>("/api/PatientMedicalHistory", {
      method: "GET",
    });
    return { data: res.data || [], success: true };
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
    const token = getAuthToken();
    const decodedClaims = token ? decodeJWT(token) : null;
    const patientIdFromToken = extractPatientIdFromToken(token);
    console.debug("[appointmentService.getByPatient]", {
      tokenPresent: !!token,
      tokenPrefix: token ? token.substring(0, 20) + "..." : null,
      decodedClaims,
      extractedPatientId: patientIdFromToken,
      allClaimKeys: decodedClaims ? Object.keys(decodedClaims) : [],
      endpoint: "/api/PatientAppointment/GetMyAppointments",
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any[]>(
        "/api/PatientAppointment/GetMyAppointments",
        { method: "GET" },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (res.data || []) as any[];
      console.debug(
        "[appointmentService.getByPatient] ✅ Received appointments from backend:",
        {
          count: data.length,
          rawData: data,
        },
      );

      // If API returns empty array, that's correct for accounts with no appointments
      if (data.length === 0) {
        console.debug(
          "[appointmentService.getByPatient] ✅ Backend returned no appointments (correct for new accounts)",
        );
        // Return empty array - new accounts should have zero appointments
        return { data: [], success: true };
      }

      const appointments = data.map((item) =>
        appointmentService.mapBackendToAppointment(item),
      );
      console.debug(
        "[appointmentService.getByPatient] ✅ Mapped appointments:",
        {
          count: appointments.length,
          appointments: appointments.map((a) => ({
            id: a.id,
            date: a.date,
            time: a.time,
            status: a.status,
            doctorId: a.doctorId,
            hasDoctorInfo: !!a.doctor,
          })),
        },
      );
      return { data: appointments, success: true };
    } catch (error) {
      console.error(
        "[appointmentService.getByPatient] ❌ Failed to fetch appointments:",
        error,
      );
      // Return empty array on error instead of showing mock data
      // This ensures data isolation - users only see their own appointments
      console.warn(
        "[appointmentService.getByPatient] ⚠️  Failed to fetch, returning empty appointments",
      );
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

    const appointmentDate =
      item.appointmentDate || item.date || item.dateTime || null;
    let date = "";
    let time = "";
    if (appointmentDate) {
      const d = new Date(appointmentDate as string | number | Date);
      if (!isNaN(d.getTime())) {
        date = d.toISOString().split("T")[0];
        time = d.toISOString().split("T")[1].slice(0, 5);
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
      : undefined;

    return {
      id: String(item.appointmentId || item.id || fallback?.id || ""),
      patientId: String(
        item.patientId || item.patient?.id || fallback?.patientId || "",
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
      status: (item.status || fallback?.status || "pending").toLowerCase(),
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
          specialty: spec.name ?? "General", // Use name as specialty for matching with doctors
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

    // Fall back to mock data if backend unavailable
    console.warn(
      "[serviceService.getAll] ⚠️ Backend unavailable, using mock services",
    );
    await delay(500);
    return { data: mockServices, success: true };
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
    rating: number;
    comment: string;
  }): Promise<ApiResponse<Review>> {
    try {
      const res = await apiCall<Review>("/api/PatientReviews/AddReview", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return {
        data: res.data,
        success: true,
        message: "Review added successfully",
      };
    } catch (error) {
      console.error("[reviewService.addReview] Error:", error);
      return { data: {} as Review, success: false };
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
