import { useEffect } from "react";
import { Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import type { Coordinates } from "@/hooks/useCurrentLocation";

interface RouteLayerProps {
  patient: Coordinates;
  pharmacy: Coordinates;
  routeCoordinates: [number, number][] | null;
}

export function RouteLayer({
  patient,
  pharmacy,
  routeCoordinates,
}: RouteLayerProps) {
  const map = useMap();

  // نضبط الـ zoom عشان يظهر الماركرين الاتنين مع بعض دايماً
  useEffect(() => {
    const bounds = L.latLngBounds([
      [patient.latitude, patient.longitude],
      [pharmacy.latitude, pharmacy.longitude],
    ]);
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [
    map,
    patient.latitude,
    patient.longitude,
    pharmacy.latitude,
    pharmacy.longitude,
  ]);

  if (!routeCoordinates || routeCoordinates.length === 0) return null;

  return (
    <Polyline
      positions={routeCoordinates}
      pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.8 }}
    />
  );
}
