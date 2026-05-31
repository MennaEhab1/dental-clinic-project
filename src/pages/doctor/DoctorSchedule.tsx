import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Plus, CalendarDays, RefreshCw } from "lucide-react";
import {
  doctorScheduleService,
  authService,
  type DoctorSchedule,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const DAY_COLORS: Record<string, string> = {
  Sunday: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800",
  Monday: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  Tuesday:
    "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
  Wednesday:
    "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  Thursday:
    "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  Friday: "bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800",
  Saturday:
    "bg-fuchsia-50 border-fuchsia-200 dark:bg-fuchsia-950/30 dark:border-fuchsia-800",
};

const DAY_BADGE_COLORS: Record<string, string> = {
  Sunday: "bg-rose-100 text-rose-700",
  Monday: "bg-blue-100 text-blue-700",
  Tuesday: "bg-violet-100 text-violet-700",
  Wednesday: "bg-amber-100 text-amber-700",
  Thursday: "bg-emerald-100 text-emerald-700",
  Friday: "bg-cyan-100 text-cyan-700",
  Saturday: "bg-fuchsia-100 text-fuchsia-700",
};

interface ScheduleFormState {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: string;
}

const initialForm: ScheduleFormState = {
  dayOfWeek: "Monday",
  startTime: "09:00",
  endTime: "17:00",
  slotDurationMinutes: "30",
};

function formatTime(dateSpan: string): string {
  // Backend returns "HH:mm:ss" or "HH:mm:ss.fffffff" — trim to HH:mm
  return String(dateSpan || "").slice(0, 5);
}

export default function DoctorSchedulePage() {
  const [schedule, setSchedule] = useState<DoctorSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ScheduleFormState>(initialForm);
  const [refreshKey, setRefreshKey] = useState(0);
  // Numeric doctor ID resolved from JWT claims or appointments fallback
  const [resolvedDoctorId, setResolvedDoctorId] = useState<number | null>(null);
  const { user } = useAuth();

  // Resolve the numeric doctor ID once on mount (or when user changes)
  const resolveIdRef = useRef(false);
  useEffect(() => {
    if (resolveIdRef.current) return;
    resolveIdRef.current = true;
    authService.resolveCurrentDoctorId().then((id) => {
      if (id) {
        setResolvedDoctorId(id);
      } else {
        // Backend now resolves doctor identity from JWT on POST.
        // Allow the page to render; schedule fetch will show empty state.
        console.warn(
          "[DoctorSchedule] Could not resolve numeric doctor ID from token/appointments. POST will rely on backend JWT resolution.",
        );
        setIsLoading(false);
      }
    });
  }, []);

  // Fetch schedule on mount and on manual refresh.
  // Backend resolves doctor identity from JWT — no numeric doctorId needed for GET.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    doctorScheduleService
      .getSchedule()
      .then((res) => {
        if (!cancelled) setSchedule(res.data || []);
      })
      .catch(() => {
        if (!cancelled)
          toast({
            title: "Failed to load schedule",
            description: "Could not fetch schedule from backend.",
            variant: "destructive",
          });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const fetchSchedule = () => setRefreshKey((k) => k + 1);

  const groupByDay = () => {
    const grouped: Record<string, DoctorSchedule[]> = {};
    DAYS_OF_WEEK.forEach((day) => {
      grouped[day] = schedule.filter(
        (s) => s.dayOfWeek.toLowerCase() === day.toLowerCase(),
      );
    });
    return grouped;
  };

  const handleFormChange = (field: keyof ScheduleFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const slotDuration = Number(form.slotDurationMinutes);
    if (!slotDuration || slotDuration < 5) {
      toast({
        title: "Invalid slot duration",
        description: "Slot duration must be at least 5 minutes.",
        variant: "destructive",
      });
      return;
    }

    // Validate start < end
    if (form.startTime >= form.endTime) {
      toast({
        title: "Invalid time range",
        description: "Start time must be before end time.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: DoctorSchedule = {
        // Only include doctorId when resolved; omit it so the backend
        // can infer the doctor identity from the JWT token instead.
        ...(resolvedDoctorId ? { doctorId: resolvedDoctorId } : {}),
        dayOfWeek: form.dayOfWeek,
        startTime: `${form.startTime}:00`, // backend expects HH:mm:ss
        endTime: `${form.endTime}:00`,
        slotDurationMinutes: slotDuration,
      };

      const res = await doctorScheduleService.create(payload);
      if (res.success) {
        toast({
          title: "Schedule added",
          description: `${form.dayOfWeek} ${form.startTime}–${form.endTime} (${slotDuration} min slots) saved.`,
        });
        setDialogOpen(false);
        setForm(initialForm);
        await fetchSchedule();
      } else {
        toast({
          title: "Failed to save schedule",
          description:
            res.message || "Backend rejected the request. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const grouped = groupByDay();
  const activeDays = DAYS_OF_WEEK.filter((d) => grouped[d].length > 0);
  const totalSlots = schedule.length;

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              My Schedule
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage your weekly working hours and appointment slots
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSchedule}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              className="gradient-bg border-0"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Schedule
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Days</p>
                <p className="text-2xl font-bold text-foreground">
                  {activeDays.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Clock className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Schedule Blocks</p>
                <p className="text-2xl font-bold text-foreground">
                  {totalSlots}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Schedule Grid */}
        {isLoading ? (
          <LoadingCard />
        ) : schedule.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium">
                No schedule configured yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Add Schedule" to set up your working hours
              </p>
              <Button
                className="mt-4 gradient-bg border-0"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Your First Schedule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DAYS_OF_WEEK.map((day, i) => {
              const slots = grouped[day];
              if (slots.length === 0) return null;
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={`border ${DAY_COLORS[day]} transition-shadow hover:shadow-card`}
                  >
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        {day}
                        <Badge
                          className={`text-[10px] ${DAY_BADGE_COLORS[day]}`}
                        >
                          {slots.length} block{slots.length > 1 ? "s" : ""}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      {slots.map((slot, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-md bg-background/60 border border-border text-xs"
                        >
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {formatTime(slot.startTime)} –{" "}
                            {formatTime(slot.endTime)}
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {slot.slotDurationMinutes} min
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Days with no schedule — show muted placeholders */}
        {!isLoading && schedule.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DAYS_OF_WEEK.filter((d) => grouped[d].length === 0).map((day) => (
              <Card
                key={day}
                className="border border-dashed border-muted/40 opacity-50"
              >
                <CardContent className="py-5 text-center text-xs text-muted-foreground">
                  {day} — not scheduled
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Schedule Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                Add Schedule Block
              </DialogTitle>
              <DialogDescription>
                Define a recurring weekly availability block for your schedule.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Day of week */}
              <div className="space-y-1.5">
                <Label>Day of Week</Label>
                <Select
                  value={form.dayOfWeek}
                  onValueChange={(v) => handleFormChange("dayOfWeek", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start / End time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      handleFormChange("startTime", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      handleFormChange("endTime", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Slot duration */}
              <div className="space-y-1.5">
                <Label>Slot Duration (minutes)</Label>
                <Select
                  value={form.slotDurationMinutes}
                  onValueChange={(v) =>
                    handleFormChange("slotDurationMinutes", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 20, 30, 45, 60].map((mins) => (
                      <SelectItem key={mins} value={String(mins)}>
                        {mins} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDialogOpen(false);
                    setForm(initialForm);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gradient-bg border-0"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Schedule"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
