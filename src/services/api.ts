import { ApiResponse, PaginatedResponse } from "@/types";
// TODO :  امسح جزء ال mockdata
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
  MedicalRecord,
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
  AuthResponseDTO,
  BookAppointmentDto,
  ChangePasswordDTO,
  CreatePrescriptionDto,
  ForgotPasswordDTO,
  PrescriptionDetailsDTO,
  RefreshTokenRequestDTO,
  ResetPasswordDTO,
  RevokeTokenDTO,
  UpdatePatientProfileDto,
  CreateMedicalRecordDto,
  AddReviewDTO,
  UpdateReviewDTO,
} from "@/types/swagger";

// Real backend API endpoint
// Use environment variable for flexibility between development and production
const BASE_URL =
  import.meta.env.VITE_API_URL || "https://smart-teeth-care.runasp.net";
const DEBUG_API = import.meta.env.VITE_DEBUG_API === "true";

// In-memory token storage (cleared on logout or page refresh)
let authToken: string | null = null;
// In-memory refresh token storage
let authRefreshToken: string | null = null;
// Prevent concurrent token-refresh races
let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

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

function normalizeLookupKey(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return String(numeric);

  const numericMatch = raw.match(/\d+/);
  if (numericMatch) return String(Number(numericMatch[0]));

  return raw.toLowerCase();
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

function stripDoctorTitle(value?: string | null): string {
  return String(value || "")
    .replace(/^\s*dr\.?\s+/i, "")
    .trim();
}

function splitDoctorName(rawDoctorName?: string | null): {
  firstName: string;
  lastName: string;
} {
  return splitName(stripDoctorTitle(rawDoctorName));
}

function normalizeDateForInput(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().split("T")[0];
}

function toOptionalIsoDate(value?: string | null): string | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T00:00:00.000Z`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizePersonNameSegment(value?: string | null): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapBackendPatientProfileToPatient(
  raw: unknown,
  fallback?: Partial<Patient>,
): Patient {
  const item =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const { firstName: splitFirstName, lastName: splitLastName } = splitName(
    String(
      item.fullName ||
        item.FullName ||
        item.name ||
        item.Name ||
        item.userName ||
        item.UserName ||
        "",
    ).trim(),
  );

  const rawGender = String(item.gender || fallback?.gender || "other")
    .toLowerCase()
    .trim();
  const gender: "male" | "female" | "other" =
    rawGender === "male" || rawGender === "female" || rawGender === "other"
      ? rawGender
      : "other";

  const avatarRaw = String(
    item.avatar ||
      item.Avatar ||
      item.profileImage ||
      item.ProfileImage ||
      item.imageUrl ||
      item.ImageUrl ||
      fallback?.avatar ||
      "",
  );
  const avatar = resolveBackendAssetUrl(avatarRaw) || avatarRaw;

  return {
    id: String(
      item.id ||
        item.Id ||
        item.patientId ||
        item.PatientId ||
        item.userId ||
        item.UserId ||
        fallback?.id ||
        "",
    ),
    email: String(item.email || item.Email || fallback?.email || ""),
    firstName: String(
      item.firstName ||
        item.FirstName ||
        item.first_name ||
        fallback?.firstName ||
        splitFirstName,
    ),
    lastName: String(
      item.lastName ||
        item.LastName ||
        item.last_name ||
        fallback?.lastName ||
        splitLastName,
    ),
    phone: String(
      item.phone ||
        item.Phone ||
        item.phoneNumber ||
        item.PhoneNumber ||
        fallback?.phone ||
        "",
    ),
    avatar,
    role: "patient",
    dateOfBirth: normalizeDateForInput(
      String(
        item.dateOfBirth || item.DateOfBirth || fallback?.dateOfBirth || "",
      ),
    ),
    gender,
    address: String(item.address || item.Address || fallback?.address || ""),
    createdAt: String(
      item.createdAt ||
        item.CreatedAt ||
        fallback?.createdAt ||
        new Date().toISOString(),
    ),
    updatedAt: String(
      item.updatedAt ||
        item.UpdatedAt ||
        fallback?.updatedAt ||
        new Date().toISOString(),
    ),
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

function resolveBackendAssetUrl(value?: string | null): string | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;

  // Some backend payloads return values like "'/images/specialities/Name.png'".
  const cleaned = raw.replace(/^['"]+|['"]+$/g, "").trim();
  if (!cleaned) return undefined;

  let normalized: string;
  if (/^https?:\/\//i.test(cleaned)) {
    normalized = cleaned;
  } else if (cleaned.startsWith("/")) {
    normalized = `${BASE_URL}${cleaned}`;
  } else {
    normalized = `${BASE_URL}/${cleaned}`;
  }

  // Preserve URL shape while ensuring spaces and unsafe chars are encoded.
  try {
    return encodeURI(normalized);
  } catch {
    return normalized;
  }
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
 * Store the refresh token in memory and localStorage
 */
function setRefreshToken(token: string | null): void {
  authRefreshToken = token;
  try {
    if (token) {
      localStorage.setItem("auth_refresh_token", token);
    } else {
      localStorage.removeItem("auth_refresh_token");
    }
  } catch (e) {
    console.error("[setRefreshToken] localStorage error:", e);
  }
}

/**
 * Get the current refresh token
 */
function getRefreshToken(): string | null {
  if (authRefreshToken) return authRefreshToken;
  try {
    const stored = localStorage.getItem("auth_refresh_token");
    if (stored) {
      authRefreshToken = stored;
      return stored;
    }
  } catch (e) {
    console.error("[getRefreshToken] localStorage error:", e);
  }
  return null;
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
    // Custom backend claims for the doctor's integer ID (most specific first)
    (claims.DoctorId as string) ||
    (claims.doctorId as string) ||
    (claims.doctor_id as string) ||
    (claims.PatientId as string) ||
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
    "/api/Account/confirm-email",
    "/api/Account/forgot-password",
    "/api/Account/reset-password",
    "/api/Account/RefreshToken",
    "/swagger",
    "/api/Lookup/Doctors",
    "/api/Lookup/Specializations",
    // NOTE: /api/DoctorSchedule is NOT public — it requires a valid JWT
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
      data && typeof data === "object"
        ? (data as Record<string, unknown>).message || ""
        : data || "",
    )
      .toLowerCase()
      .trim();

    // Auth failure - clear stored token only for auth-related endpoints.
    // For resource endpoints (admin, doctor, patient pages), a 401 means
    // "insufficient permissions" — do NOT log the user out.
    const isAuthEndpoint =
      endpoint.includes("/api/Account/") || endpoint.includes("/api/auth/");

    // For non-auth endpoints, only treat HTTP 401 as unauthorized (not 403,
    // which is a permission/role denial that should not force a logout).
    const isUnauthorizedResponse =
      response.status === 401 ||
      (response.status === 403 && isAuthEndpoint) ||
      normalizedErrorText.includes("unauthorized") ||
      normalizedErrorText.includes("forbidden");

    if (isUnauthorizedResponse && isAuthEndpoint) {
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
      // Prefer the actual backend error message so the user sees the real reason
      const authErrMsg =
        (data as Record<string, unknown>)?.message ??
        (typeof data === "string" && data.length < 200 ? data : null) ??
        "Unauthorized: Please log in again";
      throw new Error(String(authErrMsg));
    }

    // For resource 401s — attempt a silent token refresh then retry once.
    // This handles the common case where the access token has simply expired.
    if (isUnauthorizedResponse) {
      const storedRefreshToken = getRefreshToken();
      const isRefreshEndpoint = endpoint.includes("/api/Account/RefreshToken");

      if (storedRefreshToken && !isRefreshEndpoint) {
        // Serialise concurrent refresh attempts
        if (isRefreshing) {
          // Wait for the in-progress refresh then retry
          const newToken = await new Promise<string | null>((resolve) => {
            refreshWaiters.push(resolve);
          });
          if (newToken) {
            const cleanNew = newToken.replace(/^Bearer\s+/i, "");
            const retryHeaders = {
              ...headers,
              Authorization: `Bearer ${cleanNew}`,
            };
            const retryRes = await fetch(url, {
              ...options,
              mode: "cors",
              credentials: "omit",
              headers: retryHeaders,
            });
            const retryText = await retryRes.text();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let retryData: any;
            try {
              retryData = retryText ? JSON.parse(retryText) : undefined;
            } catch {
              retryData = retryText;
            }
            if (retryRes.ok) return { data: retryData, success: true };
          }
          // Refresh failed for this waiter — don't force logout.
          // The original token may still be valid for other endpoints.
          throw new Error(
            `You do not have permission to access this resource (${endpoint}).`,
          );
        }

        isRefreshing = true;
        try {
          const refreshRes = await fetch(
            `${BASE_URL}/api/Account/RefreshToken`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              mode: "cors",
              credentials: "omit",
              body: JSON.stringify({ refreshToken: storedRefreshToken }),
            },
          );

          if (refreshRes.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const refreshData: any = await refreshRes.json();
            const newAccessToken: string | undefined =
              refreshData.token ?? refreshData.accessToken;
            const newRefresh: string | undefined = refreshData.refreshToken;

            if (newAccessToken) {
              setAuthToken(newAccessToken);
              if (newRefresh) setRefreshToken(newRefresh);

              // Notify all waiting callers
              const cleanNew = newAccessToken.replace(/^Bearer\s+/i, "");
              refreshWaiters.forEach((resolve) => resolve(cleanNew));
              refreshWaiters = [];
              isRefreshing = false;

              // Retry original request with new token
              const retryHeaders = {
                ...headers,
                Authorization: `Bearer ${cleanNew}`,
              };
              const retryRes = await fetch(url, {
                ...options,
                mode: "cors",
                credentials: "omit",
                headers: retryHeaders,
              });
              const retryText = await retryRes.text();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let retryData: any;
              try {
                retryData = retryText ? JSON.parse(retryText) : undefined;
              } catch {
                retryData = retryText;
              }
              if (retryRes.ok) return { data: retryData, success: true };
              // Retry also failed
              const retryMsg =
                retryData?.message ??
                `Unauthorized: You do not have permission to access ${endpoint}`;
              throw new Error(String(retryMsg));
            }
          }
        } catch (refreshErr) {
          // If it's an error we threw ourselves (from retry above), re-throw
          if (
            refreshErr instanceof Error &&
            !refreshErr.message.includes("RefreshToken")
          ) {
            refreshWaiters.forEach((resolve) => resolve(null));
            refreshWaiters = [];
            isRefreshing = false;
            throw refreshErr;
          }
        } finally {
          if (isRefreshing) {
            refreshWaiters.forEach((resolve) => resolve(null));
            refreshWaiters = [];
            isRefreshing = false;
          }
        }

        // Refresh request itself failed — throw but keep the user session alive.
        // The access token may still be valid; a single endpoint rejecting it
        // does not mean the entire session is invalid.
        console.warn(
          "[apiCall] Token refresh failed for",
          endpoint,
          "— keeping session active",
        );
        const refreshFailMsg =
          (data as Record<string, unknown>)?.message ??
          `You do not have permission to access ${endpoint}`;
        throw new Error(String(refreshFailMsg));
      }

      // No refresh token available
      const msg =
        (data as Record<string, unknown>)?.message ??
        `Unauthorized: You do not have permission to access ${endpoint}`;
      throw new Error(String(msg));
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
      data &&
      typeof data === "object" &&
      (data as Record<string, unknown>).message
        ? String((data as Record<string, unknown>).message)
        : typeof data === "string" && data.trim()
          ? data.trim()
          : response.statusText;
    console.error(
      "[apiCall] Error:",
      endpoint,
      response.status,
      errorMessage,
      "Full response body:",
      data,
    );
    throw new Error(errorMessage);
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

  /**
   * Extract the current user's numeric ID from the stored JWT token claims.
   * The backend doesn't return an id field in LoginResponseDTO, so the only
   * reliable source is the token's nameid / sub / userId claim.
   */
  getCurrentUserIdFromToken(): string | null {
    const token = getAuthToken();
    return token ? extractPatientIdFromToken(token) : null;
  },

  /**
   * Resolve the logged-in doctor's integer ID.
   * Priority:
   *   1. A numeric value from JWT claims (DoctorId / nameid / sub etc.) — skips GUIDs
   *   2. The doctorId from GET /api/doctor/dashboard (JWT-scoped, no appointments needed)
   *   3. The doctorId embedded in the first appointment from the backend
   *      (reliable because GET /api/doctor/appointments is JWT-scoped).
   * Returns null if no source yields a valid positive integer.
   */
  async resolveCurrentDoctorId(): Promise<number | null> {
    // 1. Try JWT claims — only accept numeric (non-GUID) values
    const fromToken = this.getCurrentUserIdFromToken();
    const fromTokenNum = fromToken ? Number(fromToken) : NaN;
    if (Number.isFinite(fromTokenNum) && fromTokenNum > 0) {
      return fromTokenNum;
    }

    // 2. Try the doctor dashboard endpoint — JWT-scoped, works even with zero appointments
    try {
      const dashRes = await apiCall<unknown>("/api/doctor/dashboard", {
        method: "GET",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dash = dashRes.data as any;
      const fromDash = Number(dash?.doctorId ?? dash?.id ?? dash?.dentistId);
      if (Number.isFinite(fromDash) && fromDash > 0) {
        console.debug(
          "[resolveCurrentDoctorId] Found doctor ID from dashboard:",
          fromDash,
        );
        return fromDash;
      }
    } catch (e) {
      console.warn("[resolveCurrentDoctorId] Dashboard call failed:", e);
    }

    // 3. Fetch the doctor's appointments and pull the doctorId from the first record
    try {
      const res = await apiCall<unknown[]>("/api/doctor/appointments", {
        method: "GET",
      });
      const items = Array.isArray(res.data) ? res.data : [];
      for (const item of items) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = item as any;
        const id = Number(
          a.dentistId ?? a.doctorId ?? a.doctor?.id ?? a.doctor?.dentistId,
        );
        if (Number.isFinite(id) && id > 0) {
          console.debug(
            "[resolveCurrentDoctorId] Found doctor ID from appointments:",
            id,
          );
          return id;
        }
      }
    } catch (e) {
      console.warn(
        "[resolveCurrentDoctorId] Could not fetch appointments to resolve doctorId:",
        e,
      );
    }

    // 4. Match the logged-in user's name against the public /api/Lookup/Doctors list.
    //    NOTE: DoctorDTO has no email field (confirmed from Swagger), so we match by name only.
    try {
      const storedUserRaw = localStorage.getItem("auth_user");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storedUser: any = storedUserRaw ? JSON.parse(storedUserRaw) : null;
      const currentUserName: string = (storedUser?.userName ?? "")
        .toLowerCase()
        .trim();
      if (currentUserName) {
        const lookupRes = await apiCall<unknown[]>("/api/Lookup/Doctors", {
          method: "GET",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doctors: any[] = Array.isArray(lookupRes.data)
          ? lookupRes.data
          : [];
        const match = doctors.find((d) => {
          const docName = (d.name ?? d.fullName ?? "").toLowerCase().trim();
          return (
            docName === currentUserName ||
            docName.includes(currentUserName) ||
            currentUserName.includes(docName)
          );
        });
        if (match) {
          const idFromLookup = Number(
            match.id ?? match.doctorId ?? match.dentistId,
          );
          if (Number.isFinite(idFromLookup) && idFromLookup > 0) {
            console.debug(
              "[resolveCurrentDoctorId] Found doctor ID from Lookup/Doctors by name:",
              idFromLookup,
            );
            return idFromLookup;
          }
        }
      }
    } catch (e) {
      console.warn(
        "[resolveCurrentDoctorId] Lookup/Doctors fallback failed:",
        e,
      );
    }

    return null;
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
    const payload = {
      email: data.email,
      token: data.token,
      newPassword: data.newPassword,
    };
    console.debug("[authService] resetPassword payload:", payload);
    await apiCall<void>("/api/Account/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return {
      data: undefined,
      success: true,
      message: "Password updated successfully",
    };
  },

  async changePassword(data: ChangePasswordDTO): Promise<ApiResponse<void>> {
    await apiCall<void>("/api/Account/change-password", {
      method: "PUT",
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
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
      refreshToken?: string;
      expiration?: string;
      userId?: string;
      id?: string;
    }>
  > {
    const response = await apiCall<{
      userName: string;
      email: string;
      role: string;
      token: string;
      refreshToken?: string;
      expiration?: string;
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
      if (userData.refreshToken) {
        setRefreshToken(userData.refreshToken);
      }
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
      refreshToken?: string;
      expiration?: string;
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
      refreshToken?: string;
      expiration?: string;
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
      if (userData.refreshToken) {
        setRefreshToken(userData.refreshToken);
      }
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
   * POST /api/Account/logout — sends refresh token to backend to invalidate it
   */
  async logout(): Promise<void> {
    const currentRefreshToken = getRefreshToken();

    // Best-effort server-side logout (invalidate refresh token)
    if (currentRefreshToken) {
      try {
        const body: RevokeTokenDTO = { refreshToken: currentRefreshToken };
        await apiCall<void>("/api/Account/logout", {
          method: "POST",
          body: JSON.stringify(body),
        });
        console.debug("[authService] Server-side logout successful");
      } catch (e) {
        // Non-fatal: still clear local tokens even if backend call fails
        console.warn("[authService] Server-side logout failed (non-fatal):", e);
      }
    }

    // Always clear local tokens
    setAuthToken(null);
    setRefreshToken(null);
    console.debug("[authService] Local tokens cleared");

    // Notify listeners (AuthContext) about logout
    try {
      window.dispatchEvent(new Event("auth:logout"));
    } catch (e) {
      console.error("[authService] Error notifying logout:", e);
    }
  },

  /**
   * Refresh the access token using a refresh token
   * POST /api/Account/RefreshToken
   * Returns new AuthResponseDTO with fresh token + refreshToken
   */
  async refreshToken(): Promise<AuthResponseDTO> {
    const currentRefreshToken = getRefreshToken();
    if (!currentRefreshToken) {
      throw new Error("No refresh token available");
    }
    const body: RefreshTokenRequestDTO = { refreshToken: currentRefreshToken };
    const response = await apiCall<AuthResponseDTO>(
      "/api/Account/RefreshToken",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    const result = response.data;
    if (result?.token) {
      setAuthToken(result.token);
    }
    if (result?.refreshToken) {
      setRefreshToken(result.refreshToken);
    }
    return result ?? {};
  },

  /**
   * Revoke a refresh token (explicit revocation without full logout)
   * POST /api/Account/RevokeRefreshToken
   */
  async revokeRefreshToken(refreshTokenValue?: string): Promise<void> {
    const tokenToRevoke = refreshTokenValue ?? getRefreshToken();
    if (!tokenToRevoke) return;
    const body: RefreshTokenRequestDTO = { refreshToken: tokenToRevoke };
    await apiCall<void>("/api/Account/RevokeRefreshToken", {
      method: "POST",
      body: JSON.stringify(body),
    });
    console.debug("[authService] Refresh token revoked");
  },

  /**
   * Confirm email address via link from email
   * GET /api/Account/confirm-email?UserId=...&Token=...
   */
  async confirmEmail(userId: string, token: string): Promise<void> {
    const params = new URLSearchParams({ UserId: userId, Token: token });
    await apiCall<void>(`/api/Account/confirm-email?${params.toString()}`, {
      method: "GET",
    });
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

const NO_PRESCRIPTION_STORAGE_KEY = "doctor_no_prescription_by_appointment";
const PRESCRIPTION_STORAGE_KEY = "doctor_prescription_by_appointment";
const MEDICAL_RECORDS_STORAGE_KEY = "doctor_medical_records";

function readNoPrescriptionMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(NO_PRESCRIPTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeNoPrescriptionMap(data: Record<string, boolean>): void {
  try {
    localStorage.setItem(NO_PRESCRIPTION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore localStorage write failures.
  }
}

function readPrescriptionMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PRESCRIPTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePrescriptionMap(data: Record<string, boolean>): void {
  try {
    localStorage.setItem(PRESCRIPTION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore localStorage write failures.
  }
}

function readStoredMedicalRecords(): MedicalRecord[] {
  try {
    const raw = localStorage.getItem(MEDICAL_RECORDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MedicalRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredMedicalRecords(records: MedicalRecord[]): void {
  try {
    localStorage.setItem(MEDICAL_RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore localStorage write failures.
  }
}

function parseEntityNumericId(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  const prefixed = raw.match(
    /^(?:patient|pat|appointment|apt|record|rec|medicalrecord|medical-record)-(\d+)$/i,
  );
  if (!prefixed) return null;

  const parsed = Number(prefixed[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildMedicalRecordPatientIdCandidates(patientId: string): string[] {
  const candidates = new Set<string>();
  const provided = String(patientId || "").trim();
  if (provided) candidates.add(provided);

  const parsedProvided = parseEntityNumericId(provided);
  if (parsedProvided !== null) candidates.add(String(parsedProvided));

  const tokenPatientId = extractPatientIdFromToken(getAuthToken());
  if (tokenPatientId) {
    const parsedFromToken = parseEntityNumericId(tokenPatientId);
    if (parsedFromToken !== null) candidates.add(String(parsedFromToken));
    else candidates.add(String(tokenPatientId).trim());
  }

  return Array.from(candidates).filter(Boolean);
}

// UI payload for POST /api/MedicalRecords/create (Swagger: appointmentId, diagnosis, notes only).
export interface CreateMedicalRecordRequest {
  appointmentId: string;
  patientId?: string;
  diagnosis: string;
  treatment?: string;
  notes?: string;
  toothNumber?: string;
  type?: "diagnosis" | "treatment" | "prescription" | "note";
}

function extractApiArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj["$values"])) return obj["$values"];
    for (const key of ["data", "value", "items", "records", "result"]) {
      const nested = obj[key];
      if (Array.isArray(nested)) return nested;
      if (nested && typeof nested === "object") {
        const inner = extractApiArray(nested);
        if (inner.length > 0) return inner;
      }
    }
  }
  return [];
}

function buildCreateMedicalRecordNotes(
  data: CreateMedicalRecordRequest,
): string | null {
  const parts: string[] = [];
  if (data.notes?.trim()) parts.push(data.notes.trim());
  if (data.treatment?.trim()) parts.push(`Treatment: ${data.treatment.trim()}`);
  if (data.toothNumber?.trim()) parts.push(`Tooth: ${data.toothNumber.trim()}`);
  return parts.length > 0 ? parts.join("\n") : null;
}

export function isBackendMedicalRecordId(id: string): boolean {
  return parseEntityNumericId(id) !== null && !id.startsWith("record-");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendToMedicalRecord(item: any): MedicalRecord {
  const rawDoctorName = String(
    item.doctorName || item.doctor_name || item.doctorFullName || "",
  ).trim();
  const { firstName: doctorFirstName, lastName: doctorLastName } =
    splitDoctorName(rawDoctorName || null);
  const doctorObj = item.doctor;

  const mappedDoctor =
    doctorObj && typeof doctorObj === "object"
      ? {
          id: String(doctorObj.id || doctorObj.doctorId || ""),
          email: String(doctorObj.email || ""),
          firstName: String(doctorObj.firstName || doctorObj.first_name || ""),
          lastName: String(doctorObj.lastName || doctorObj.last_name || ""),
          phone: String(doctorObj.phone || doctorObj.phoneNumber || ""),
          avatar: String(doctorObj.avatar || doctorObj.profileImage || ""),
          role: "doctor" as const,
          specialty: "general" as const,
          qualifications: [],
          experience: 0,
          bio: "",
          consultationFee: 0,
          rating: 0,
          reviewCount: 0,
          availableSlots: [],
          workingDays: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : rawDoctorName
        ? {
            id: String(
              item.doctorId ||
                item.doctorID ||
                `doctor-${rawDoctorName.toLowerCase().replace(/\s+/g, "-")}`,
            ),
            email: "",
            firstName: doctorFirstName,
            lastName: doctorLastName,
            phone: "",
            avatar: "",
            role: "doctor" as const,
            specialty: "general" as const,
            qualifications: [],
            experience: 0,
            bio: "",
            consultationFee: 0,
            rating: 0,
            reviewCount: 0,
            availableSlots: [],
            workingDays: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : undefined;

  const rawPatientName = String(
    item.patientName || item.patient_name || item.patientFullName || "",
  ).trim();
  const { firstName: patientFirstName, lastName: patientLastName } = splitName(
    rawPatientName || null,
  );
  const patientObj = item.patient;

  const mappedPatient =
    patientObj && typeof patientObj === "object"
      ? {
          id: String(patientObj.id || patientObj.patientId || ""),
          email: String(patientObj.email || ""),
          firstName: String(
            patientObj.firstName || patientObj.first_name || "",
          ),
          lastName: String(patientObj.lastName || patientObj.last_name || ""),
          phone: String(patientObj.phone || patientObj.phoneNumber || ""),
          avatar: String(patientObj.avatar || patientObj.profileImage || ""),
          role: "patient" as const,
          dateOfBirth: String(patientObj.dateOfBirth || ""),
          gender: "other" as const,
          address: String(patientObj.address || ""),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : rawPatientName
        ? {
            id: String(
              item.patientId ||
                item.patientID ||
                `patient-${rawPatientName.toLowerCase().replace(/\s+/g, "-")}`,
            ),
            email: "",
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

  const normalizedType = String(item.type || item.recordType || "")
    .toLowerCase()
    .trim();

  const recordId = item.id ?? item.recordId ?? item.medicalRecordId;
  return {
    id:
      recordId != null && String(recordId).trim() !== ""
        ? String(recordId)
        : "",
    appointmentId:
      item.appointmentId != null
        ? String(item.appointmentId)
        : item.appointmentID != null
          ? String(item.appointmentID)
          : item.appointment?.id != null
            ? String(item.appointment.id)
            : undefined,
    patientId: String(
      item.patientId || item.patientID || mappedPatient?.id || "",
    ),
    doctorId: String(item.doctorId || item.doctorID || mappedDoctor?.id || ""),
    patient: mappedPatient,
    doctor: mappedDoctor,
    date: String(item.date || item.createdAt || new Date().toISOString()),
    type:
      normalizedType === "diagnosis" ||
      normalizedType === "treatment" ||
      normalizedType === "prescription" ||
      normalizedType === "note"
        ? normalizedType
        : "note",
    diagnosis: String(
      item.diagnosis || item.primaryDiagnosis || item.recordTitle || "",
    ),
    treatment: String(item.treatment || item.plan || item.procedure || ""),
    notes: String(item.notes || item.description || item.recordDetails || ""),
    toothNumber: item.toothNumber ? String(item.toothNumber) : undefined,
    attachments: [],
  };
}

export const appointmentCareService = {
  async markNoPrescription(appointmentId: string): Promise<ApiResponse<void>> {
    const current = readNoPrescriptionMap();
    current[appointmentId] = true;
    writeNoPrescriptionMap(current);

    // Inferred endpoint based on doctor appointment routing pattern.
    try {
      await apiCall<void>(
        `/api/doctor/appointments/${appointmentId}/no-prescription`,
        {
          method: "PUT",
        },
      );
    } catch {
      // Keep frontend state when backend endpoint is unavailable.
    }

    return {
      data: undefined,
      success: true,
      message: "No prescription saved",
    };
  },

  getNoPrescriptionMap(): Record<string, boolean> {
    return readNoPrescriptionMap();
  },

  markPrescriptionSubmitted(appointmentId: string): void {
    const current = readPrescriptionMap();
    current[appointmentId] = true;
    writePrescriptionMap(current);
  },

  getPrescriptionMap(): Record<string, boolean> {
    return readPrescriptionMap();
  },
};

export const medicalRecordService = {
  /**
   * GET /api/MedicalRecords/my-records — patient JWT resolves the patient.
   */
  async getByPatient(): Promise<ApiResponse<MedicalRecord[]>> {
    try {
      const res = await apiCall<unknown>("/api/MedicalRecords/my-records", {
        method: "GET",
      });
      const records = extractApiArray(res.data).map((item) =>
        mapBackendToMedicalRecord(item),
      );
      return { data: records, success: true };
    } catch (error) {
      console.error("[medicalRecordService.getByPatient] Error:", error);
      return {
        data: [],
        success: false,
        message: "Failed to fetch medical records",
      };
    }
  },

  /**
   * GET /api/MedicalRecords/my-created-medical-records — doctor JWT resolves the doctor.
   */
  async getMyCreatedRecords(): Promise<ApiResponse<MedicalRecord[]>> {
    try {
      const res = await apiCall<unknown>(
        "/api/MedicalRecords/my-created-medical-records",
        { method: "GET" },
      );
      const records = extractApiArray(res.data).map((item) =>
        mapBackendToMedicalRecord(item),
      );
      return { data: records, success: true };
    } catch (error) {
      console.error("[medicalRecordService.getMyCreatedRecords] Error:", error);
      return {
        data: [],
        success: false,
        message: "Failed to fetch created medical records",
      };
    }
  },

  /**
   * GET /api/MedicalRecords/details/{id}
   */
  async getById(id: string): Promise<ApiResponse<MedicalRecord>> {
    const numericId = parseEntityNumericId(id);
    if (!numericId) {
      throw new Error(`Invalid medical record id: "${id}"`);
    }

    try {
      const res = await apiCall<unknown>(
        `/api/MedicalRecords/details/${numericId}`,
        { method: "GET" },
      );
      return { data: mapBackendToMedicalRecord(res.data), success: true };
    } catch (error) {
      console.error("[medicalRecordService.getById] Error:", error);
      throw error;
    }
  },

  /**
   * POST /api/MedicalRecords/create
   */
  async create(
    data: CreateMedicalRecordRequest,
  ): Promise<ApiResponse<MedicalRecord>> {
    const normalizedAppointmentId = parseEntityNumericId(data.appointmentId);
    if (!normalizedAppointmentId) {
      throw new Error(`Invalid appointmentId: "${data.appointmentId}"`);
    }

    const payload: CreateMedicalRecordDto = {
      appointmentId: normalizedAppointmentId,
      diagnosis: data.diagnosis?.trim() || null,
      notes: buildCreateMedicalRecordNotes(data),
    };

    const res = await apiCall<unknown>("/api/MedicalRecords/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
      return {
        data: mapBackendToMedicalRecord(res.data),
        success: true,
      };
    }

    // Backend often returns 200 with an empty body — refetch the doctor's records.
    try {
      const createdRes = await medicalRecordService.getMyCreatedRecords();
      const matched = (createdRes.data || []).find((record) => {
        const recordAppointmentId = parseEntityNumericId(
          record.appointmentId || "",
        );
        return recordAppointmentId === normalizedAppointmentId;
      });
      if (matched?.id) {
        return { data: matched, success: true };
      }
    } catch {
      // Fall through to minimal local record.
    }

    return {
      data: {
        id: "",
        appointmentId: String(normalizedAppointmentId),
        patientId: data.patientId || "",
        doctorId: "",
        date: new Date().toISOString(),
        type: data.type || "diagnosis",
        diagnosis: data.diagnosis,
        treatment: data.treatment || "",
        notes: data.notes || "",
        toothNumber: data.toothNumber,
        attachments: [],
      },
      success: true,
    };
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
        const doctors = (res.data as any[]).map((doc: any) => {
          const averageRating =
            doc.averageRating ?? doc.rating ?? doc.reviewCount ?? 0;
          const totalReviews =
            doc.totalReviews ?? doc.reviewCount ?? doc.rating ?? 0;
          const fallbackName =
            doc.name ??
            doc.fullName ??
            `${doc.firstName ?? ""} ${doc.lastName ?? ""}`;
          const normalizedName = splitDoctorName(fallbackName);
          const normalizedFirstName = stripDoctorTitle(
            doc.firstName ?? normalizedName.firstName,
          );
          const normalizedLastName = stripDoctorTitle(
            doc.lastName ?? normalizedName.lastName,
          );
          const doctorAvatar = resolveBackendAssetUrl(
            doc.photo ??
              doc.profileImage ??
              doc.avatar ??
              doc.imageUrl ??
              doc.profilePicture,
          );

          return {
            id: String(doc.id ?? 1),
            name: doc.name ?? "Unknown",
            specialty: normalizeSpecialty(
              doc.specialty ?? doc.specializationName ?? doc.specialization,
            ),
            email: doc.email ?? "",
            phone: doc.phoneNumber ?? "",
            photo: doctorAvatar,
            experience: doc.experience ?? doc.yearsOfExperience ?? 0,
            languages: doc.languages ?? [],
            // Fill other required fields with defaults
            role: doc.role ?? "doctor",
            qualifications: doc.qualifications ?? [],
            bio: doc.bio ?? doc.description ?? "",
            consultationFee: doc.consultationFee ?? 0,
            averageRating,
            totalReviews,
            rating: averageRating,
            totalPatients: doc.totalPatients ?? 0,
            department: doc.department ?? "General",
            clinic: doc.clinic ?? "",
            availableSlots: doc.availableSlots ?? [],
            reviewCount: totalReviews,
            workingDays: doc.workingDays ?? [],
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
            avatar: doctorAvatar,
            profileImage: doctorAvatar,
            // Store raw specializationId for reliable doctor filtering by service
            specializationId: doc.specializationId ?? null,
            createdAt: doc.createdAt ?? new Date(),
            updatedAt: doc.updatedAt ?? new Date(),
          };
        }) as unknown as Doctor[];
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

  /**
   * Get doctors filtered by speciality
   * GET /api/Lookup/DoctorsBySpeciality/{specialityId}
   */
  async getDoctorsBySpeciality(
    specialityId: number,
  ): Promise<ApiResponse<Doctor[]>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any[]>(
        `/api/Lookup/DoctorsBySpeciality/${specialityId}`,
        { method: "GET" },
      );
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doctors = (res.data as any[]).map((doc: any) => {
          const averageRating =
            doc.averageRating ?? doc.rating ?? doc.reviewCount ?? 0;
          const totalReviews =
            doc.totalReviews ?? doc.reviewCount ?? doc.rating ?? 0;
          const fallbackName =
            doc.name ??
            doc.fullName ??
            `${doc.firstName ?? ""} ${doc.lastName ?? ""}`;
          const normalizedName = splitDoctorName(fallbackName);
          const doctorAvatar = resolveBackendAssetUrl(
            doc.photo ??
              doc.profileImage ??
              doc.avatar ??
              doc.imageUrl ??
              doc.profilePicture,
          );
          return {
            id: String(doc.id ?? 1),
            name: doc.name ?? "Unknown",
            specialty: normalizeSpecialty(
              doc.specialty ?? doc.specializationName ?? doc.specialization,
            ),
            email: doc.email ?? "",
            phone: doc.phoneNumber ?? "",
            photo: doctorAvatar,
            experience: doc.experience ?? doc.yearsOfExperience ?? 0,
            languages: doc.languages ?? [],
            role: doc.role ?? "doctor",
            qualifications: doc.qualifications ?? [],
            bio: doc.bio ?? doc.description ?? "",
            consultationFee: doc.consultationFee ?? 0,
            averageRating,
            totalReviews,
            rating: averageRating,
            totalPatients: doc.totalPatients ?? 0,
            department: doc.department ?? "General",
            clinic: doc.clinic ?? "",
            availableSlots: doc.availableSlots ?? [],
            reviewCount: totalReviews,
            workingDays: doc.workingDays ?? [],
            firstName: stripDoctorTitle(
              doc.firstName ?? normalizedName.firstName,
            ),
            lastName: stripDoctorTitle(doc.lastName ?? normalizedName.lastName),
            avatar: doctorAvatar,
            profileImage: doctorAvatar,
            specializationId: doc.specializationId ?? specialityId,
            createdAt: doc.createdAt ?? new Date(),
            updatedAt: doc.updatedAt ?? new Date(),
          };
        }) as unknown as Doctor[];
        return { data: doctors, success: true };
      }
    } catch (error) {
      console.error(
        "[doctorService.getDoctorsBySpeciality] Error:",
        error instanceof Error ? error.message : String(error),
      );
    }
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
    try {
      const result = await doctorScheduleService.getAvailableSlots(
        doctorId,
        date,
      );
      return result;
    } catch {
      return { data: [], success: false };
    }
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
  async getProfile(fallback?: Partial<Patient>): Promise<ApiResponse<Patient>> {
    const cached = readCachedPatientProfile();
    const fallbackPatient = mapBackendPatientProfileToPatient(
      fallback || {},
      cached || fallback,
    );

    try {
      const res = await apiCall<unknown>("/api/patient/profile", {
        method: "GET",
      });
      const mapped = mapBackendPatientProfileToPatient(
        res.data,
        cached || fallbackPatient,
      );
      writeCachedPatientProfile(mapped);
      return { data: mapped, success: true };
    } catch (error) {
      if (cached) {
        return {
          data: cached,
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch patient profile",
        };
      }

      return {
        data: fallbackPatient,
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch patient profile",
      };
    }
  },

  async updateProfile(
    data: UpdatePatientProfileDto,
    fallback?: Partial<Patient>,
  ): Promise<ApiResponse<Patient>> {
    // Backend uses [FromForm] — must send multipart/form-data, NOT JSON.
    // Always fall back to existing patient values so required fields are never empty.
    const firstName =
      normalizePersonNameSegment(data.firstName) ||
      normalizePersonNameSegment(fallback?.firstName) ||
      "";
    const lastName =
      normalizePersonNameSegment(data.lastName) ||
      normalizePersonNameSegment(fallback?.lastName) ||
      "";
    const phone = data.phone?.trim() || fallback?.phone || "";
    const address = data.address?.trim() || fallback?.address || "";
    const gender = data.gender?.trim() || fallback?.gender || "other";
    const dateOfBirth =
      toOptionalIsoDate(data.dateOfBirth) ??
      toOptionalIsoDate(fallback?.dateOfBirth) ??
      "";

    const maybeFile = (data as Record<string, unknown>).profileImage;

    const buildFormData = (lastNameKey: "LastName" | "lastName") => {
      const formData = new FormData();
      // Match Swagger contract exactly; include a fallback key shape for
      // LastName because this endpoint can be case-sensitive in some builds.
      formData.append("FirstName", firstName);
      formData.append(lastNameKey, lastName);
      formData.append("Phone", phone);
      formData.append("Address", address);
      formData.append("Gender", gender);
      if (dateOfBirth) formData.append("DateOfBirth", dateOfBirth);
      if (maybeFile instanceof File) {
        formData.append("ProfileImage", maybeFile);
      }
      return formData;
    };

    // Send FormData directly (bypass apiCall's JSON Content-Type header).
    // The browser sets "multipart/form-data; boundary=..." automatically.
    const token = getAuthToken();
    const cleanToken = token ? token.replace(/^Bearer\s+/i, "") : "";

    const sendUpdate = (lastNameKey: "LastName" | "lastName") =>
      fetch(`${BASE_URL}/api/patient/profile`, {
        method: "PUT",
        mode: "cors",
        credentials: "omit",
        headers: cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {},
        body: buildFormData(lastNameKey),
      });

    let putResponse = await sendUpdate("LastName");

    // Backend compatibility fallback: some deployments bind this field using
    // camelCase `lastName` instead of `LastName` and return 500 otherwise.
    if (!putResponse.ok && putResponse.status >= 500) {
      const retryResponse = await sendUpdate("lastName");
      if (retryResponse.ok) {
        putResponse = retryResponse;
      } else {
        putResponse = retryResponse;
      }
    }

    if (!putResponse.ok) {
      const text = await putResponse.text();
      let errorMsg = `${putResponse.status} ${putResponse.statusText}`;
      try {
        const json = JSON.parse(text);
        if (json?.errors) {
          errorMsg = (Object.values(json.errors) as string[][])
            .flat()
            .join("; ");
        } else if (json?.message) {
          errorMsg = json.message;
        } else if (typeof json === "string") {
          errorMsg = json;
        }
      } catch {
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    const refreshed = await this.getProfile(fallback);
    if (refreshed.success) return refreshed;

    const mergedFallback = mapBackendPatientProfileToPatient(
      {
        ...(fallback || {}),
        firstName: firstName || fallback?.firstName,
        lastName: lastName || fallback?.lastName,
        phone: phone || fallback?.phone,
        address: address || fallback?.address,
        gender: gender || fallback?.gender,
        dateOfBirth: dateOfBirth || fallback?.dateOfBirth,
      },
      refreshed.data,
    );
    writeCachedPatientProfile(mergedFallback);
    return { data: mergedFallback, success: true };
  },

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

function readCachedPatientProfile(): Patient | null {
  try {
    const raw = localStorage.getItem("patient_profile_cache");
    if (!raw) return null;
    return JSON.parse(raw) as Patient;
  } catch {
    return null;
  }
}

function writeCachedPatientProfile(profile: Patient): void {
  try {
    localStorage.setItem("patient_profile_cache", JSON.stringify(profile));
  } catch (error) {
    console.warn("[patientService] Failed to cache patient profile", error);
  }
}

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
    // NOTE: The backend does NOT expose a GET /api/admin/patients endpoint.
    // The only admin patient endpoint is POST /api/admin/CreatePatients.
    // We derive the patient list from the appointments data instead.

    let lastError: unknown = null;

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
        const nestedPatient = (appointment?.patient ||
          appointment?.patientDTO) as Record<string, unknown> | undefined;

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

  /**
   * Create a new patient (admin)
   * POST /api/admin/CreatePatients
   * Expects CreatePatientByAdminDTO: { fullName, phoneNumber, email }
   */
  async create(data: {
    fullName: string;
    email: string;
    phoneNumber?: string;
  }): Promise<ApiResponse<Patient>> {
    try {
      const res = await apiCall<unknown>("/api/admin/CreatePatients", {
        method: "POST",
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email,
          phoneNumber: data.phoneNumber ?? "",
        }),
      });
      return {
        data: adminPatientService.mapBackendToPatient(res.data ?? {}),
        success: true,
        message: "Patient created successfully",
      };
    } catch (error) {
      console.error("[adminPatientService.create] Error:", error);
      return { data: {} as Patient, success: false };
    }
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

      const hasMissingDoctorDetails = appointments.some((appointment) => {
        const firstName = appointment.doctor?.firstName?.trim();
        const lastName = appointment.doctor?.lastName?.trim();
        return !(firstName || lastName) && Boolean(appointment.doctorId);
      });

      if (hasMissingDoctorDetails) {
        try {
          const doctorsRes = await doctorService.getAll();
          const doctorsById = new Map<string, Doctor>();
          (doctorsRes.data || []).forEach((doctor) => {
            const key = normalizeLookupKey(doctor.id);
            if (key) doctorsById.set(key, doctor);
          });

          const enrichedAppointments = appointments.map((appointment) => {
            const lookupKey = normalizeLookupKey(appointment.doctorId);
            const matchedDoctor = lookupKey
              ? doctorsById.get(lookupKey)
              : undefined;
            if (!matchedDoctor) return appointment;

            const firstName = appointment.doctor?.firstName?.trim();
            const lastName = appointment.doctor?.lastName?.trim();
            if (firstName || lastName) return appointment;

            return {
              ...appointment,
              doctor: matchedDoctor,
              doctorId: appointment.doctorId || matchedDoctor.id,
            };
          });

          return { data: enrichedAppointments, success: true };
        } catch {
          // Keep base appointment data if doctor lookup fails.
        }
      }

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
    // Extract numeric dentist ID
    let doctorId: number = 1;
    const doctorIdStr = data.doctorId?.toString() ?? "";
    if (!isNaN(Number(doctorIdStr))) {
      doctorId = Number(doctorIdStr);
    } else {
      const numericMatch = doctorIdStr.match(/\d+/);
      if (numericMatch) doctorId = Number(numericMatch[0]);
    }

    // Extract numeric patient ID
    let patientId: number | undefined;
    const patientIdStr = data.patientId?.toString() ?? "";
    if (
      patientIdStr &&
      !isNaN(Number(patientIdStr)) &&
      Number(patientIdStr) > 0
    ) {
      patientId = Number(patientIdStr);
    }
    // Fallback: read numeric PatientId from the JWT token.
    // Do NOT use a regex to extract digits from a GUID — that produces a
    // wrong numeric ID (e.g., "1" extracted from "a1b2c3d4-…") and causes
    // the backend to link the appointment to the wrong patient, which then
    // makes the payment intent fail with "Cannot read properties of
    // undefined (reading 'patientId')".
    if (patientId === undefined) {
      const rawTok = localStorage.getItem("auth_token");
      const cleanTok = rawTok?.replace(/^Bearer\s+/i, "") ?? null;
      const tokenPatId = extractPatientIdFromToken(cleanTok);
      if (tokenPatId && !isNaN(Number(tokenPatId)) && Number(tokenPatId) > 0) {
        patientId = Number(tokenPatId);
      }
    }

    // Build date as local ISO date-time string (no UTC conversion).
    // Using .toISOString() would shift midnight local time backwards into the
    // previous UTC day for Egypt (UTC+2/+3), causing the backend to see the
    // wrong date and reject with "Doctor is not available on this day".
    const dateIso = data.date
      ? `${data.date}T00:00:00`
      : new Date().toISOString();

    // Build startTime as time-span string "HH:mm:ss"
    const startTime = data.time
      ? data.time.includes(":") && data.time.split(":").length === 2
        ? `${data.time}:00`
        : data.time
      : "09:00:00";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dto: any = {
      doctorId,
      date: dateIso,
      startTime,
      // Use the service price passed through from the caller (via extra field on data).
      // Fall back to 0 only if no price is available — a 0-amount PaymentIntent
      // will be rejected by Stripe and cause a 500 on the payment endpoint.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      amount: (data as any).price ?? (data as any).amount ?? 0,
      paymentMethod: "Cash",
      paymentIntentId: null,
    };

    if (patientId !== undefined) dto.patientId = patientId;

    const token = getAuthToken();
    const patientIdFromToken = token ? extractPatientIdFromToken(token) : null;

    console.debug("[appointmentService.create] Booking appointment:", {
      dto,
      patientIdFromToken,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiCall<any>("/api/PatientAppointment/BookAppointment", {
      method: "POST",
      body: JSON.stringify(dto),
    });

    // Backend may return: a plain object { id: 5, ... }, { appointmentId: 5, ... },
    // a plain integer (the new appointment ID), a message string, or an empty body.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = res.data;
    console.debug("[appointmentService.create] Raw backend response:", {
      raw,
      rawType: typeof raw,
      rawJSON: JSON.stringify(raw),
    });

    const appointmentData = raw && typeof raw === "object" ? raw : {};

    // Extract raw numeric ID — check every plausible field name.
    let rawId: number | null = null;
    if (typeof raw === "number" && raw > 0) {
      rawId = raw;
    } else if (typeof appointmentData === "object") {
      const candidate =
        appointmentData.id ??
        appointmentData.appointmentId ??
        appointmentData.appointmentID ??
        appointmentData.Id ??
        appointmentData.AppointmentId;
      if (
        candidate != null &&
        !isNaN(Number(candidate)) &&
        Number(candidate) > 0
      ) {
        rawId = Number(candidate);
      }
    }

    console.debug("[appointmentService.create] Extracted rawId:", rawId);

    const mapped = appointmentService.mapBackendToAppointment(
      appointmentData,
      data,
    );
    if (rawId) mapped.id = String(rawId);

    return {
      data: mapped,
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

    // Prefer the dedicated startTime field from the backend (e.g. "09:00:00")
    // over the time derived from the date column (which is often stored as T00:00:00).
    const rawStartTime: string =
      item.startTime || item.start_time || item.StartTime || "";
    if (rawStartTime) {
      // Normalise "HH:mm:ss" or "HH:mm" → "HH:mm"
      time = rawStartTime.substring(0, 5);
    }

    // Extract doctor info - handle nested doctor object
    const doctorId = String(
      item.dentistId ||
        item.dentistID ||
        item.doctorId ||
        item.doctorID ||
        item.doctor?.id ||
        item.doctor?.doctorId ||
        item.doctor?.dentistId ||
        fallback?.doctorId ||
        "",
    );

    // Build doctor from flat doctorName payloads (mirrors patientName handling)
    const rawDoctorName = String(
      item.doctorName ||
        item.doctor_name ||
        item.doctorFullName ||
        item.dentistName ||
        item.dentist_name ||
        item.dentistFullName ||
        item.doctor?.name ||
        item.dentist?.name ||
        "",
    ).trim();
    const { firstName: doctorFirstName, lastName: doctorLastName } =
      splitDoctorName(rawDoctorName || null);
    const doctorIdFromName = rawDoctorName
      ? `doctor-${rawDoctorName.toLowerCase().replace(/\s+/g, "-")}`
      : "";

    // Map doctor object if it exists in the backend response
    const doctorObj =
      item.doctor || item.dentist || item.doctorDTO || item.dentistDTO;
    const mappedDoctor = doctorObj
      ? {
          id: String(
            doctorObj.id ||
              doctorObj.doctorId ||
              doctorObj.dentistId ||
              doctorObj.userId ||
              "",
          ),
          email: doctorObj.email || "",
          firstName:
            doctorObj.firstName ||
            doctorObj.first_name ||
            splitDoctorName(doctorObj.name || doctorObj.fullName || "")
              .firstName,
          lastName:
            doctorObj.lastName ||
            doctorObj.last_name ||
            splitDoctorName(doctorObj.name || doctorObj.fullName || "")
              .lastName,
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
      : rawDoctorName
        ? {
            id: String(
              item.doctorId ||
                item.doctorID ||
                item.dentistId ||
                item.dentistID ||
                doctorIdFromName,
            ),
            email: "",
            firstName: doctorFirstName,
            lastName: doctorLastName,
            phone: "",
            avatar: "",
            role: "doctor" as const,
            specialty: "general" as const,
            qualifications: [],
            experience: 0,
            bio: "",
            consultationFee: 0,
            rating: 0,
            reviewCount: 0,
            availableSlots: [],
            workingDays: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : undefined;

    // Map service object if it exists in the backend response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceObj = item.service ? (item.service as any) : undefined;
    const rawServiceName = String(
      item.serviceName ||
        item.service_name ||
        item.specializationName ||
        item.specialtyName ||
        "",
    ).trim();
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
      : rawServiceName
        ? {
            id: String(
              item.serviceId || `service-${rawServiceName.toLowerCase()}`,
            ),
            name: rawServiceName,
            description: "",
            icon: "stethoscope",
            specialty: "general",
            duration: 30,
            price: 0,
            image: undefined,
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

    // Build doctor from flat doctorName payloads (mirrors patientName handling)
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
      doctorId:
        doctorId || mappedDoctor?.id || String(fallback?.doctorId || ""),
      doctor: mappedDoctor,
      serviceId: String(
        item.serviceId || item.service?.id || fallback?.serviceId || "",
      ),
      service: mappedService,
      date: date || fallback?.date || formatDateTimeInEgypt(new Date()).date,
      time: time || fallback?.time || "00:00",
      duration: item.duration || fallback?.duration || 30,
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

// Specialization lookup — returns raw { id, name } pairs from the backend
export const specializationService = {
  async getAll(): Promise<ApiResponse<{ id: number; name: string }[]>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiCall<any[]>("/api/Lookup/Specializations", {
        method: "GET",
      });
      if (res.data && Array.isArray(res.data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = (res.data as any[]).map((s: any) => ({
          id: Number(s.id),
          name: String(s.name ?? ""),
        }));
        return { data: items, success: true };
      }
    } catch {
      // non-critical
    }
    return { data: [], success: false };
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
          image: resolveBackendAssetUrl(spec.imageUrl ?? spec.image),
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
function parseReviewNumericId(value: string): number | null {
  return parseEntityNumericId(value);
}

function parseDoctorNumericId(value: string): number | null {
  return parseEntityNumericId(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendToReview(item: any): Review {
  const reviewId = item.reviewId ?? item.id ?? item.reviewID;
  const doctorId = item.doctorId ?? item.doctorID ?? item.doctor?.id;
  const patientId = item.patientId ?? item.patientID ?? item.patient?.id ?? "";
  const rawDoctorName = String(
    item.doctorName ?? item.doctor_name ?? item.doctorFullName ?? "",
  ).trim();
  const rawPatientName = String(
    item.patientName ?? item.patient_name ?? item.patientFullName ?? "",
  ).trim();
  const { firstName: doctorFirstName, lastName: doctorLastName } =
    splitDoctorName(rawDoctorName || null);
  const { firstName: patientFirstName, lastName: patientLastName } = splitName(
    rawPatientName || null,
  );
  const doctorObj = item.doctor;
  const patientObj = item.patient;
  const createdAt = String(
    item.createdAt ?? item.createdDate ?? item.date ?? new Date().toISOString(),
  );
  const updatedAt = String(item.updatedAt ?? item.updatedDate ?? createdAt);

  const mappedDoctor =
    doctorObj && typeof doctorObj === "object"
      ? {
          id: String(doctorObj.id || doctorObj.doctorId || doctorId || ""),
          email: String(doctorObj.email || ""),
          firstName: String(doctorObj.firstName || doctorObj.first_name || ""),
          lastName: String(doctorObj.lastName || doctorObj.last_name || ""),
          phone: String(doctorObj.phone || doctorObj.phoneNumber || ""),
          avatar: String(doctorObj.avatar || doctorObj.profileImage || ""),
          role: "doctor" as const,
          specialty: normalizeSpecialty(doctorObj.specialty),
          qualifications: [],
          experience: toSafeNumber(doctorObj.experience),
          bio: String(doctorObj.bio || ""),
          consultationFee: toSafeNumber(doctorObj.consultationFee),
          rating: toSafeNumber(doctorObj.rating),
          reviewCount: toSafeNumber(doctorObj.reviewCount),
          availableSlots: [],
          workingDays: [],
          createdAt,
          updatedAt,
        }
      : rawDoctorName || doctorId
        ? {
            id: String(doctorId ?? ""),
            email: "",
            firstName: doctorFirstName,
            lastName: doctorLastName,
            phone: "",
            avatar: "",
            role: "doctor" as const,
            specialty: "general" as const,
            qualifications: [],
            experience: 0,
            bio: "",
            consultationFee: 0,
            rating: 0,
            reviewCount: 0,
            availableSlots: [],
            workingDays: [],
            createdAt,
            updatedAt,
          }
        : undefined;

  const mappedPatient =
    patientObj && typeof patientObj === "object"
      ? {
          id: String(patientObj.id || patientObj.patientId || patientId || ""),
          email: String(patientObj.email || ""),
          firstName: String(
            patientObj.firstName || patientObj.first_name || "",
          ),
          lastName: String(patientObj.lastName || patientObj.last_name || ""),
          phone: String(patientObj.phone || patientObj.phoneNumber || ""),
          avatar: String(patientObj.avatar || patientObj.profileImage || ""),
          role: "patient" as const,
          dateOfBirth: String(patientObj.dateOfBirth || ""),
          gender: "other" as const,
          address: String(patientObj.address || ""),
          createdAt,
          updatedAt,
        }
      : rawPatientName
        ? {
            id: String(patientId || ""),
            email: "",
            firstName: patientFirstName,
            lastName: patientLastName,
            phone: "",
            avatar: "",
            role: "patient" as const,
            dateOfBirth: "",
            gender: "other" as const,
            address: "",
            createdAt,
            updatedAt,
          }
        : undefined;

  return {
    id:
      reviewId != null && String(reviewId).trim() !== ""
        ? String(reviewId)
        : "",
    patientId: patientId != null ? String(patientId) : "",
    patient: mappedPatient,
    doctorId: doctorId != null ? String(doctorId) : "",
    doctor: mappedDoctor,
    appointmentId:
      item.appointmentId != null
        ? String(item.appointmentId)
        : item.appointmentID != null
          ? String(item.appointmentID)
          : undefined,
    rating: Math.min(5, Math.max(0, toSafeNumber(item.rating))),
    comment: String(item.comment ?? item.reviewComment ?? item.text ?? ""),
    createdAt,
    updatedAt,
    helpful: toSafeNumber(item.helpful ?? item.helpfulCount),
  };
}

function mapReviewListResponse(raw: unknown): Review[] {
  return extractApiArray(raw).map((item) => mapBackendToReview(item));
}

function enrichReviewsWithDoctors(
  reviews: Review[],
  doctors: Doctor[],
): Review[] {
  const doctorsById = new Map<string, Doctor>();
  doctors.forEach((doctor) => {
    const key = normalizeLookupKey(doctor.id);
    if (key) doctorsById.set(key, doctor);
  });

  return reviews.map((review) => {
    if (review.doctor?.firstName || review.doctor?.lastName) return review;
    const matched = doctorsById.get(normalizeLookupKey(review.doctorId));
    return matched ? { ...review, doctor: matched } : review;
  });
}

export function isBackendReviewId(id: string): boolean {
  return parseReviewNumericId(id) !== null;
}

export const reviewService = {
  /**
   * GET /api/PatientReviews/GetMyReviews
   */
  async getMyReviews(): Promise<ApiResponse<Review[]>> {
    try {
      const res = await apiCall<unknown>("/api/PatientReviews/GetMyReviews", {
        method: "GET",
      });
      const reviews = mapReviewListResponse(res.data);
      return { data: reviews, success: true };
    } catch (error) {
      console.error("[reviewService.getMyReviews] Error:", error);
      return {
        data: [],
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch reviews",
      };
    }
  },

  /**
   * GET /api/PatientReviews/GetMyReviewsForDoctor/{doctorId}
   */
  async getReviewsForDoctor(doctorId: string): Promise<ApiResponse<Review[]>> {
    const numericDoctorId = parseDoctorNumericId(doctorId);
    if (!numericDoctorId) {
      return {
        data: [],
        success: false,
        message: `Invalid doctor ID: "${doctorId}"`,
      };
    }

    try {
      const res = await apiCall<unknown>(
        `/api/PatientReviews/GetMyReviewsForDoctor/${numericDoctorId}`,
        { method: "GET" },
      );
      const reviews = mapReviewListResponse(res.data);
      return { data: reviews, success: true };
    } catch (error) {
      console.error(
        "[reviewService.getReviewsForDoctor] Error for doctor",
        doctorId,
        error,
      );
      return {
        data: [],
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch reviews",
      };
    }
  },

  /**
   * POST /api/PatientReviews/AddReview
   */
  async addReview(data: {
    doctorId: string;
    appointmentId: string;
    rating: number;
    comment: string;
  }): Promise<ApiResponse<Review>> {
    try {
      const numericDoctorId = parseDoctorNumericId(data.doctorId);
      const numericAppointmentId = parseEntityNumericId(data.appointmentId);

      if (!numericDoctorId) {
        throw new Error(`Invalid doctor ID: "${data.doctorId}"`);
      }
      if (!numericAppointmentId) {
        throw new Error(`Invalid appointment ID: "${data.appointmentId}"`);
      }

      const payload: AddReviewDTO = {
        doctorId: numericDoctorId,
        appointmentId: numericAppointmentId,
        rating: data.rating,
        comment: data.comment?.trim() || null,
      };

      await apiCall<unknown>("/api/PatientReviews/AddReview", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const refreshed = await reviewService.getMyReviews();
      const matched = (refreshed.data || []).find((review) => {
        const reviewDoctorId = parseDoctorNumericId(review.doctorId);
        const reviewAppointmentId = review.appointmentId
          ? parseEntityNumericId(review.appointmentId)
          : null;
        return (
          reviewDoctorId === numericDoctorId &&
          (reviewAppointmentId === numericAppointmentId || !reviewAppointmentId)
        );
      });

      return {
        data: matched || ({} as Review),
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
   * PUT /api/PatientReviews/UpdateReview/{reviewId}
   */
  async updateReview(
    reviewId: string,
    data: { rating: number; comment: string },
  ): Promise<ApiResponse<Review>> {
    const numericReviewId = parseReviewNumericId(reviewId);
    if (!numericReviewId) {
      return {
        data: {} as Review,
        success: false,
        message: `Invalid review ID: "${reviewId}"`,
      };
    }

    try {
      const payload: UpdateReviewDTO = {
        rating: data.rating,
        comment: data.comment?.trim() || null,
      };

      await apiCall<unknown>(
        `/api/PatientReviews/UpdateReview/${numericReviewId}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );

      const refreshed = await reviewService.getMyReviews();
      const matched = (refreshed.data || []).find(
        (review) => String(review.id) === String(numericReviewId),
      );

      return {
        data:
          matched ||
          ({
            id: String(numericReviewId),
            rating: data.rating,
            comment: data.comment,
            patientId: "",
            doctorId: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Review),
        success: true,
        message: "Review updated successfully",
      };
    } catch (error) {
      console.error(
        "[reviewService.updateReview] Error for review",
        reviewId,
        error,
      );
      return {
        data: {} as Review,
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update review",
      };
    }
  },

  /**
   * DELETE /api/PatientReviews/DeleteReview/{reviewId}
   */
  async deleteReview(reviewId: string): Promise<ApiResponse<void>> {
    const numericReviewId = parseReviewNumericId(reviewId);
    if (!numericReviewId) {
      return {
        data: undefined,
        success: false,
        message: `Invalid review ID: "${reviewId}"`,
      };
    }

    try {
      await apiCall(`/api/PatientReviews/DeleteReview/${numericReviewId}`, {
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
      return {
        data: undefined,
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to delete review",
      };
    }
  },

  enrichReviewsWithDoctors,
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
    // Log every unique set of keys once so we can see what the backend actually returns
    console.debug("[mapBackendToDoctor] raw doc keys:", Object.keys(doc), doc);

    const isEmail = (v?: string | null) =>
      typeof v === "string" && v.includes("@");

    // Try every plausible name field the backend might return
    // displayName takes priority — it's what the admin updates via PUT
    const rawName =
      (!isEmail(doc.displayName) && doc.displayName ? doc.displayName : null) ??
      (!isEmail(doc.fullName) && doc.fullName ? doc.fullName : null) ??
      (!isEmail(doc.name) && doc.name ? doc.name : null) ??
      (!isEmail(doc.userName) && doc.userName ? doc.userName : null) ??
      (doc.firstName || doc.lastName
        ? `${doc.firstName ?? ""} ${doc.lastName ?? ""}`.trim() || null
        : null) ??
      // Last resort: derive from email ("john.smith@x.com" → "John Smith")
      (doc.email
        ? doc.email
            .split("@")[0]
            .split(/[._\-+]/)
            .map(
              (p: string) =>
                String(p).charAt(0).toUpperCase() +
                String(p).slice(1).toLowerCase(),
            )
            .join(" ")
        : null);

    const { firstName, lastName } = splitName(rawName);

    return {
      id: String(doc.id ?? ""),
      email: doc.email ?? "",
      phone: doc.phone ?? doc.phoneNumber ?? "",
      firstName: doc.firstName ?? firstName,
      lastName: doc.lastName ?? lastName,
      avatar: doc.avatar ?? doc.imageUrl ?? doc.profileImage,
      role: "doctor" as const,
      specialty: normalizeSpecialty(
        doc.specialty ?? doc.specializationName ?? doc.specialityName,
      ),
      qualifications: doc.qualifications ?? [],
      // yearsOfExperience is the canonical backend field; fall back to workingHours
      experience:
        doc.yearsOfExperience ?? doc.experience ?? doc.workingHours ?? 0,
      bio: doc.bio ?? "",
      // consultationFee is returned directly; salary is the backend storage name
      consultationFee: doc.consultationFee ?? doc.salary ?? 0,
      averageRating: doc.averageRating ?? doc.rating ?? 0,
      totalReviews: doc.totalReviews ?? doc.reviewCount ?? 0,
      rating: doc.averageRating ?? doc.rating ?? 0,
      reviewCount: doc.totalReviews ?? doc.reviewCount ?? 0,
      availableSlots: doc.availableSlots ?? [],
      workingDays: doc.workingDays ?? [],
      isActive:
        typeof doc.isActive === "boolean"
          ? doc.isActive
          : doc.status
            ? String(doc.status).toLowerCase() !== "inactive"
            : true,
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
      throw error; // propagate so UI shows error toast instead of silent empty list
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;

      // Build payload matching CreateDoctorDto exactly
      const password = (d.password as string | undefined)?.trim();
      if (!password) {
        throw new Error("Password is required and cannot be empty");
      }
      const specialityID =
        Number(d.specialityID) > 0 ? Number(d.specialityID) : undefined;
      if (!specialityID) {
        throw new Error("A valid specialty must be selected");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        fullName: (d.fullName as string | undefined)?.trim() ?? "",
        email: (d.email as string | undefined)?.trim() ?? "",
        password,
        salary: Math.max(0, Number(d.salary ?? 0)),
        workingHours: Math.max(0, Number(d.workingHours ?? 0)),
        hiringDate: d.hiringDate ?? new Date().toISOString(),
        specialityID,
        gender: (d.gender as string | undefined)?.trim() ?? "",
        address: (d.address as string | undefined)?.trim() ?? "",
      };

      console.debug("[adminDoctorService.create] Sending payload:", payload);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      const specialityID =
        Number(d.specialityID) > 0 ? Number(d.specialityID) : undefined;
      if (!specialityID) {
        throw new Error("A valid specialty must be selected");
      }

      // Build payload matching UpdateDoctorDto exactly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        displayName: (d.fullName as string | undefined)?.trim() || undefined,
        salary: Math.max(0, Number(d.salary ?? 0)),
        workingHours: Math.max(0, Number(d.workingHours ?? 0)),
        specialityID,
      };

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
    console.debug(
      "[adminAppointmentService.getAll] ✅ Mapped appointments:",
      appointments.length,
    );
    return { data: appointments, success: true };
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
   * Uses CreateAppointmentByAdminDTO: doctorID, patientID, date, startTime, amount, paymentMethod
   */
  async create(payload: {
    doctorID: number;
    patientID: number;
    date: string; // ISO date-time
    startTime: string; // "HH:mm:ss"
    amount: number;
    paymentMethod: "Cash" | "Visa";
    paymentStatus?: string;
  }): Promise<ApiResponse<Appointment>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiCall<any>("/api/admin/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return {
      data: res.data
        ? appointmentService.mapBackendToAppointment(res.data)
        : ({} as Appointment),
      success: true,
      message: "Appointment created successfully",
    };
  },

  /**
   * Update appointment status
   * PATCH /api/admin/appointments/{id}/status
   * Body: AppointmentStatus enum string sent directly (not wrapped in object)
   * Backend enum values: Pending | Approved | Rejected | Completed | Cancelled
   */
  async updateStatus(
    id: string,
    status: string,
  ): Promise<ApiResponse<Appointment>> {
    // Map frontend status values to backend enum (capitalized)
    const statusMap: Record<string, string> = {
      complete: "Completed",
      completed: "Completed",
      upcoming: "Approved",
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      cancelled: "Cancelled",
      canceled: "Cancelled",
    };
    const backendStatus =
      statusMap[status.toLowerCase()] ??
      status.charAt(0).toUpperCase() + status.slice(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiCall<any>(`/api/admin/appointments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(backendStatus), // plain enum string, NOT { status: ... }
    });
    return {
      data: res.data
        ? appointmentService.mapBackendToAppointment(res.data)
        : ({} as Appointment),
      success: true,
      message: "Appointment status updated",
    };
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

// ============================================================
// NOTIFICATION SERVICE
// ============================================================

export interface BackendNotification {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Notification Management
 * GET /api/Notification
 * POST /api/Notification/mark-as-read/{id}
 */
export const notificationService = {
  /**
   * Get all notifications for the current user
   * GET /api/Notification
   */
  async getAll(): Promise<ApiResponse<BackendNotification[]>> {
    try {
      const res = await apiCall<BackendNotification[]>("/api/Notification", {
        method: "GET",
      });
      return { data: res.data || [], success: true };
    } catch (error) {
      console.error("[notificationService.getAll] Error:", error);
      return { data: [], success: false };
    }
  },

  /**
   * Mark a notification as read
   * POST /api/Notification/mark-as-read/{id}
   */
  async markAsRead(id: number): Promise<ApiResponse<void>> {
    try {
      await apiCall<void>(`/api/Notification/mark-as-read/${id}`, {
        method: "POST",
      });
      return { data: undefined, success: true };
    } catch (error) {
      console.error("[notificationService.markAsRead] Error:", error);
      return { data: undefined, success: false };
    }
  },
};

// ============================================================
// DOCTOR SCHEDULE SERVICE
// ============================================================

export interface DoctorSchedule {
  id?: number;
  doctorId?: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

/**
 * Doctor Schedule Management
 * GET /api/DoctorSchedule?doctorId=  — doctorId optional; falls back to JWT on backend
 * GET /api/DoctorSchedule/available-slots?date=&doctorId=  — same
 * POST /api/DoctorSchedule
 */
export const doctorScheduleService = {
  /**
   * Get a doctor's weekly schedule.
   * Pass doctorId when fetching another doctor's schedule (e.g. booking page).
   * Omit it when the logged-in doctor is fetching their own schedule (JWT-resolved on backend).
   * GET /api/DoctorSchedule?doctorId={id}
   */
  async getSchedule(doctorId?: string): Promise<ApiResponse<DoctorSchedule[]>> {
    try {
      const query = doctorId ? `?doctorId=${doctorId}` : "";
      const res = await apiCall<unknown>(`/api/DoctorSchedule${query}`, {
        method: "GET",
      });
      // API returns { value: DoctorSchedule[], Count: number } or a plain array
      const raw = res.data as { value?: DoctorSchedule[] } | DoctorSchedule[];
      const scheduleArray: DoctorSchedule[] = Array.isArray(raw)
        ? raw
        : ((raw as { value?: DoctorSchedule[] }).value ?? []);
      return { data: scheduleArray, success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : "";
      // 404 = no schedule entries yet — valid empty state, not a service failure
      if (
        msg.includes("no schedule") ||
        msg.includes("not found") ||
        msg.includes("404")
      ) {
        return { data: [], success: true };
      }
      console.error("[doctorScheduleService.getSchedule] Error:", error);
      return { data: [], success: false };
    }
  },

  /**
   * Get available time slots for a doctor on a given date.
   * Pass doctorId when called from the booking page (patient flow).
   * Omit it when the logged-in doctor is checking their own slots (JWT-resolved on backend).
   * GET /api/DoctorSchedule/available-slots?date=YYYY-MM-DD&doctorId={id}
   * Backend returns: Array<{ date: string; startTime: string; endTime: string; isAvailable: boolean }>
   * We extract startTime strings for available slots only.
   */
  async getAvailableSlots(
    doctorId: string,
    date: string,
  ): Promise<ApiResponse<string[]>> {
    try {
      // Send plain YYYY-MM-DD — the full datetime suffix (T00:00:00) was causing
      // the backend to return 500. The backend query-param is typed as date-time in
      // Swagger but it accepts a date-only string in practice.
      const datePart = date.includes("T") ? date.split("T")[0] : date;
      type SlotItem = {
        date: string;
        startTime: string;
        endTime: string;
        isAvailable: boolean;
      };
      // Pass doctorId as query param so the backend can find the right doctor's schedule.
      // The backend falls back to JWT when doctorId is absent.
      const doctorQuery = doctorId ? `&doctorId=${doctorId}` : "";
      const res = await apiCall<unknown>(
        `/api/DoctorSchedule/available-slots?date=${datePart}${doctorQuery}`,
        { method: "GET" },
      );
      // API returns { value: SlotItem[], Count: number } or a plain array
      const raw = res.data as { value?: SlotItem[] } | SlotItem[];
      const dataArray: SlotItem[] = Array.isArray(raw)
        ? raw
        : ((raw as { value?: SlotItem[] }).value ?? []);

      console.debug(
        "[getAvailableSlots] Raw slots from backend:",
        dataArray.map((s) => ({
          startTime: s.startTime,
          isAvailable: s.isAvailable,
        })),
      );

      const slots = dataArray
        .filter((s) => s.isAvailable)
        .map((s) => (s.startTime as string).slice(0, 5));
      return { data: slots, success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : "";
      // 404 = doctor has no schedule for that day — valid "no slots" response, not a service failure.
      // Return success with empty array so the UI shows "No available slots" instead of an error banner.
      if (
        msg.includes("no schedule") ||
        msg.includes("not found") ||
        msg.includes("404")
      ) {
        return { data: [], success: true };
      }
      console.error("[doctorScheduleService.getAvailableSlots] Error:", error);
      return { data: [], success: false };
    }
  },

  /**
   * Create a new schedule entry for a doctor (admin feature)
   * POST /api/DoctorSchedule
   */
  async create(data: DoctorSchedule): Promise<ApiResponse<DoctorSchedule>> {
    try {
      const res = await apiCall<DoctorSchedule>("/api/DoctorSchedule", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return {
        data: res.data,
        success: true,
        message: "Schedule created successfully",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[doctorScheduleService.create] Error:", message, error);
      return { data: {} as DoctorSchedule, success: false, message };
    }
  },

  /**
   * Delete a schedule entry
   * DELETE /api/DoctorSchedule/{id}
   */
  async remove(id: number): Promise<ApiResponse<void>> {
    try {
      await apiCall<void>(`/api/DoctorSchedule/${id}`, {
        method: "DELETE",
      });
      return {
        data: undefined,
        success: true,
        message: "Schedule removed successfully",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[doctorScheduleService.remove] Error:", message, error);
      return { data: undefined, success: false, message };
    }
  },
};
