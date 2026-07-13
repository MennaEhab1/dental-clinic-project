import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, MapPin, Phone, Clock, Navigation } from "lucide-react";
import type { NearbyPharmacy } from "@/services/api";

interface PharmacyCardProps {
  pharmacy: NearbyPharmacy;
}

export function PharmacyCard({ pharmacy }: PharmacyCardProps) {
  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <Store className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                {pharmacy.pharmacyName}
              </h4>
              <p className="text-xs text-gray-500 truncate">
                {pharmacy.address || "Address unavailable"}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 gap-1">
            <MapPin className="w-3 h-3" />
            {pharmacy.distanceFromPatient.toFixed(1)} km
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {pharmacy.phoneNumber || "Phone unavailable"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {pharmacy.workingHours || "Working hours unavailable"}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded px-3 py-2">
            <p className="text-[11px] uppercase font-semibold text-gray-500">
              Price
            </p>
            <p className="font-medium text-gray-900 dark:text-white">
              {pharmacy.price !== null ? `${pharmacy.price} EGP` : "N/A"}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded px-3 py-2">
            <p className="text-[11px] uppercase font-semibold text-gray-500">
              Quantity
            </p>
            <p className="font-medium text-gray-900 dark:text-white">
              {pharmacy.quantity !== null ? pharmacy.quantity : "N/A"}
            </p>
          </div>
        </div>

        <Button
          variant="default"
          size="sm"
          className="w-full gap-2"
          onClick={handleOpenGoogleMaps}
        >
          <Navigation className="w-4 h-4" />
          Open in Google Maps
        </Button>
      </CardContent>
    </Card>
  );
}
