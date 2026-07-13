import { useCallback, useState } from "react";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface CurrentLocationState {
  latitude: number | null;
  longitude: number | null;
  isLoading: boolean;
  error: string | null;
}

export function useCurrentLocation() {
  const [state, setState] = useState<CurrentLocationState>({
    latitude: null,
    longitude: null,
    isLoading: false,
    error: null,
  });

  const requestLocation = useCallback((): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const message = "Your browser does not support geolocation";
        setState((prev) => ({ ...prev, error: message, isLoading: false }));
        reject(new Error(message));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setState({ latitude, longitude, isLoading: false, error: null });
          resolve({ latitude, longitude });
        },
        (geoError) => {
          let message = "Could not get your current location";
          if (geoError.code === geoError.PERMISSION_DENIED) {
            message =
              "Location access was denied. Please enable location permission in your browser settings.";
          } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
            message = "Your current location is unavailable right now";
          } else if (geoError.code === geoError.TIMEOUT) {
            message = "Getting your location timed out. Please try again";
          }
          setState((prev) => ({ ...prev, isLoading: false, error: message }));
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
  }, []);

  return { ...state, requestLocation };
}
