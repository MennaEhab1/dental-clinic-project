import type { Patient } from "@/types";

const PATIENT_PROFILE_CACHE_KEY = "patient_profile_cache";

export interface PatientProfileCacheOwner {
  id?: string | null;
  userId?: string | null;
  email?: string | null;
}

type ScopedPatientProfileCache = {
  ownerKey: string;
  profile: Patient;
};

function normalizeValue(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildOwnerKey(owner?: PatientProfileCacheOwner | null): string {
  if (!owner) return "";
  const id = normalizeValue(owner.id || owner.userId);
  if (id) return `id:${id}`;

  const email = normalizeValue(owner.email);
  if (email) return `email:${email}`;

  return "";
}

function profileMatchesOwner(profile: Patient, ownerKey: string): boolean {
  if (!ownerKey) return false;

  const profileId = normalizeValue(String(profile.id || ""));
  const profileEmail = normalizeValue(profile.email);

  if (ownerKey.startsWith("id:")) {
    return ownerKey === `id:${profileId}`;
  }

  if (ownerKey.startsWith("email:")) {
    return ownerKey === `email:${profileEmail}`;
  }

  return false;
}

function isScopedPayload(value: unknown): value is ScopedPatientProfileCache {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ScopedPatientProfileCache>;
  return (
    typeof payload.ownerKey === "string" &&
    !!payload.profile &&
    typeof payload.profile === "object"
  );
}

export function readPatientProfileCache(
  owner?: PatientProfileCacheOwner | null,
): Patient | null {
  const ownerKey = buildOwnerKey(owner);
  if (!ownerKey) return null;

  try {
    const raw = localStorage.getItem(PATIENT_PROFILE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;

    if (isScopedPayload(parsed)) {
      return parsed.ownerKey === ownerKey ? parsed.profile : null;
    }

    // Backward-compatible read for the old unscoped cache format.
    const legacyProfile = parsed as Patient;
    return profileMatchesOwner(legacyProfile, ownerKey) ? legacyProfile : null;
  } catch {
    return null;
  }
}

export function writePatientProfileCache(
  owner: PatientProfileCacheOwner | null | undefined,
  profile: Patient,
): void {
  const ownerKey = buildOwnerKey(owner);
  if (!ownerKey) return;

  try {
    const payload: ScopedPatientProfileCache = { ownerKey, profile };
    localStorage.setItem(PATIENT_PROFILE_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("[patientProfileCache] Failed to write cache", error);
  }
}
