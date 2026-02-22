import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  MessageSquare,
  Edit2,
  Trash2,
  Send,
  Calendar,
} from "lucide-react";
import type { Review, Appointment } from "@/types";
import { reviewService, appointmentService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface ReviewWithAppointment extends Review {
  appointmentDate?: string;
  appointmentService?: string;
}

interface ReviewFormData {
  doctorId: string;
  doctorName: string;
  rating: number;
  comment: string;
}

export default function PatientReviews() {
  const [reviews, setReviews] = useState<ReviewWithAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] =
    useState<ReviewWithAppointment | null>(null);
  const [formData, setFormData] = useState<ReviewFormData>({
    doctorId: "",
    doctorName: "",
    rating: 5,
    comment: "",
  });
  const [completedAppointments, setCompletedAppointments] = useState<
    Appointment[]
  >([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);

        // Fetch user's reviews
        const reviewsResult = await reviewService.getMyReviews();
        if (reviewsResult.success && reviewsResult.data) {
          setReviews(reviewsResult.data);
        }

        // Fetch completed appointments for writing new reviews
        const appointmentsResult = await appointmentService.getByPatient();
        if (appointmentsResult.success && appointmentsResult.data) {
          const completed = appointmentsResult.data.filter(
            (apt) => apt.status === "completed",
          );
          setCompletedAppointments(completed);
        }
      } catch (error) {
        console.error("[PatientReviews] Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [user]);

  const handleSubmitReview = async () => {
    if (
      !formData.doctorId ||
      !formData.comment.trim() ||
      formData.rating === 0
    ) {
      alert("Please fill in all fields");
      return;
    }

    try {
      if (editingReview) {
        // Update existing review
        const result = await reviewService.updateReview(editingReview.id, {
          rating: formData.rating,
          comment: formData.comment,
        });
        if (result.success) {
          setReviews(
            reviews.map((r) =>
              r.id === editingReview.id
                ? { ...r, rating: formData.rating, comment: formData.comment }
                : r,
            ),
          );
          alert("Review updated successfully!");
        }
      } else {
        // Add new review
        const result = await reviewService.addReview({
          doctorId: formData.doctorId,
          rating: formData.rating,
          comment: formData.comment,
        });
        if (result.success) {
          // Refresh reviews
          const reviewsResult = await reviewService.getMyReviews();
          if (reviewsResult.success && reviewsResult.data) {
            setReviews(reviewsResult.data);
          }
          alert("Review submitted successfully!");
        }
      }

      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error("[PatientReviews] Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      const result = await reviewService.deleteReview(reviewId);
      if (result.success) {
        setReviews(reviews.filter((r) => r.id !== reviewId));
        alert("Review deleted successfully!");
      }
    } catch (error) {
      console.error("[PatientReviews] Error deleting review:", error);
      alert("Failed to delete review. Please try again.");
    }
  };

  const handleEditReview = (review: ReviewWithAppointment) => {
    setEditingReview(review);
    setFormData({
      doctorId: review.doctorId,
      doctorName: review.doctor?.firstName
        ? `Dr. ${review.doctor.firstName} ${review.doctor.lastName}`
        : "Unknown Doctor",
      rating: review.rating,
      comment: review.comment,
    });
    setShowForm(true);
  };

  const handleNewReview = (doctorId: string, doctorName: string) => {
    setEditingReview(null);
    setFormData({
      doctorId,
      doctorName,
      rating: 5,
      comment: "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      doctorId: "",
      doctorName: "",
      rating: 5,
      comment: "",
    });
    setEditingReview(null);
  };

  if (isLoading) {
    return (
      <DashboardLayout role="patient">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reviews
          </h1>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Reviews & Ratings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Share your experience and help others
            </p>
          </div>
          <Button onClick={() => handleNewReview("", "")} className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Write Review
          </Button>
        </div>

        {/* My Reviews Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            My Reviews
          </h2>
          {reviews.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-12 pb-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  You haven't written any reviews yet
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleNewReview("", "")}
                >
                  Write Your First Review
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Avatar className="h-10 w-10 mt-1">
                            <AvatarImage src={review.doctor?.avatar} />
                            <AvatarFallback>
                              {review.doctor?.firstName?.[0]}
                              {review.doctor?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                Dr. {review.doctor?.firstName}{" "}
                                {review.doctor?.lastName}
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {review.doctor?.specialty || "General Dentistry"}
                            </p>

                            {/* Star Rating Display */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  review.updatedAt || review.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>

                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              {review.comment}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditReview(review)}
                            className="gap-1"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReview(review.id)}
                            className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Available Doctors for Review */}
        {completedAppointments.length > 0 && (
          <div>
            <Separator />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
              You can review these doctors
            </h2>
            <div className="grid gap-4">
              {completedAppointments
                .map((apt) => apt.doctor)
                .filter(
                  (doc, idx, self) =>
                    doc &&
                    self.findIndex((d) => d?.id === doc.id) === idx &&
                    !reviews.some((r) => r.doctorId === doc.id),
                )
                .map((doctor, index) => (
                  <motion.div
                    key={doctor?.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={doctor?.avatar} />
                              <AvatarFallback>
                                {doctor?.firstName?.[0]}
                                {doctor?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                Dr. {doctor?.firstName} {doctor?.lastName}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {doctor?.specialty || "General Dentistry"}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() =>
                              handleNewReview(
                                doctor?.id || "",
                                `Dr. ${doctor?.firstName} ${doctor?.lastName}`,
                              )
                            }
                            className="gap-2"
                          >
                            <Star className="w-4 h-4" />
                            Write Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingReview ? "Edit Review" : "Write a Review"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
              {/* Doctor Display */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {formData.doctorName?.[4]}
                    {formData.doctorName?.[5]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">
                    {formData.doctorName}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= formData.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-3">
                <Label htmlFor="comment" className="text-base font-semibold">
                  Your Experience
                </Label>
                <Textarea
                  id="comment"
                  placeholder="Share your experience with this doctor..."
                  value={formData.comment}
                  onChange={(e) =>
                    setFormData({ ...formData, comment: e.target.value })
                  }
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-gray-500">
                  {formData.comment.length}/500 characters
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitReview} className="gap-2">
                  <Send className="w-4 h-4" />
                  {editingReview ? "Update Review" : "Submit Review"}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
