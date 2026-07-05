import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Stethoscope } from "lucide-react";
import type { Appointment } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppointmentCardProps {
  appointment: Appointment;
  variant?: "default" | "compact";
  viewerRole?: "doctor" | "patient";
  onView?: () => void;
  onCancel?: () => void;
}

const statusStyles: Record<string, string> = {
  upcoming: "bg-primary/10 text-primary border-primary/20",
  complete: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<string, string> = {
  upcoming: "Upcoming",
  complete: "Complete",
  cancelled: "Cancelled",
};

export function AppointmentCard({
  appointment,
  variant = "default",
  viewerRole,
  onView,
  onCancel,
}: AppointmentCardProps) {
  const doctor = appointment.doctor;
  const patient = appointment.patient;
  const service = appointment.service;

  const resolveAvatarSrc = (value?: string): string | undefined => {
    const raw = String(value || "").trim();
    if (!raw) return undefined;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;

    const baseUrl =
      import.meta.env.VITE_API_URL || "https://smart-teeth-care.runasp.net";
    const normalized = raw.startsWith("/")
      ? `${baseUrl}${raw}`
      : `${baseUrl}/${raw}`;
    try {
      return encodeURI(normalized);
    } catch {
      return normalized;
    }
  };

  if (variant === "compact") {
    const counterpart =
      viewerRole === "doctor"
        ? patient
        : viewerRole === "patient"
          ? doctor
          : doctor || patient;
    const counterpartName = counterpart
      ? `${counterpart.firstName || ""} ${counterpart.lastName || ""}`.trim() ||
        (viewerRole === "patient" ? "Doctor" : "Patient")
      : "";
    const counterpartInitials = counterpartName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");

    return (
      <motion.div
        whileHover={{ x: 4 }}
        className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
      >
        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground">
          <Calendar className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {service?.name || "Dental Appointment"}
          </p>
          <p className="text-sm text-muted-foreground">
            {new Date(appointment.date).toLocaleDateString()} at{" "}
            {appointment.time}
          </p>
          {counterpart && counterpartName && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarImage src={resolveAvatarSrc(counterpart.avatar)} />
                <AvatarFallback>{counterpartInitials || "U"}</AvatarFallback>
              </Avatar>
              <span className="truncate">
                {viewerRole === "patient" ? "Dr. " : ""}
                {counterpartName}
              </span>
            </div>
          )}
        </div>
        <Badge className={statusStyles[appointment.status]}>
          {statusLabels[appointment.status]}
        </Badge>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl bg-card border border-border shadow-soft"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">
              {service?.name || "Dental Appointment"}
            </h4>
            <Badge className={`${statusStyles[appointment.status]} mt-1`}>
              {statusLabels[appointment.status]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            {new Date(appointment.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            {appointment.time} ({appointment.duration} minutes)
          </span>
        </div>
        {doctor && (
          <div className="flex items-center gap-3 text-sm">
            <Stethoscope className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              Dr. {doctor.firstName} {doctor.lastName}
            </span>
          </div>
        )}
        {patient && (
          <div className="flex items-center gap-3 text-sm">
            <User className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              {patient.firstName} {patient.lastName}
            </span>
          </div>
        )}
      </div>

      {(onView || onCancel) && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          {onView && (
            <button
              onClick={onView}
              className="flex-1 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              View Details
            </button>
          )}
          {onCancel &&
            appointment.status !== "cancelled" &&
            appointment.status !== "complete" && (
              <button
                onClick={onCancel}
                className="flex-1 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
        </div>
      )}
    </motion.div>
  );
}
