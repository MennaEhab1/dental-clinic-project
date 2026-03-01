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
  Calendar,
  Clock,
  User,
  ArrowLeft,
  ArrowRight,
  Check,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import {
  doctorService,
  serviceService,
  appointmentService,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Doctor, Service } from "@/types";

type Step = "service" | "doctor" | "datetime" | "details" | "confirm";

const steps: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "service", label: "Service", icon: Stethoscope },
  { id: "doctor", label: "Doctor", icon: User },
  { id: "datetime", label: "Date & Time", icon: Calendar },
  { id: "details", label: "Details", icon: User },
  { id: "confirm", label: "Confirm", icon: Check },
];

const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<Step>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

        // Debug: Log what we got from backend
        console.debug("[BookingPage] Doctors loaded from backend:", {
          count: doctorsRes.data.length,
          doctors: doctorsRes.data.map((d) => ({
            id: d.id,
            name: d.name,
            specialty: d.specialty,
            firstName: d.firstName,
            lastName: d.lastName,
          })),
          services: servicesRes.data.map((s) => ({
            id: s.id,
            name: s.name,
            specialty: s.specialty,
          })),
        });
      } catch (error) {
        console.error("[BookingPage] Failed to fetch data:", error);
        toast.error("Failed to load doctors and services. Please try again.");
      } finally {
        setIsFetching(false);
      }
    };
    // Fetch immediately - doctors/services are public endpoints
    fetchData();
  }, []);

  // Require authentication before booking: redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login", { state: { from: location.pathname } });
    }
  }, [isLoading, user, navigate, location]);

  // Autofill patient details from signed-in user
  useEffect(() => {
    if (user) {
      let cachedProfile: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
      } | null = null;

      try {
        const rawCachedProfile = localStorage.getItem("patient_profile_cache");
        if (rawCachedProfile) {
          cachedProfile = JSON.parse(rawCachedProfile) as {
            firstName?: string;
            lastName?: string;
            email?: string;
            phone?: string;
          };
        }
      } catch (error) {
        console.warn(
          "[BookingPage] Failed to parse cached patient profile",
          error,
        );
      }

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

  const selectedService = services.find((s) => s.id === booking.serviceId);
  const selectedDoctor = doctors.find((d) => d.id === booking.doctorId);

  const filteredDoctors = booking.serviceId
    ? doctors.filter((d) => d.specialty === selectedService?.specialty)
    : doctors;

  // Debug: Log filtering
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
          name: d.name,
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const patientId = user?.id || user?.userId || "unknown";

      console.debug("[BookingPage] Submitting appointment with:", {
        patientId,
        doctorId: booking.doctorId,
        serviceId: booking.serviceId,
        date: booking.date,
        time: booking.time,
      });

      const resp = await appointmentService.create({
        patientId,
        doctorId: booking.doctorId,
        serviceId: booking.serviceId,
        date: booking.date,
        time: booking.time,
        duration: selectedService?.duration || 30,
        status: "pending",
        notes: booking.notes,
      });

      console.debug("[BookingPage] ✅ Booking successful, response:", {
        bookingId: resp.data?.id,
        bookingData: JSON.stringify(resp.data, null, 2),
      });

      // mark appointments list for refresh (used by patient appointments page)
      // Add a small delay to ensure backend has persisted the new appointment
      try {
        setTimeout(() => {
          try {
            localStorage.setItem("appointments_refresh", String(Date.now()));
            console.debug(
              "[BookingPage] ✅ Set appointments_refresh flag in localStorage",
            );
          } catch (e) {}
          // dispatch an in-tab event so mounted appointment views refresh immediately
          try {
            window.dispatchEvent(new Event("appointments:refresh"));
            console.debug(
              "[BookingPage] 📢 Dispatched appointments:refresh event after delay",
            );
          } catch (e) {}
        }, 1000); // 1 second delay to ensure backend persistence
      } catch (e) {}
      toast.success("Appointment booked successfully!");
      navigate("/booking/confirmation", { state: { booked: resp.data } });
    } catch (error) {
      console.error("Booking error:", error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to book appointment: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
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

        {/* Progress Steps */}
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

        {/* Step Content */}
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
                          <img
                            src={service.image}
                            alt={service.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
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
                              <img
                                src={doctor.avatar}
                                alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                                className="w-16 h-16 rounded-xl object-cover"
                              />
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground">
                                  Dr. {doctor.firstName} {doctor.lastName}
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
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-base font-medium">
                          Select Date
                        </Label>
                        <Input
                          type="date"
                          value={booking.date}
                          onChange={(e) =>
                            setBooking((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                          min={new Date().toISOString().split("T")[0]}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-base font-medium">
                          Select Time
                        </Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {timeSlots.map((slot) => (
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
                                setBooking((prev) => ({ ...prev, time: slot }))
                              }
                            >
                              {slot}
                            </Button>
                          ))}
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
                    <h2 className="font-display text-xl font-bold text-foreground mb-6">
                      Booking Summary
                    </h2>
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
                          Dr. {selectedDoctor?.firstName}{" "}
                          {selectedDoctor?.lastName}
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
                      <div className="flex justify-between py-3 text-lg">
                        <span className="font-medium text-foreground">
                          Total
                        </span>
                        <span className="font-bold gradient-text">
                          ${selectedService?.price}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === "service"}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {currentStep === "confirm" ? (
              <Button
                className="gradient-bg border-0"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Booking..." : "Confirm Booking"}
                <Check className="w-4 h-4 ml-2" />
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
        </div>
      </div>
    </MainLayout>
  );
}
