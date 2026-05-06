import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/api";

type Status = "loading" | "success" | "error";

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const userId =
      searchParams.get("UserId") ||
      searchParams.get("userId") ||
      searchParams.get("userid") ||
      "";
    const token = searchParams.get("Token") || searchParams.get("token") || "";

    if (!userId || !token) {
      setErrorMessage(
        "Invalid confirmation link. Please use the full link from your email.",
      );
      setStatus("error");
      return;
    }

    authService
      .confirmEmail(userId, token)
      .then(() => {
        setStatus("success");
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Email confirmation failed.";
        setErrorMessage(msg);
        setStatus("error");
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-card text-center"
      >
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold text-foreground">
              Confirming your email…
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Please wait while we verify your email address.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold text-foreground">
              Email Confirmed!
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your email has been successfully verified. You can now sign in to
              your account.
            </p>
            <Button asChild className="mt-6 w-full gradient-bg border-0">
              <Link to="/login">Sign In</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold text-foreground">
              Confirmation Failed
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {errorMessage ||
                "We could not confirm your email. The link may be expired or invalid."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Back to Sign In</Link>
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
