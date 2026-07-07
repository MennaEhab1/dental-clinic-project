import type { Doctor } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

type DoctorInfoDialogProps = {
  doctor: Doctor & {
    gender?: string;
    address?: string;
    specialization?: string;
    fullName?: string;
    salary?: number;
    workingHours?: number;
    hiringDate?: string;
    userId?: string;
    specialityName?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const formatLabel = (value?: string) => {
  if (!value) return "Not specified";

  return value
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeFullName = (name?: string, firstName?: string, lastName?: string) => {
  if (!name && !firstName && !lastName) return "";

  const baseName = name?.trim() || `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return baseName.replace(/^Dr\.\s+/i, "Dr. ");
};

export function DoctorInfoDialog({
  doctor,
  open,
  onOpenChange,
}: DoctorInfoDialogProps) {
  const fullName = normalizeFullName(
    doctor.fullName,
    doctor.firstName,
    doctor.lastName,
  );

  const infoItems = [
    { label: "Full Name", value: fullName },
    { label: "Email", value: doctor.email },
    {
      label: "Specialization",
      value: formatLabel(
        doctor.specialityName || doctor.specialization || doctor.specialty,
      ),
    },
    {
      label: "Working Hours",
      value: `${doctor.workingHours ?? doctor.experience ?? 0}`,
    },
    {
      label: "Consultation Fee",
      value: `$${doctor.consultationFee ?? doctor.salary ?? 0}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Doctor Information</DialogTitle>
          <DialogDescription>
            Read-only details for the selected doctor.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-border/60">
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {infoItems.map((item) => (
                <div key={item.label} className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </p>
                  <div className="text-sm text-foreground">{item.value}</div>
                </div>
              ))}
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Additional medical details are not shown in this view.
            </p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
