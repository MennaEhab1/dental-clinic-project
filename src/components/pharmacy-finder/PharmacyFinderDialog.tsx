import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Store, Loader2, AlertTriangle, MapPin } from "lucide-react";
import { pharmacyFinderService, type NearbyPharmacy } from "@/services/api";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { PharmacyCard } from "./PharmacyCard";

interface PharmacyFinderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicineId: string;
  medicineName: string;
}

export function PharmacyFinderDialog({
  open,
  onOpenChange,
  medicineId,
  medicineName,
}: PharmacyFinderDialogProps) {
  const {
    latitude,
    longitude,
    isLoading: isLocating,
    error: locationError,
    requestLocation,
  } = useCurrentLocation();

  const [pharmacies, setPharmacies] = useState<NearbyPharmacy[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasRequestedSearch, setHasRequestedSearch] = useState(false);

  useEffect(() => {
    if (!open) {
      setPharmacies([]);
      setSearchError(null);
      setHasRequestedSearch(false);
      return;
    }

    setPharmacies([]);
    setSearchError(null);
    setHasRequestedSearch(false);
  }, [open]);

  const handleFindNearbyPharmacies = async () => {
    try {
      setHasRequestedSearch(true);
      setSearchError(null);
      setPharmacies([]);

      const location = await requestLocation();

      setIsSearching(true);
      const res = await pharmacyFinderService.findNearbyPharmacies({
        medicineId,
        medicineName,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (res.success) {
        setPharmacies(res.data);
      } else {
        setSearchError(res.message || "Failed to load nearby pharmacies");
      }
    } catch {
      // useCurrentLocation already exposes a user-friendly error.
    } finally {
      setIsSearching(false);
    }
  };

  const isLoading = isLocating || isSearching;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Pharmacies with {medicineName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {!hasRequestedSearch && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <MapPin className="w-8 h-8 text-primary" />
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
                We need your current location to calculate nearest pharmacies.
              </p>
              <Button size="sm" onClick={handleFindNearbyPharmacies}>
                Use My Location
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">
                {isLocating
                  ? "Requesting your location permission..."
                  : "Searching nearby pharmacies..."}
              </p>
            </div>
          )}

          {!isLoading && hasRequestedSearch && locationError && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-sm text-gray-700 dark:text-gray-300 max-w-sm">
                {locationError}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleFindNearbyPharmacies}
              >
                Try Again
              </Button>
            </div>
          )}

          {!isLoading &&
            hasRequestedSearch &&
            !locationError &&
            searchError && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <p className="text-sm text-gray-700 dark:text-gray-300 max-w-sm">
                  {searchError}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFindNearbyPharmacies}
                >
                  Try Again
                </Button>
              </div>
            )}

          {!isLoading &&
            hasRequestedSearch &&
            !locationError &&
            !searchError &&
            pharmacies.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Store className="w-8 h-8 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No pharmacies currently have this medicine in stock nearby.
                </p>
              </div>
            )}

          {!isLoading &&
            hasRequestedSearch &&
            !locationError &&
            !searchError &&
            pharmacies.map((pharmacy) => (
              <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
