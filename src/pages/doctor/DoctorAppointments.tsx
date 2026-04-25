import { Fragment, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AppointmentDetailsDrawer } from "@/components/dashboard/AppointmentDetailsDrawer";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, CheckCircle, X } from "lucide-react";
import { doctorService } from "@/services/api";
import type { Appointment } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actioningAppointmentId, setActioningAppointmentId] = useState<
    string | null
  >(null);
  const { user } = useAuth();

  const fetchAppointments = async () => {
    try {
      const response = await doctorService.getAppointments();
      setAppointments(response.data);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      toast({
        title: "Failed to load appointments",
        description: "Could not fetch doctor appointments from backend.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchAppointments();
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const filteredAppointments =
    statusFilter === "all"
      ? appointments
      : appointments.filter((a) => a.status === statusFilter);

  const today = appointments.filter((a) => {
    const aptDate = new Date(a.date).toDateString();
    return aptDate === new Date().toDateString();
  });

  const completed = appointments.filter((a) => a.status === "complete");
  const upcoming = appointments.filter((a) => a.status === "upcoming");

  const handleAccept = async (id: string) => {
    setActioningAppointmentId(id);
    try {
      await doctorService.completeAppointment(id);
      await fetchAppointments();
      setDrawerOpen(false);
      toast({
        title: "Appointment Complete",
        description: "The appointment has been marked as complete.",
      });
    } catch (error) {
      console.error("Failed to complete appointment:", error);
      toast({
        title: "Failed to update appointment",
        description: "Backend did not accept the complete request.",
        variant: "destructive",
      });
    } finally {
      setActioningAppointmentId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioningAppointmentId(id);
    try {
      await doctorService.cancelAppointment(id);
      await fetchAppointments();
      setDrawerOpen(false);
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been cancelled.",
      });
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      toast({
        title: "Failed to update appointment",
        description: "Backend did not accept the cancel request.",
        variant: "destructive",
      });
    } finally {
      setActioningAppointmentId(null);
    }
  };

  // Build a simple weekly schedule view
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold text-foreground">
            Appointments
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your schedule and patient appointments
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {today.length}
                </p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10 text-warning">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {completed.length}
                </p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10 text-success">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {upcoming.length}
                </p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
            </TabsList>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="list">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <LoadingCard />
                ) : filteredAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {filteredAppointments.map((apt) => (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between p-4 rounded-xl border border-border hover:shadow-card transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setDrawerOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={apt.patient?.avatar} />
                            <AvatarFallback>
                              {apt.patient?.firstName[0]}
                              {apt.patient?.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {apt.patient?.firstName} {apt.patient?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {apt.service?.name} •{" "}
                              {new Date(apt.date).toLocaleDateString()} at{" "}
                              {apt.time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={apt.status} />
                          {apt.status === "upcoming" && (
                            <div className="flex gap-1 ml-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-success border-success/30 hover:bg-success/10"
                                disabled={actioningAppointmentId === apt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(apt.id);
                                }}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />{" "}
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
                                disabled={actioningAppointmentId === apt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(apt.id);
                                }}
                              >
                                <X className="w-3.5 h-3.5 mr-1" /> Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No appointments found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-7 gap-1">
                    <div className="p-2 text-xs font-medium text-muted-foreground">
                      Time
                    </div>
                    {daysOfWeek.map((day) => (
                      <div
                        key={day}
                        className="p-2 text-xs font-medium text-center text-foreground"
                      >
                        {day}
                      </div>
                    ))}
                    {timeSlots.map((time) => (
                      <Fragment key={time}>
                        <div
                          key={`time-${time}`}
                          className="p-2 text-xs text-muted-foreground border-t border-border"
                        >
                          {time}
                        </div>
                        {daysOfWeek.map((day) => {
                          const apt = appointments.find(
                            (a) => a.time === time && a.status !== "cancelled",
                          );
                          return (
                            <div
                              key={`${day}-${time}`}
                              className={`p-2 border-t border-border text-xs rounded ${apt ? "bg-primary/10 cursor-pointer hover:bg-primary/20" : ""}`}
                              onClick={() => {
                                if (apt) {
                                  setSelectedAppointment(apt);
                                  setDrawerOpen(true);
                                }
                              }}
                            >
                              {apt && (
                                <div>
                                  <p className="font-medium text-foreground truncate">
                                    {apt.patient?.firstName}
                                  </p>
                                  <p className="text-muted-foreground truncate">
                                    {apt.service?.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AppointmentDetailsDrawer
          appointment={selectedAppointment}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onAccept={handleAccept}
          onReject={handleReject}
          role="doctor"
        />
      </div>
    </DashboardLayout>
  );
}
