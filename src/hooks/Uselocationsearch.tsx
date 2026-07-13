// useLocationSearch.ts
//
// مجموعة hooks مخصصة لأي مكوّن يحتاج بحث جغرافي مجاني بالكامل (Nominatim /
// OpenStreetMap) بدون أي مفتاح API مدفوع:
//   - useDebouncedValue     : تأخير عام لأي قيمة (قابل لإعادة الاستخدام في أي مكان)
//   - useNominatimSearch    : بحث نصي (autocomplete) مقيّد على مصر فقط
//   - useReverseGeocode     : تحويل lat/lng -> عنوان مقروء
//   - useCurrentLocation    : تغليف navigator.geolocation بواجهة Promise بسيطة
//
// كل الطلبات هنا تُلغى تلقائيًا (AbortController) لما تتغيّر أو المكوّن يتفكك،
// عشان ردود متأخرة (stale responses) متكتبش فوق نتيجة أحدث.

import { useCallback, useEffect, useRef, useState } from "react";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const EGYPT_COUNTRY_CODE = "eg";
const SEARCH_DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 2;

// ---------------------------------------------------------------------------
// useDebouncedValue — generic, no Nominatim-specific logic here on purpose.
// ---------------------------------------------------------------------------

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ---------------------------------------------------------------------------
// useNominatimSearch
// ---------------------------------------------------------------------------

export interface NominatimSuggestion {
  placeId: number;
  displayName: string;
  latitude: number;
  longitude: number;
  type?: string;
}

interface NominatimSearchRawItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}

function mapRawSuggestion(raw: NominatimSearchRawItem): NominatimSuggestion {
  return {
    placeId: raw.place_id,
    displayName: raw.display_name,
    latitude: Number(raw.lat),
    longitude: Number(raw.lon),
    type: raw.type,
  };
}

/**
 * Debounced (~500ms) free-text place search restricted to Egypt
 * (countrycodes=eg), matching pharmacies/hospitals/streets/malls/shops/
 * landmarks by name since Nominatim indexes OSM POIs of all these kinds.
 *
 * NOTE: Nominatim's public usage policy caps unauthenticated traffic at
 * ~1 request/second and asks that requests identify the calling app. This
 * hook's debounce keeps us well under that limit for a single admin typing;
 * if this ever needs to scale to many concurrent admins, proxy these calls
 * through your own backend instead of calling nominatim.openstreetmap.org
 * directly from the browser.
 */
export function useNominatimSearch(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel whatever the previous debounced value kicked off.
    abortControllerRef.current?.abort();

    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const run = async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams({
          format: "jsonv2",
          q: debouncedQuery,
          countrycodes: EGYPT_COUNTRY_CODE,
          addressdetails: "0",
          limit: "6",
        });
        const res = await fetch(
          `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        );
        if (!res.ok) throw new Error(`Nominatim search failed (${res.status})`);
        const data = (await res.json()) as NominatimSearchRawItem[];
        if (controller.signal.aborted) return;
        setSuggestions(data.map(mapRawSuggestion));
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[useNominatimSearch] search failed:", err);
        setSearchError("تعذر إتمام البحث، حاول مرة أخرى");
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    };

    void run();

    return () => controller.abort();
  }, [debouncedQuery]);

  // Belt-and-braces cleanup on unmount.
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  return { suggestions, isSearching, searchError, clearSuggestions };
}

// ---------------------------------------------------------------------------
// useReverseGeocode
// ---------------------------------------------------------------------------

interface NominatimReverseRaw {
  display_name?: string;
  error?: string;
}

/**
 * One-shot reverse geocode (lat/lng -> human-readable address). Shared by
 * map clicks, marker drags, and "use my location" so they all resolve
 * addresses the same way. Each call cancels any reverse-geocode request
 * still in flight from a previous click/drag.
 */
export function useReverseGeocode() {
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string | null> => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsResolving(true);
      setResolveError(null);
      try {
        const params = new URLSearchParams({
          format: "jsonv2",
          lat: String(lat),
          lon: String(lng),
        });
        const res = await fetch(
          `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        );
        if (!res.ok)
          throw new Error(`Nominatim reverse failed (${res.status})`);
        const data = (await res.json()) as NominatimReverseRaw;
        if (data.error) throw new Error(data.error);
        return data.display_name ?? null;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError")
          return null;
        console.error("[useReverseGeocode] reverse geocode failed:", err);
        setResolveError("تعذر تحديد العنوان لهذا الموقع");
        return null;
      } finally {
        setIsResolving(false);
      }
    },
    [],
  );

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  return { reverseGeocode, isResolving, resolveError };
}

// ---------------------------------------------------------------------------
// useCurrentLocation
// ---------------------------------------------------------------------------

export interface CurrentLocationResult {
  latitude: number;
  longitude: number;
}

/**
 * Wraps navigator.geolocation.getCurrentPosition in a promise + loading/error
 * state so "Use current location" stays a one-liner in the component.
 */
export function useCurrentLocation() {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const getCurrentLocation =
    useCallback((): Promise<CurrentLocationResult | null> => {
      if (!navigator.geolocation) {
        setLocationError("المتصفح لا يدعم تحديد الموقع الجغرافي");
        return Promise.resolve(null);
      }

      setIsLocating(true);
      setLocationError(null);

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setIsLocating(false);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            setIsLocating(false);
            console.error("[useCurrentLocation] geolocation error:", error);
            setLocationError(
              error.code === error.PERMISSION_DENIED
                ? "تم رفض إذن الوصول لتحديد الموقع"
                : "تعذر تحديد موقعك الحالي",
            );
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      });
    }, []);

  return { getCurrentLocation, isLocating, locationError };
}
