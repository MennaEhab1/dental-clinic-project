import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  ArrowLeft,
  ArrowRight,
  Check,
  Stethoscope,
  CreditCard,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  doctorService,
  serviceService,
  doctorScheduleService,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { readPatientProfileCache } from "@/lib/patientProfileCache";
import type { Doctor, Service } from "@/types";
import DepositPage from "./DepositPage";

type Step =
  | "service"
  | "doctor"
  | "datetime"
  | "details"
  | "deposit"
  | "confirm";

const steps: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "service", label: "Service", icon: Stethoscope },
  { id: "doctor", label: "Doctor", icon: User },
  { id: "datetime", label: "Date & Time", icon: CalendarIcon },
  { id: "details", label: "Details", icon: User },
  { id: "deposit", label: "Deposit", icon: CreditCard },
  { id: "confirm", label: "Confirm", icon: Check },
];

const DAY_OF_WEEK_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

type BookingDoctor = Doctor & {
  name?: string;
  photo?: string;
  profileImage?: string;
  imageUrl?: string;
  profilePicture?: string;
};

function stripDoctorPrefix(value?: string | null): string {
  return String(value || "")
    .replace(/^\s*dr\.?\s+/i, "")
    .trim();
}

function getDoctorDisplayName(doctor?: Doctor): string {
  if (!doctor) return "Doctor";
  const bookingDoctor = doctor as BookingDoctor;
  const firstName = stripDoctorPrefix(bookingDoctor.firstName);
  const lastName = stripDoctorPrefix(bookingDoctor.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || stripDoctorPrefix(bookingDoctor.name) || "Doctor";
}

function getDoctorImageSrc(doctor?: Doctor): string | undefined {
  if (!doctor) return undefined;
  const bookingDoctor = doctor as BookingDoctor;
  return (
    bookingDoctor.avatar ||
    bookingDoctor.profileImage ||
    bookingDoctor.photo ||
    bookingDoctor.imageUrl ||
    bookingDoctor.profilePicture
  );
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<Step>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [doctorWorkingDays, setDoctorWorkingDays] = useState<Set<number>>(
    new Set(),
  );
  const [isFetchingSchedule, setIsFetchingSchedule] = useState(false);
  const [brokenDoctorImages, setBrokenDoctorImages] = useState<
    Record<string, boolean>
  >({});
  const [paymentConfirmation, setPaymentConfirmation] = useState<Record<
    string,
    unknown
  > | null>(null);

  const [booking, setBooking] = useState({
    serviceId: searchParams.get("service") || "",
    doctorId: searchParams.get("doctor") || "",
    date: "",
    time: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });

  const { user, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, doctorsRes] = await Promise.all([
          serviceService.getAll(),
          doctorService.getAll(),
        ]);
        setServices(servicesRes.data);
        setDoctors(doctorsRes.data);
      } catch (error) {
        console.error("[BookingPage] Failed to fetch data:", error);
        toast.error("Failed to load doctors and services. Please try again.");
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login", { state: { from: location.pathname } });
    }
  }, [isLoading, user, navigate, location]);

  useEffect(() => {
    if (user) {
      const cachedProfile = readPatientProfileCache(user);

      setBooking((prev) => ({
        ...prev,
        firstName:
          prev.firstName || user.firstName || cachedProfile?.firstName || "",
        lastName:
          prev.lastName || user.lastName || cachedProfile?.lastName || "",
        email: prev.email || user.email || cachedProfile?.email || "",
        phone: prev.phone || user.phone || cachedProfile?.phone || "",
      }));
    }
  }, [user]);



  useEffect(() => {
  const serviceId = searchParams.get("service");

  if (serviceId) {
    setBooking((prev) => ({
      ...prev,
      serviceId,
      doctorId: "", // علشان يختار دكتور جديد
      date: "",
      time: "",
    }));

    setCurrentStep("doctor");
  }
}, [searchParams]);
  const selectedService = services.find((s) => s.id === booking.serviceId);
  const selectedDoctor = doctors.find((d) => d.id === booking.doctorId);

  const filteredDoctors = booking.serviceId
    ? doctors.filter((d) => {
        const svc = selectedService;
        if (!svc) return true;
        const docSpecId = (d as unknown as { specializationId?: number | null })
          .specializationId;
        if (docSpecId !== undefined && docSpecId !== null) {
          return String(docSpecId) === svc.id;
        }
        return d.specialty === svc.specialty;
      })
    : doctors;

  useEffect(() => {
    if (!booking.doctorId) {
      setDoctorWorkingDays(new Set());
      return;
    }

    let cancelled = false;
    setIsFetchingSchedule(true);
    setDoctorWorkingDays(new Set());

    const run = async () => {
      try {
        const res = await doctorScheduleService.getSchedule(booking.doctorId);
        if (!cancelled) {
          const days = new Set(
            res.data
              .map((s) => DAY_OF_WEEK_MAP[s.dayOfWeek] ?? -1)
              .filter((n) => n >= 0),
          );
          setDoctorWorkingDays(days);
        }
      } catch (err) {
        console.error("❌ Schedule fetch error:", err);
      } finally {
        setIsFetchingSchedule(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [booking.doctorId]);

  useEffect(() => {
    if (!booking.doctorId || !booking.date) {
      setAvailableSlots([]);
      setSlotsError(false);
      return;
    }

    let cancelled = false;
    setIsFetchingSlots(true);
    setAvailableSlots([]);
    setSlotsError(false);

    const run = async () => {
      try {
        const res = await doctorScheduleService.getAvailableSlots(
          booking.doctorId,
          booking.date,
        );
        if (!cancelled) {
          if (!res.success) {
            setSlotsError(true);
          } else {
            const takenKey = `booked_slots_${booking.doctorId}_${booking.date}`;
            let taken: string[] = [];
            try {
              taken = JSON.parse(localStorage.getItem(takenKey) || "[]");
            } catch {
              /* ignore */
            }
            const slots = (res.data ?? []).filter((s) => !taken.includes(s));
            setAvailableSlots(slots);
          }
        }
      } catch (err) {
        console.error("❌ Slots fetch error:", err);
        if (!cancelled) setSlotsError(true);
      } finally {
        if (!cancelled) setIsFetchingSlots(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [booking.doctorId, booking.date]);

  useEffect(() => {
    if (currentStep === "doctor") {
      console.debug("[BookingPage] Doctor filtering in effect:", {
        selectedServiceId: booking.serviceId,
        selectedService: selectedService
          ? {
              id: selectedService.id,
              name: selectedService.name,
              specialty: selectedService.specialty,
            }
          : null,
        totalDoctors: doctors.length,
        filteredDoctorsCount: filteredDoctors.length,
        filteredDoctors: filteredDoctors.map((d) => ({
          id: d.id,
          name: getDoctorDisplayName(d),
          specialty: d.specialty,
        })),
      });
    }
  }, [
    currentStep,
    booking.serviceId,
    selectedService,
    filteredDoctors,
    doctors,
  ]);

  const handleNext = () => {
    const stepIndex = steps.findIndex((s) => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    const stepIndex = steps.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  // Called when user clicks Next on the Details step.
  const handleDetailsNext = () => {
    setCurrentStep("deposit");
  };

  // Called after successful deposit payment.
  const handlePaymentSuccess = () => {
    try {
      const rawConfirmation = localStorage.getItem("payment_confirmation");
      if (rawConfirmation) {
        setPaymentConfirmation(
          JSON.parse(rawConfirmation) as Record<string, unknown>,
        );
        localStorage.removeItem("payment_confirmation");
      }
    } catch (_error) {
      /* storage unavailable or malformed payload */
    }

    try {
      setTimeout(() => {
        try {
          localStorage.setItem("appointments_refresh", String(Date.now()));
        } catch (_e) {
          /* storage unavailable */
        }
        try {
          window.dispatchEvent(new Event("appointments:refresh"));
        } catch (_e) {
          /* event dispatch unavailable */
        }
      }, 1000);
    } catch (_e) {
      /* outer catch */
    }

    toast.success("Deposit paid! Your appointment is confirmed.");
    setCurrentStep("confirm");
  };

  const canProceed = () => {
    switch (currentStep) {
      case "service":
        return !!booking.serviceId;
      case "doctor":
        return !!booking.doctorId;
      case "datetime":
        return !!booking.date && !!booking.time;
      case "details":
        return (
          !!booking.firstName &&
          !!booking.lastName &&
          !!booking.email &&
          !!booking.phone
        );
      default:
        return true;
    }
  };

  const handleDepositBack = () => {
    setCurrentStep("details");
  };

  // If we're on the deposit step, render DepositPage directly (full page takeover)
  if (currentStep === "deposit") {
    return (
      <MainLayout>
        <DepositPage
          depositAmount={selectedService?.price}
          doctorId={booking.doctorId}
          date={booking.date}
          startTime={booking.time}
          onPaymentSuccess={handlePaymentSuccess}
          onBack={handleDepositBack}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Book Your <span className="gradient-text">Appointment</span>
          </h1>
          <p className="text-muted-foreground">
            Schedule your visit in just a few easy steps
          </p>
        </motion.div>

        <div className="flex justify-center mb-8 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 md:gap-4">
            {steps.map((step, index) => {
              const stepIndex = steps.findIndex((s) => s.id === currentStep);
              const isActive = step.id === currentStep;
              const isComplete = index < stepIndex;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isComplete
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <step.icon className="w-4 h-4" />
                    <span className="text-sm font-medium hidden md:inline">
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 md:mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Service Selection */}
              {currentStep === "service" && (
                <div className="grid md:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <Card
                      key={service.id}
                      className={`cursor-pointer transition-all ${
                        booking.serviceId === service.id
                          ? "ring-2 ring-primary shadow-card"
                          : "hover:shadow-soft"
                      }`}
                      onClick={() =>
                        setBooking((prev) => ({
                          ...prev,
                          serviceId: service.id,
                        }))
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {service.image ? (
                            <img
                              src={service.image}
                              alt={service.name}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Stethoscope className="w-8 h-8 text-primary" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">
                              {service.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {service.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-sm text-muted-foreground">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {service.duration} min
                              </span>
                              <span className="text-sm font-semibold text-primary">
                                ${service.price}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Doctor Selection */}
              {currentStep === "doctor" && (
                <div>
                  {filteredDoctors.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground mb-2">
                          No doctors available for the selected service
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Selected service: {selectedService?.name || "None"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Looking for specialty:{" "}
                          {selectedService?.specialty || "None"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Total doctors in system: {doctors.length}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={handleBack}
                        >
                          Choose Different Service
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {filteredDoctors.map((doctor) => (
                        <Card
                          key={doctor.id}
                          className={`cursor-pointer transition-all ${
                            booking.doctorId === doctor.id
                              ? "ring-2 ring-primary shadow-card"
                              : "hover:shadow-soft"
                          }`}
                          onClick={() =>
                            setBooking((prev) => ({
                              ...prev,
                              doctorId: doctor.id,
                            }))
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {getDoctorImageSrc(doctor) &&
                              !brokenDoctorImages[doctor.id] ? (
                                <img
                                  src={getDoctorImageSrc(doctor)}
                                  alt={`Dr. ${getDoctorDisplayName(doctor)}`}
                                  className="w-16 h-16 rounded-xl object-cover"
                                  onError={() =>
                                    setBrokenDoctorImages((prev) => ({
                                      ...prev,
                                      [doctor.id]: true,
                                    }))
                                  }
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <User className="w-8 h-8 text-primary" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground">
                                  Dr. {getDoctorDisplayName(doctor)}
                                </h3>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {doctor.specialty.replace("-", " ")}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-sm">
                                    ⭐ {doctor.rating}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({doctor.reviewCount} reviews)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Date & Time Selection */}
              {currentStep === "datetime" && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div>
                        <Label className="text-base font-medium">
                          Select Date
                        </Label>
                        {isFetchingSchedule ? (
                          <p className="text-sm text-muted-foreground mt-3">
                            Loading doctor schedule...
                          </p>
                        ) : (
                          <Calendar
                            mode="single"
                            selected={
                              booking.date
                                ? new Date(booking.date + "T00:00:00")
                                : undefined
                            }
                            onSelect={(day) => {
                              if (day) {
                                const y = day.getFullYear();
                                const m = String(day.getMonth() + 1).padStart(
                                  2,
                                  "0",
                                );
                                const d = String(day.getDate()).padStart(
                                  2,
                                  "0",
                                );
                                setBooking((prev) => ({
                                  ...prev,
                                  date: `${y}-${m}-${d}`,
                                  time: "",
                                }));
                              }
                            }}
                            disabled={(day) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              if (day < today) return true;
                              if (
                                doctorWorkingDays.size > 0 &&
                                !doctorWorkingDays.has(day.getDay())
                              )
                                return true;
                              return false;
                            }}
                            className="rounded-md border mt-2"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <Label className="text-base font-medium">
                          Select Time
                        </Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {isFetchingSlots ? (
                            <div className="col-span-3 text-sm text-muted-foreground py-2">
                              Loading available slots...
                            </div>
                          ) : !booking.date ? (
                            <div className="col-span-3 text-sm text-muted-foreground py-2">
                              Please select a date first.
                            </div>
                          ) : slotsError ? (
                            <div className="col-span-3 text-sm text-destructive py-2">
                              Could not load available slots. The scheduling
                              service is temporarily unavailable. Please try
                              again later.
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <div className="col-span-3 text-sm text-muted-foreground py-2">
                              No available slots for this date. Please select
                              another date.
                            </div>
                          ) : (
                            availableSlots.map((slot) => (
                              <Button
                                key={slot}
                                variant={
                                  booking.time === slot ? "default" : "outline"
                                }
                                className={
                                  booking.time === slot
                                    ? "gradient-bg border-0"
                                    : ""
                                }
                                onClick={() =>
                                  setBooking((prev) => ({
                                    ...prev,
                                    time: slot,
                                  }))
                                }
                              >
                                {slot}
                              </Button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Patient Details */}
              {currentStep === "details" && (
                <Card>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={booking.firstName}
                          onChange={(e) =>
                            setBooking((prev) => ({
                              ...prev,
                              firstName: e.target.value,
                            }))
                          }
                          placeholder="John"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={booking.lastName}
                          onChange={(e) =>
                            setBooking((prev) => ({
                              ...prev,
                              lastName: e.target.value,
                            }))
                          }
                          placeholder="Doe"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={booking.email}
                          onChange={(e) =>
                            setBooking((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="john@example.com"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={booking.phone}
                          onChange={(e) =>
                            setBooking((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="+1 555-123-4567"
                          className="mt-2"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="notes">
                          Additional Notes (Optional)
                        </Label>
                        <Textarea
                          id="notes"
                          value={booking.notes}
                          onChange={(e) =>
                            setBooking((prev) => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                          placeholder="Any specific concerns or requests..."
                          className="mt-2"
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Confirmation */}
              {currentStep === "confirm" && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-success" />
                      </div>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        Appointment Confirmed!
                      </h2>
                      <p className="text-muted-foreground text-sm mt-1">
                        Your deposit has been paid and your appointment is
                        booked.
                      </p>
                    </div>
                    {paymentConfirmation && (
                      <div className="rounded-2xl border border-border bg-muted/30 p-4 mb-6 text-left">
                        <h3 className="font-bold text-green-500 text-foreground mb-3 text-center ">
                          Please Check Your Email For Conformation Message
                        </h3>
                        <p className="  text-gray-400 mb-3 text-center ">
                          Cancelling Your Appoinment Should Be Atleast 24hrs
                          Before Appointment Date
                        </p>
                        {/* <div className="grid gap-3 text-sm">
                          {[
                            {
                              label: "Appointment ID",
                              value: String(
                                paymentConfirmation["appointmentId"] ??
                                  paymentConfirmation["appointmentID"] ??
                                  paymentConfirmation["id"] ??
                                  "-",
                              ),
                            },
                            // {
                            //   label: "Doctor",
                            //   value: String(
                            //     paymentConfirmation["doctorName"] ??
                            //       paymentConfirmation["doctor"] ??
                            //       `Dr. ${getDoctorDisplayName(selectedDoctor)}`,
                            //   ),
                            // },
                            // {
                            //   label: "Date",
                            //   value: String(
                            //     paymentConfirmation["date"] ??
                            //       paymentConfirmation["appointmentDate"] ??
                            //       booking.date,
                            //   ),
                            // },
                            // {
                            //   label: "Time",
                            //   value: String(
                            //     paymentConfirmation["startTime"] ??
                            //       paymentConfirmation["time"] ??
                            //       booking.time,
                            //   ),
                            // },
                            // {
                            //   label: "Status",
                            //   value: String(
                            //     paymentConfirmation["status"] ??
                            //       paymentConfirmation["appointmentStatus"] ??
                            //       "Confirmed",
                            //   ),
                            // },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="flex justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0"
                            >
                              <span className="text-muted-foreground">
                                {item.label}
                              </span>
                              <span className="font-medium text-foreground text-right">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div> */}
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="flex justify-between py-3 border-b border-border">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-medium text-foreground">
                          {selectedService?.name}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-border">
                        <span className="text-muted-foreground">Doctor</span>
                        <span className="font-medium text-foreground">
                          Dr. {getDoctorDisplayName(selectedDoctor)}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-border">
                        <span className="text-muted-foreground">
                          Date & Time
                        </span>
                        <span className="font-medium text-foreground">
                          {new Date(booking.date).toLocaleDateString()} at{" "}
                          {booking.time}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-border">
                        <span className="text-muted-foreground">Patient</span>
                        <span className="font-medium text-foreground">
                          {booking.firstName} {booking.lastName}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-border">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium text-foreground">
                          {selectedService?.duration} minutes
                        </span>
                      </div>
                      {/* <div className="flex justify-between py-3 text-lg">
                        <span className="font-medium text-foreground">
                          Total
                        </span>
                        <span className="font-bold gradient-text">
                          ${selectedService?.price}
                        </span>
                      </div> */}
                    </div>
                    <Button
                      className="gradient-bg border-0 w-full mt-6"
                      onClick={() => navigate("/booking/confirmation")}
                    >
                      View My Appointments
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          {currentStep !== ("deposit" as Step) && currentStep !== "confirm" && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === "service"}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {/* ✅ التعديل: Details step بيروح للـ deposit بدون إنشاء appointment */}
              {currentStep === "details" ? (
                <Button
                  className="gradient-bg border-0"
                  onClick={handleDetailsNext}
                  disabled={!canProceed() || isSubmitting}
                >
                  {isSubmitting ? "Please wait..." : "Next"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  className="gradient-bg border-0"
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
