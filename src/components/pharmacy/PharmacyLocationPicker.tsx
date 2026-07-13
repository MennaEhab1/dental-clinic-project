// PharmacyLocationPicker.tsx
//
// النسخة المطوّرة من ماب اختيار موقع الصيدلية. اتشالت من جوا AdminPharmacy.tsx
// لملف مستقل عشان الملف الأصلي يفضل زي ما هو (منطق الـ CRUD ماتغيرش خالص).
//
// المطلوب اتنفذ هنا بالكامل:
//   1. Carto Voyager tiles بدل OSM الافتراضي (مجاني، من غير API key، وبيبين
//      POIs زي الصيدليات والمستشفيات والمولات أوضح).
//   2. صندوق بحث فوق الماب (Nominatim Search API — مجاني).
//   3. Autocomplete أثناء الكتابة.
//   4. اختيار اقتراح -> تحريك الماب + zoom 17 + تحريك المؤشر + تحديث lat/lng.
//   5. Reverse geocoding عند: الضغط على الماب / سحب المؤشر / اختيار نتيجة بحث.
//   6. مؤشر قابل للسحب (draggable marker).
//   7. زرار "استخدم موقعي الحالي".
//   8. Debounce ~500ms (متكفّل بيه useNominatimSearch من useLocationSearch.ts).
//   9. تقييد البحث على مصر فقط (countrycodes=eg).
//  10. Loading spinner + تعطيل اختيار النتائج أثناء التحميل.
//  11. إلغاء أي طلب بحث/reverse قديم (AbortController) — متكفّل بيه الـ hooks.

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { type Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";

import {
  useCurrentLocation,
  useNominatimSearch,
  useReverseGeocode,
  type NominatimSuggestion,
} from "@/hooks/Uselocationsearch";

// Leaflet's default marker icon paths break under bundlers (Vite/webpack)
// because they're resolved relative to the CSS, not the JS module — this
// re-points them at the bundled asset URLs. Safe to run once at module load.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Fallback center when a pharmacy has no coordinates yet.
const TANTA_COORDS: [number, number] = [30.7865, 31.0004];
const AUTOCOMPLETE_SELECT_ZOOM = 17;

// Carto Voyager — still 100% free / no API key, built on OpenStreetMap data,
// but renders shops/hospitals/malls/landmarks with clearer labels & icons
// than the plain OSM "standard" style used before.
const CARTO_VOYAGER_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * Click-to-place marker layer. Kept as its own component because
 * useMapEvents must be called from a component rendered inside MapContainer.
 */
function LocationClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Imperatively re-centers/zooms the map whenever `target` changes from
 * outside (autocomplete selection, "use current location"). MapContainer
 * only honors its `center`/`zoom` props on first mount, so programmatic
 * moves after that have to go through the map instance directly.
 */
function MapRecenter({
  target,
}: {
  target: { center: [number, number]; zoom: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo(target.center, target.zoom, { duration: 0.6 });
  }, [target, map]);
  return null;
}

interface PharmacyLocationPickerProps {
  /** Remount key from the parent (e.g. pharmacy id, or "new"). */
  mapKey: string;
  latitude: number | null;
  longitude: number | null;
  /** Last known resolved address text, if any (controlled from the parent form). */
  displayAddress?: string;
  /** Fires on every location change (map click, marker drag, search pick, geolocation). */
  onLocationChange: (lat: number, lng: number, address: string | null) => void;
}

export function PharmacyLocationPicker({
  mapKey,
  latitude,
  longitude,
  displayAddress,
  onLocationChange,
}: PharmacyLocationPickerProps) {
  const hasCoords = latitude !== null && longitude !== null;
  // Computed once at mount (the dialog remounts its content each time it
  // opens), so this reflects whichever pharmacy is being edited/added.
  const initialCenter: [number, number] = hasCoords
    ? [latitude as number, longitude as number]
    : TANTA_COORDS;

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{
    center: [number, number];
    zoom: number;
  } | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState(displayAddress ?? "");

  const { suggestions, isSearching, searchError, clearSuggestions } =
    useNominatimSearch(searchQuery);
  const { reverseGeocode, isResolving } = useReverseGeocode();
  const { getCurrentLocation, isLocating, locationError } =
    useCurrentLocation();

  const markerRef = useRef<LeafletMarker | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  // Stay in sync if the parent resets displayAddress (e.g. dialog reopened
  // for a different pharmacy — mapKey changing is our cue to resync).
  useEffect(() => {
    setResolvedAddress(displayAddress ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapKey]);

  // Close the suggestion dropdown on outside click.
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const commitLocation = async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng);
    setResolvedAddress(address ?? "");
    onLocationChange(lat, lng, address);
  };

  const handleMapClick = (lat: number, lng: number) => {
    void commitLocation(lat, lng);
  };

  const handleMarkerDragEnd = () => {
    const marker = markerRef.current;
    if (!marker) return;
    const pos = marker.getLatLng();
    void commitLocation(pos.lat, pos.lng);
  };

  const handleSelectSuggestion = (suggestion: NominatimSuggestion) => {
    // Nominatim's forward-search result already carries a resolved
    // display_name, so there's no need to fire a second reverse-geocode
    // call for this specific case — we reuse it directly.
    setSearchQuery(suggestion.displayName);
    setResolvedAddress(suggestion.displayName);
    setShowSuggestions(false);
    clearSuggestions();
    setFlyToTarget({
      center: [suggestion.latitude, suggestion.longitude],
      zoom: AUTOCOMPLETE_SELECT_ZOOM,
    });
    onLocationChange(
      suggestion.latitude,
      suggestion.longitude,
      suggestion.displayName,
    );
  };

  const handleUseCurrentLocation = async () => {
    const result = await getCurrentLocation();
    if (!result) return;
    setFlyToTarget({
      center: [result.latitude, result.longitude],
      zoom: AUTOCOMPLETE_SELECT_ZOOM,
    });
    await commitLocation(result.latitude, result.longitude);
  };

  const clearSearch = () => {
    setSearchQuery("");
    clearSuggestions();
    setShowSuggestions(false);
  };

  const suggestionsVisible = showSuggestions && searchQuery.trim().length >= 2;

  return (
    <div className="space-y-2">
      <Label>Location</Label>

      {/* Search box + autocomplete */}
      <div ref={searchBoxRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search pharmacy, hospital, street, mall, landmark..."
            className="pl-9 pr-9"
          />
          {isSearching ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {suggestionsVisible && (
          <div className="absolute z-[1000] mt-1 w-full rounded-lg border border-border bg-popover shadow-md max-h-60 overflow-y-auto">
            {isSearching && suggestions.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Searching...
              </p>
            )}
            {!isSearching && searchError && (
              <p className="px-3 py-2 text-sm text-destructive">
                {searchError}
              </p>
            )}
            {!isSearching && !searchError && suggestions.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No results found
              </p>
            )}
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                disabled={isSearching}
                onClick={() => handleSelectSuggestion(s)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{s.displayName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Crosshair className="w-3.5 h-3.5" />
          )}
          Use Current Location
        </Button>
        {locationError && (
          <p className="text-xs text-destructive">{locationError}</p>
        )}
      </div>

      <div className="rounded-lg overflow-hidden border border-border h-56">
        <MapContainer
          key={mapKey}
          center={initialCenter}
          zoom={hasCoords ? 15 : 12}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution={CARTO_ATTRIBUTION}
            url={CARTO_VOYAGER_TILE_URL}
          />
          <LocationClickHandler onSelect={handleMapClick} />
          <MapRecenter target={flyToTarget} />
          {hasCoords && (
            <Marker
              position={[latitude as number, longitude as number]}
              draggable
              eventHandlers={{ dragend: handleMarkerDragEnd }}
              ref={markerRef}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Click the map, drag the marker, or search above to set the
        pharmacy&apos;s location.
      </p>

      {/* Resolved address, kept in the parent form as `displayAddress` */}
      {/* <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          Address (auto-detected)
        </Label>
        <div className="flex min-h-[2.25rem] items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
          {isResolving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">
                Resolving address...
              </span>
            </>
          ) : resolvedAddress ? (
            <span className="truncate">{resolvedAddress}</span>
          ) : (
            <span className="text-muted-foreground">
              No address resolved yet
            </span>
          )}
        </div>
      </div> */}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Latitude</Label>
          <Input value={latitude ?? ""} readOnly placeholder="Not set" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Longitude</Label>
          <Input value={longitude ?? ""} readOnly placeholder="Not set" />
        </div>
      </div>
    </div>
  );
}
