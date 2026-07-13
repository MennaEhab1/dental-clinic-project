import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Store,
  Navigation,
  Loader2,
  AlertTriangle,
  Route as RouteIcon,
  Clock,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useOSRMRoute } from "@/hooks/useOSRMRoute";
import { RouteLayer } from "./RouteLayer";
import type { Coordinates } from "@/hooks/useCurrentLocation";
import type { NearbyPharmacy } from "@/services/api";

// عملنا الماركرز بـ divIcon SVG بسيط عشان نتفادى مشاكل الـ default marker icon path
// اللي بتحصل غالباً مع Vite/Webpack. لو عندك fix تاني في المشروع خلاص من غير مشكلة.
const createPinIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width: 26px; height: 26px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });

const patientIcon = createPinIcon("#2563eb");
const pharmacyIcon = createPinIcon("#dc2626");

interface PharmacyMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pharmacy: NearbyPharmacy | null;
  patientLocation: Coordinates | null;
}

export function PharmacyMapModal({
  open,
  onOpenChange,
  pharmacy,
  patientLocation,
}: PharmacyMapModalProps) {
  const { route, isLoading, error, fetchRoute, reset } = useOSRMRoute();

  // نجيب الروت بس لما المودال يتفتح فعلاً (مش لكل الصيدليات مقدماً)
  useEffect(() => {
    if (open && pharmacy && patientLocation) {
      fetchRoute(patientLocation, {
        latitude: pharmacy.latitude,
        longitude: pharmacy.longitude,
      });
    }
    if (!open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pharmacy?.id]);

  if (!pharmacy || !patientLocation) return null;

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const center: [number, number] = [
    (patientLocation.latitude + pharmacy.latitude) / 2,
    (patientLocation.longitude + pharmacy.longitude) / 2,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* h-[90vh] على الموبايل بتديله شكل قريب من full-screen sheet.
          لو عندك Sheet/Drawer component (vaul) جاهز في المشروع، تقدري تستبدليها
          بيه هنا عشان أنيميشن انزلاق حقيقي من تحت. */}
      <DialogContent className="p-0 gap-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh] w-[95vw] sm:w-full sm:max-w-3xl">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            {pharmacy.pharmacyName}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-900 shrink-0">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Calculating route...
            </div>
          )}
          {!isLoading && error && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error} — showing locations without a route.
            </div>
          )}
          {!isLoading && route && (
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <RouteIcon className="w-4 h-4 text-primary" />
                <span className="font-medium">Distance:</span>
                <span>{route.distanceKm.toFixed(1)} km</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">Estimated Time:</span>
                <span>{Math.round(route.durationMin)} min</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[300px]">
          <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom
            style={{ width: "100%", height: "100%", minHeight: 300 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker
              position={[patientLocation.latitude, patientLocation.longitude]}
              icon={patientIcon}
            >
              <Popup>Your location</Popup>
            </Marker>
            <Marker
              position={[pharmacy.latitude, pharmacy.longitude]}
              icon={pharmacyIcon}
            >
              <Popup>{pharmacy.pharmacyName}</Popup>
            </Marker>
            <RouteLayer
              patient={patientLocation}
              pharmacy={{
                latitude: pharmacy.latitude,
                longitude: pharmacy.longitude,
              }}
              routeCoordinates={route?.coordinates ?? null}
            />
          </MapContainer>
        </div>

        <div className="px-4 py-3 border-t shrink-0 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button className="flex-1 gap-2" onClick={handleOpenGoogleMaps}>
            <Navigation className="w-4 h-4" />
            Open in Google Maps
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
