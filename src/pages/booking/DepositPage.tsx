import { useState, useEffect, CSSProperties } from "react";
import { useState, useEffect, useRef, CSSProperties } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  "pk_test_51TOkagLoiZyxnlGRqwSWZUL2KTbJYHtExgYdcBaMfoABgDMLUXr2wWmtUmuGNznzdRjPzBOxYNZFsGyZ5TZz9oyZ00Ead5PZnc",
);

const BASE_URL = "https://smart-teeth-care.runasp.net";

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#ffffff",
      fontFamily: "'Segoe UI', sans-serif",
      "::placeholder": { color: "#8899aa" },
      iconColor: "#00c896",
    },
    invalid: { color: "#ff6b6b", iconColor: "#ff6b6b" },
  },
};

interface CheckoutFormProps {
  depositAmount: number | undefined;
  // null = appointment not yet created; non-null = reuse this ID on every retry
  pendingAppointmentId: number | null;
  createAppointmentAndGetId: () => Promise<number>;
  onAppointmentCreated: (id: number) => void;
  onSuccess: (
    paymentIntent: { id: string; status: string },
    appointmentId: number,
  ) => void;
}

function CheckoutForm({
  depositAmount,
  pendingAppointmentId,
  createAppointmentAndGetId,
  onAppointmentCreated,
  onSuccess,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create the appointment exactly once for this deposit session.
      // On every retry the same appointment ID is reused — we never cancel and
      // recreate because that causes "slot already booked" race conditions.
      // The slot stays claimed by this session until the user clicks Back.
      let apptId = pendingAppointmentId;
      if (apptId === null) {
        apptId = await createAppointmentAndGetId();
        onAppointmentCreated(apptId);
      }

      // Step 2: Create a Stripe payment intent for this appointment.
      // Safe to call multiple times — each call gets a fresh clientSecret.
      const rawToken = localStorage.getItem("auth_token");
      const token = rawToken?.replace(/^Bearer\s+/i, "") ?? "";

      let patientIdForPayment: number | undefined;
      try {
        const claims = JSON.parse(atob(token.split(".")[1]));
        const raw = claims.PatientId ?? claims.patientId;
        if (raw != null && !isNaN(Number(raw)) && Number(raw) > 0) {
          patientIdForPayment = Number(raw);
        }
      } catch {
        /* ignore – token may be absent or malformed */
      }

      const res = await fetch(`${BASE_URL}/api/Payment/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId: apptId,
          ...(patientIdForPayment !== undefined
            ? { patientId: patientIdForPayment }
            : {}),
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMessage = `Payment setup failed (HTTP ${res.status})`;
        try {
          const errData = JSON.parse(errText) as Record<string, unknown>;
          errMessage =
            (errData.message as string) ||
            (errData.title as string) ||
            (errData.detail as string) ||
            (typeof errData.errors === "object"
              ? JSON.stringify(errData.errors)
              : "") ||
            errMessage;
        } catch {
          if (errText) errMessage = errText;
        }
        throw new Error(errMessage);
      }

      const data = (await res.json()) as {
        clientSecret: string;
        amount?: number;
        depositAmount?: number;
      };

      // Step 3: Confirm the card payment.
      const cardElement = elements.getElement(CardElement);
      if (!cardElement)
        throw new Error("Card form not ready. Please refresh and try again.");

      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: { card: cardElement },
        });

      if (stripeError) throw new Error(stripeError.message ?? "Payment failed");

      if (paymentIntent?.status === "succeeded") {
        onSuccess(paymentIntent, apptId);
      } else {
        throw new Error("Payment was not completed. Please try again.");
      }
    } catch (err) {
      // Do NOT cancel the appointment on payment failure.
      // The slot stays claimed so the next retry can reuse the same appointment
      // without hitting a "slot already booked" conflict.
      // Cancellation only happens when the user explicitly clicks Back.
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {depositAmount != null && (
        <div style={styles.amountBox}>
          <span style={styles.amountLabel}>Deposit amount</span>
          <span style={styles.amountValue}>${depositAmount}</span>
        </div>
      )}

      <div style={styles.cardBox}>
        <label style={styles.cardLabel}>Card details</label>
        <div style={styles.cardElementWrapper}>
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      {error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={styles.errorBox}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          ...styles.payBtn,
          opacity: !stripe || loading ? 0.6 : 1,
          cursor: !stripe || loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? (
          <span style={styles.btnInner}>
            <span style={styles.spinnerSmall} /> Processing...
          </span>
        ) : (
          "Pay Deposit"
        )}
      </button>

      <p style={styles.secureNote}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ verticalAlign: "middle", marginRight: 4 }}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secured by Stripe · Your card info is never stored on our servers
      </p>
    </form>
  );
}

interface DepositPageProps {
  depositAmount: number | undefined;
  createAppointmentAndGetId: () => Promise<number>;
  onPaymentSuccess: (appointmentId: number) => void;
  onBack: () => void;
}

export default function DepositPage({
  depositAmount,
  createAppointmentAndGetId,
  onPaymentSuccess,
  onBack,
}: DepositPageProps) {
  const [paid, setPaid] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  // Created once on first Pay-click; reused on retries; cancelled on Back/unmount.
  const [pendingAppointmentId, setPendingAppointmentId] = useState<
    number | null
  >(null);

  // Refs so the cleanup effects can read the latest values without stale closures.
  const pendingIdRef = useRef<number | null>(null);
  const paymentDoneRef = useRef(false);

  useEffect(() => {
    pendingIdRef.current = pendingAppointmentId;
  }, [pendingAppointmentId]);

  // Cancel the appointment if the user navigates away mid-payment (browser back,
  // tab close, React Router navigation) before the payment succeeds.
  useEffect(() => {
    return () => {
      if (pendingIdRef.current !== null && !paymentDoneRef.current) {
        const rawToken = localStorage.getItem("auth_token");
        const token = rawToken?.replace(/^Bearer\s+/i, "") ?? "";
        fetch(
          `${BASE_URL}/api/PatientAppointment/CancelAppointment/${pendingIdRef.current}`,
          { method: "PATCH", headers: { Authorization: `Bearer ${token}` } },
        ).catch(() => {});
      }
    };
  }, []);

  const handleSuccess = (
    pi: { id: string; status: string },
    appointmentId: number,
  ) => {
    paymentDoneRef.current = true; // prevent unmount cleanup from cancelling
    setPaymentId(pi.id);
    setPaid(true);
    setPendingAppointmentId(null);
    onPaymentSuccess(appointmentId);
  };

  const handleBack = async () => {
    if (pendingAppointmentId !== null) {
      const rawToken = localStorage.getItem("auth_token");
      const token = rawToken?.replace(/^Bearer\s+/i, "") ?? "";
      // Await the cancel so the slot is freed before the booking page reloads slots.
      await fetch(
        `${BASE_URL}/api/PatientAppointment/CancelAppointment/${pendingAppointmentId}`,
        { method: "PATCH", headers: { Authorization: `Bearer ${token}` } },
      ).catch(() => {});
      setPendingAppointmentId(null);
    }
    onBack();
  };

  return (
    <div style={styles.page}>
      <div style={styles.progressBar}>
        {[
          "Service",
          "Doctor",
          "Date & Time",
          "Details",
          "Deposit",
          "Confirm",
        ].map((step, i) => {
          const active = i === 4;
          const done = i < 4;
          return (
            <div key={step} style={styles.progressItem}>
              <div
                style={{
                  ...styles.progressDot,
                  background: done || active ? "#00c896" : "#2a3a4a",
                  border: active ? "2px solid #00c896" : "none",
                  boxShadow: active ? "0 0 0 4px rgba(0,200,150,0.15)" : "none",
                }}
              >
                {done && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0a1628"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span
                style={{
                  ...styles.progressLabel,
                  color: active ? "#00c896" : done ? "#ffffff" : "#566a7f",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {step}
              </span>
              {i < 5 && <div style={styles.progressLine} />}
            </div>
          );
        })}
      </div>

      <div style={styles.card}>
        {paid ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0a1628"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={styles.successTitle}>Deposit Paid Successfully!</h2>
            <p style={styles.successSub}>
              Your appointment is confirmed. A confirmation will be sent to your
              email.
            </p>
            {paymentId && (
              <p style={styles.successId}>
                Payment ID: <code style={styles.code}>{paymentId}</code>
              </p>
            )}
          </div>
        ) : (
          <>
            <div style={styles.cardHeader}>
              <h1 style={styles.title}>Pay Deposit</h1>
              <p style={styles.subtitle}>
                Complete your deposit to confirm your appointment
              </p>
            </div>

            <Elements stripe={stripePromise}>
              <CheckoutForm
                depositAmount={depositAmount}
                pendingAppointmentId={pendingAppointmentId}
                createAppointmentAndGetId={createAppointmentAndGetId}
                onAppointmentCreated={setPendingAppointmentId}
                onSuccess={handleSuccess}
              />
            </Elements>

            <button onClick={handleBack} style={styles.backBtn}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0a1628",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 16px",
    fontFamily: "'Segoe UI', sans-serif",
  },
  progressBar: {
    display: "flex",
    alignItems: "center",
    marginBottom: 40,
    gap: 0,
  },
  progressItem: {
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  progressLabel: {
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  progressLine: {
    width: 32,
    height: 1,
    background: "#1e2d40",
    margin: "0 6px",
  },
  card: {
    background: "#111e2e",
    border: "1px solid #1e2d40",
    borderRadius: 16,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 480,
  },
  cardHeader: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#ffffff",
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#566a7f",
    marginTop: 6,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  amountBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#0d1a28",
    border: "1px solid #1e2d40",
    borderRadius: 10,
    padding: "14px 18px",
  },
  amountLabel: {
    fontSize: 14,
    color: "#566a7f",
  },
  amountValue: {
    fontSize: 22,
    fontWeight: 700,
    color: "#00c896",
  },
  cardBox: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  cardLabel: {
    fontSize: 13,
    color: "#8899aa",
    fontWeight: 500,
  },
  cardElementWrapper: {
    background: "#0d1a28",
    border: "1px solid #1e2d40",
    borderRadius: 10,
    padding: "14px 16px",
  },
  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    background: "rgba(255,107,107,0.1)",
    border: "1px solid rgba(255,107,107,0.3)",
    borderRadius: 8,
    padding: "12px 14px",
    color: "#ff6b6b",
    fontSize: 14,
  },
  payBtn: {
    background: "#00c896",
    color: "#0a1628",
    border: "none",
    borderRadius: 10,
    padding: "14px",
    fontSize: 16,
    fontWeight: 700,
    width: "100%",
    transition: "opacity 0.2s",
  },
  btnInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secureNote: {
    fontSize: 12,
    color: "#566a7f",
    textAlign: "center",
    margin: 0,
  },
  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 0",
    gap: 12,
  },
  loadingText: {
    color: "#566a7f",
    fontSize: 14,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #1e2d40",
    borderTop: "3px solid #00c896",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  spinnerSmall: {
    display: "inline-block",
    width: 16,
    height: 16,
    border: "2px solid rgba(10,22,40,0.3)",
    borderTop: "2px solid #0a1628",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  backBtn: {
    background: "transparent",
    border: "none",
    color: "#566a7f",
    fontSize: 14,
    cursor: "pointer",
    marginTop: 8,
    padding: 0,
    textAlign: "left",
  },
  successBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 12,
    padding: "20px 0",
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#00c896",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#ffffff",
    margin: 0,
  },
  successSub: {
    fontSize: 14,
    color: "#566a7f",
    margin: 0,
  },
  successId: {
    fontSize: 13,
    color: "#566a7f",
    margin: 0,
  },
  code: {
    fontFamily: "monospace",
    color: "#8899aa",
    fontSize: 12,
  },
};
