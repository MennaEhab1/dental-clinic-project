import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./StatusBadge";
import {
  Calendar,
  Clock,
  Stethoscope,
  User,
  FileText,
  DollarSign,
} from "lucide-react";
import type { Appointment } from "@/types";

interface AppointmentDetailsDrawerProps {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
  role?: "patient" | "doctor" | "admin";
}

export function AppointmentDetailsDrawer({
  appointment,
  open,
  onClose,
  onAccept,
  onReject,
  onCancel,
  role = "patient",
}: AppointmentDetailsDrawerProps) {
  if (!appointment) return null;

  const doctor = appointment.doctor;
  const patient = appointment.patient;
  const service = appointment.service;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Appointment Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={appointment.status} />
          </div>

          <Separator />

          {/* Service Info */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              Service
            </h4>
            <div className="p-4 rounded-xl bg-muted/50 space-y-2">
              <p className="font-medium text-foreground">
                {service?.name || "Dental Appointment"}
              </p>
              <p className="text-sm text-muted-foreground">
                {service?.description}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /> {appointment.duration} min
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5" /> ${service?.price || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Date & Time
            </h4>
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="font-medium text-foreground">
                {new Date(appointment.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {appointment.time} • {appointment.duration} minutes
              </p>
            </div>
          </div>

          {/* Doctor Info (for patient view) */}
          {role !== "doctor" && doctor && (
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                Doctor
              </h4>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={doctor.avatar} />
                  <AvatarFallback>
                    {doctor.firstName[0]}
                    {doctor.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    Dr. {doctor.firstName} {doctor.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {doctor.specialty.replace("-", " ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Patient Info (for doctor/admin view) */}
          {role !== "patient" && patient && (
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Patient
              </h4>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={patient.avatar} />
                  <AvatarFallback>
                    {patient.firstName[0]}
                    {patient.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {patient.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Notes
              </h4>
              <p className="text-sm text-muted-foreground p-4 rounded-xl bg-muted/50">
                {appointment.notes}
              </p>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            {role === "doctor" && appointment.status === "upcoming" && (
              <>
                <Button
                  className="flex-1 gradient-bg border-0"
                  onClick={() => onAccept?.(appointment.id)}
                >
                  Mark Complete
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => onReject?.(appointment.id)}
                >
                  Cancel
                </Button>
              </>
            )}
            {appointment.status !== "cancelled" &&
              appointment.status !== "complete" &&
              onCancel && (
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => onCancel?.(appointment.id)}
                >
                  Cancel Appointment
                </Button>
              )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
