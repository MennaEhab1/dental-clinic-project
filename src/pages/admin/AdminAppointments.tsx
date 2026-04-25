import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AppointmentDetailsDrawer } from "@/components/dashboard/AppointmentDetailsDrawer";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X, Check } from "lucide-react";
import { adminAppointmentService } from "@/services/api";
import type { Appointment, AppointmentStatus } from "@/types";
import { toast } from "@/hooks/use-toast";

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const response = await adminAppointmentService.getAll();
      setAppointments(response.data);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = appointments.filter((a) => {
    const matchesSearch =
      `${a.patient?.firstName} ${a.patient?.lastName} ${a.doctor?.firstName} ${a.doctor?.lastName} ${a.service?.name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (
    appointmentId: string,
    newStatus: AppointmentStatus,
  ) => {
    try {
      setIsUpdating(true);
      const backendStatus = newStatus === "complete" ? "completed" : newStatus;
      await adminAppointmentService.updateStatus(appointmentId, backendStatus);
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt,
        ),
      );
      toast({ title: "Success", description: "Appointment status updated" });
      setDrawerOpen(false);
    } catch (error) {
      console.error("Failed to update appointment:", error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      setIsUpdating(true);
      await adminAppointmentService.cancel(appointmentId);
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: "cancelled" } : apt,
        ),
      );
      toast({ title: "Success", description: "Appointment cancelled" });
      setDrawerOpen(false);
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground">
            Appointments Monitoring
          </h1>
          <p className="text-muted-foreground text-sm">
            Overview of all appointments across the center
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient, doctor, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <LoadingCard />
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center pb-12">
              <p className="text-muted-foreground">No appointments found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Patient
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Doctor
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">
                      Service
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">
                      Date
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt) => (
                    <tr
                      key={apt.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={apt.patient?.avatar} />
                            <AvatarFallback className="text-xs">
                              {apt.patient?.firstName[0]}
                              {apt.patient?.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-foreground font-medium">
                            {apt.patient?.firstName} {apt.patient?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        Dr. {apt.doctor?.lastName}
                      </td>
                      <td className="py-3 text-muted-foreground hidden md:table-cell">
                        {apt.service?.name}
                      </td>
                      <td className="py-3 text-muted-foreground hidden lg:table-cell">
                        {new Date(apt.date).toLocaleDateString()} {apt.time}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={apt.status} size="sm" />
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setDrawerOpen(true);
                            }}
                            disabled={isUpdating}
                          >
                            View Details
                          </Button>
                          {apt.status !== "cancelled" &&
                            apt.status !== "complete" && (
                              <>
                                {apt.status === "upcoming" && (
                                  <Button
                                    size="sm"
                                    className="gap-1"
                                    onClick={() =>
                                      handleStatusChange(apt.id, "complete")
                                    }
                                    disabled={isUpdating}
                                  >
                                    <Check className="w-3 h-3" />
                                    Complete
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-1"
                                  onClick={() =>
                                    handleCancelAppointment(apt.id)
                                  }
                                  disabled={isUpdating}
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </Button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {selectedAppointment && (
          <AppointmentDetailsDrawer
            appointment={selectedAppointment}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            role="admin"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
