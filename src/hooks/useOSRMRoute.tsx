import { useCallback, useState } from "react";
import type { Coordinates } from "./useCurrentLocation";

export interface OSRMRouteResult {
  coordinates: [number, number][]; // [lat, lng] جاهزة لـ Leaflet Polyline
  distanceKm: number;
  durationMin: number;
}

interface UseOSRMRouteState {
  route: OSRMRouteResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useOSRMRoute() {
  const [state, setState] = useState<UseOSRMRouteState>({
    route: null,
    isLoading: false,
    error: null,
  });

  const fetchRoute = useCallback(
    async (
      start: Coordinates,
      end: Coordinates,
    ): Promise<OSRMRouteResult | null> => {
      setState({ route: null, isLoading: true, error: null });

      try {
        // OSRM بياخد lng,lat (مش lat,lng زي Leaflet)
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${start.longitude},${start.latitude};${end.longitude},${end.latitude}` +
          `?overview=full&geometries=geojson`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`OSRM request failed (status ${response.status})`);
        }

        const data = await response.json();

        if (data.code !== "Ok" || !data.routes?.length) {
          throw new Error(
            "No driving route found between your location and this pharmacy",
          );
        }

        const bestRoute = data.routes[0];
        const coordinates: [number, number][] =
          bestRoute.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
          );

        const result: OSRMRouteResult = {
          coordinates,
          distanceKm: bestRoute.distance / 1000,
          durationMin: bestRoute.duration / 60,
        };

        setState({ route: result, isLoading: false, error: null });
        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not calculate the route. The routing service may be unavailable.";
        setState({ route: null, isLoading: false, error: message });
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ route: null, isLoading: false, error: null });
  }, []);

  return { ...state, fetchRoute, reset };
}
