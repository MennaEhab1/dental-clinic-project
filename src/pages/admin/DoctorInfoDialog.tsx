import type { Doctor } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface DoctorInfoDialogProps {
  doctor: Doctor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DoctorInfoDialog({
  doctor,
  open,
  onOpenChange,
}: DoctorInfoDialogProps) {
  const fullName = `Dr. ${doctor.firstName} ${doctor.lastName}`.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Doctor Information</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <div className="grid grid-cols-2 gap-4">

            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{fullName}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium break-all">
                {doctor.email}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Specialty</p>
              <p className="font-medium">
                {doctor.specialty}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Working Hours</p>
              <p className="font-medium">
                {doctor.experience} Hours
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Salary</p>
              <p className="font-medium">
                ${doctor.consultationFee}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Status</p>

              <Badge
                variant={doctor.isActive ? "default" : "secondary"}
              >
                {doctor.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">
                Hiring Date
              </p>

              <p className="font-medium">
                {new Date(doctor.createdAt).toLocaleDateString()}
              </p>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}