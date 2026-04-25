import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/types";

const statusConfig: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  upcoming: {
    label: "Upcoming",
    className:
      "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
  },
  complete: {
    label: "Complete",
    className:
      "bg-success/10 text-success border-success/20 hover:bg-success/20",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
  },
};

interface StatusBadgeProps {
  status: AppointmentStatus;
  size?: "sm" | "default";
}

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.upcoming;
  return (
    <Badge
      variant="outline"
      className={`${config.className} ${size === "sm" ? "text-[10px] px-1.5 py-0" : ""}`}
    >
      {config.label}
    </Badge>
  );
}
