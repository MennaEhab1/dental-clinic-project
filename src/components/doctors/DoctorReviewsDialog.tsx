import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Doctor, Review } from "@/types";
import { reviewService } from "@/services/api";

interface DoctorReviewsDialogProps {
  doctor: Doctor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toDoctorDisplayName(doctor: Doctor): string {
  const first = doctor.firstName?.replace(/^\s*dr\.?\s+/i, "").trim();
  const last = doctor.lastName?.replace(/^\s*dr\.?\s+/i, "").trim();
  return [first, last].filter(Boolean).join(" ").trim() || "Doctor";
}

function toPatientDisplayName(review: Review): string {
  const first = review.patient?.firstName?.trim();
  const last = review.patient?.lastName?.trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || "Patient";
}

export function DoctorReviewsDialog({
  doctor,
  open,
  onOpenChange,
}: DoctorReviewsDialogProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const doctorName = toDoctorDisplayName(doctor);

  useEffect(() => {
    if (!open) return;

    const fetchReviews = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await reviewService.getReviewsForDoctor(doctor.id);
        if (response.success) {
          setReviews(response.data || []);
        } else {
          setReviews([]);
          setErrorMessage(response.message || "Unable to load reviews.");
        }
      } catch {
        setReviews([]);
        setErrorMessage("Unable to load reviews.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [open, doctor.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display">
            Reviews for Dr. {doctorName}
          </DialogTitle>
          <DialogDescription>
            Patient reviews submitted for this doctor.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : errorMessage ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {errorMessage}
          </p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No reviews have been submitted for this doctor yet.
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {reviews.map((review, index) => (
                <div
                  key={review.id || `review-${index}`}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={review.patient?.avatar} />
                      <AvatarFallback>
                        {toPatientDisplayName(review)
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {toPatientDisplayName(review)}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(
                            review.updatedAt || review.createdAt,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-0.5 mt-1">
                        {[...Array(5)].map((_, starIndex) => (
                          <Star
                            key={starIndex}
                            className={`w-3.5 h-3.5 ${
                              starIndex < review.rating
                                ? "fill-warning text-warning"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {review.comment || "No comment provided."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
