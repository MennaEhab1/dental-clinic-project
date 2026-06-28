import { useState } from "react";
import { motion } from "framer-motion";
import { Star, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Doctor } from "@/types";
import { Link } from "react-router-dom";
import { DoctorReviewsDialog } from "@/components/doctors/DoctorReviewsDialog";

interface DoctorCardProps {
  doctor: Doctor;
  variant?: "default" | "compact";
}

const specialtyColors: Record<string, string> = {
  general: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  orthodontics:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  cosmetic: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  "oral-surgery":
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pediatric:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  endodontics:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  periodontics:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  prosthodontics:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

const specialtyLabels: Record<string, string> = {
  general: "General Dentistry",
  orthodontics: "Orthodontics",
  cosmetic: "Cosmetic Dentistry",
  "oral-surgery": "Oral Surgery",
  pediatric: "Pediatric Dentistry",
  endodontics: "Endodontics",
  periodontics: "Periodontics",
  prosthodontics: "Prosthodontics",
};

export function DoctorCard({ doctor, variant = "default" }: DoctorCardProps) {
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const normalizedFirstName = (doctor.firstName || "")
    .replace(/^\s*dr\.?\s+/i, "")
    .trim();
  const normalizedLastName = (doctor.lastName || "")
    .replace(/^\s*dr\.?\s+/i, "")
    .trim();
  const fullName =
    [normalizedFirstName, normalizedLastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Doctor";

  if (variant === "compact") {
    return (
      <>
        <motion.div
          whileHover={{ y: -2 }}
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:shadow-soft transition-shadow"
        >
          <img
            src={doctor.avatar}
            alt={`Dr. ${fullName}`}
            className="w-14 h-14 rounded-xl object-cover"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground truncate">
              Dr. {fullName}
            </h4>
            <p className="text-sm text-muted-foreground">
              {specialtyLabels[doctor.specialty]}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-warning fill-warning" />
            <span className="text-sm font-medium">{doctor.rating}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReviewsOpen(true)}
          >
            Reviews
          </Button>
        </motion.div>
        <DoctorReviewsDialog
          doctor={doctor}
          open={reviewsOpen}
          onOpenChange={setReviewsOpen}
        />
      </>
    );
  }

  return (
    <>
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow">
        <div className="relative">
          <img
            src={doctor.avatar}
            alt={`Dr. ${fullName}`}
            className="w-full h-56 object-cover"
          />
          <div className="absolute top-3 right-3">
            <Badge className={`${specialtyColors[doctor.specialty]} border-0`}>
              {specialtyLabels[doctor.specialty]}
            </Badge>
          </div>
        </div>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">
                Dr. {fullName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {doctor.experience} years experience
              </p>
            </div>
            <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg">
              <Star className="w-4 h-4 text-warning fill-warning" />
              <span className="text-sm font-medium">{doctor.rating}</span>
              <span className="text-xs text-muted-foreground">
                ({doctor.reviewCount})
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {doctor.bio}
          </p>
          <div className="flex items-center gap-2 mb-4">
            {doctor.qualifications.slice(0, 2).map((qual) => (
              <Badge key={qual} variant="secondary" className="text-xs">
                {qual}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <span className="text-xs text-muted-foreground">
                Consultation
              </span>
              <p className="font-semibold text-primary">
                ${doctor.consultationFee}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewsOpen(true)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Reviews
              </Button>
              <Link to={`/booking?doctor=${doctor.id}`}>
                <Button className="gradient-bg border-0">Book Now</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>
      <DoctorReviewsDialog
        doctor={doctor}
        open={reviewsOpen}
        onOpenChange={setReviewsOpen}
      />
    </>
  );
}
