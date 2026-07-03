import { useEffect, useState, CSSProperties } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { authService } from "@/services/api";

const stripePromise = loadStripe(
  "pk_test_51TOkagLoiZyxnlGRqwSWZUL2KTbJYHtExgYdcBaMfoABgDMLUXr2wWmtUmuGNznzdRjPzBOxYNZFsGyZ5TZz9oyZ00Ead5PZnc",
);

const BASE_URL = "https://smart-teeth-care.runasp.net";
const FIXED_DEPOSIT_AMOUNT = 50;
const PAYMENT_SESSION_SECONDS = 10 * 60;

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
  doctorId: string;
  date: string;
  startTime: string;
  onSuccess: (confirmation: Record<string, unknown>) => void;
}

interface PaymentSessionData {
  clientSecret: string;
  paymentIntentId: string;
}

function getStoredAccessToken(): string {
  return localStorage.getItem("auth_token")?.replace(/^Bearer\s+/i, "") ?? "";
}

async function postPaymentConfirmWithRefresh(
  paymentIntentId: string,
  token: string,
): Promise<Response> {
  const request = (accessToken: string) =>
    fetch(`${BASE_URL}/api/Payment/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ paymentIntentId }),
    });

  let response = await request(token);
  if (response.status !== 401) return response;

  try {
    await authService.refreshToken();
    const refreshedToken = getStoredAccessToken();
    if (refreshedToken) {
      response = await request(refreshedToken);
    }
  } catch {
    // Keep original 401 behavior if refresh is unavailable/failed.
  }

  return response;
}

function formatCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getConfirmationSummary(
  confirmation: Record<string, unknown> | null,
): Array<{ label: string; value: string }> {
  if (!confirmation) return [];

  const valueOrFallback = (...keys: string[]): string => {
    for (const key of keys) {
      const value = confirmation[key];
      if (value == null || value === "") continue;
      return String(value);
    }
    return "-";
  };

  return [
    {
      label: "Appointment ID",
      value: valueOrFallback("appointmentId", "appointmentID", "id"),
    },
    { label: "Doctor", value: valueOrFallback("doctorName", "doctor") },
    {
      label: "Date",
      value: valueOrFallback("date", "appointmentDate", "appointmentDay"),
    },
    {
      label: "Time",
      value: valueOrFallback("startTime", "time", "appointmentTime"),
    },
    {
      label: "Status",
      value: valueOrFallback("status", "appointmentStatus"),
    },
    {
      label: "Payment Intent",
      value: valueOrFallback("paymentIntentId", "paymentIntentID"),
    },
  ];
}

function CheckoutForm({
  depositAmount,
  doctorId,
  date,
  startTime,
  onSuccess,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(PAYMENT_SESSION_SECONDS);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [paymentSession, setPaymentSession] =
    useState<PaymentSessionData | null>(null);

  useEffect(() => {
    if (!expiresAt) return undefined;

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        setSessionExpired(true);
        setLoading(false);
        setError("Payment session expired. Please go back and try again.");
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (!doctorId || !date || !startTime) {
      setError("Missing appointment details. Please go back and select slot.");
      return;
    }

    setLoading(true);
    setError(null);
    setSessionExpired(false);

    try {
      const token = getStoredAccessToken();

      if (!token) {
        throw new Error("You must be logged in to complete payment.");
      }

      let currentSession = paymentSession;
      let effectiveExpiresAt = expiresAt;

      if (!currentSession) {
        // Step 1: Create Stripe PaymentIntent only once per payment session.
        const numericDoctorId = Number(doctorId);

        if (isNaN(numericDoctorId) || numericDoctorId <= 0) {
          throw new Error(
            "Invalid doctor selected. Please choose a doctor again.",
          );
        }

        // Swagger expects date as date-time and startTime as time-span (HH:mm:ss).
        const payloadDate = date.includes("T") ? date : `${date}T00:00:00`;
        const payloadStartTime = /^\d{2}:\d{2}:\d{2}$/.test(startTime)
          ? startTime
          : /^\d{2}:\d{2}$/.test(startTime)
            ? `${startTime}:00`
            : startTime;

        const res = await fetch(`${BASE_URL}/api/Payment/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            doctorId: numericDoctorId,
            date: payloadDate,
            startTime: payloadStartTime,
            paymentMethod: "Visa",
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
          paymentIntentId?: string;
        };

        if (!data.clientSecret) {
          throw new Error("Payment setup did not return a client secret.");
        }

        const paymentIntentId = data.paymentIntentId?.trim();
        if (!paymentIntentId) {
          throw new Error("Payment setup did not return a payment intent ID.");
        }

        currentSession = {
          clientSecret: data.clientSecret,
          paymentIntentId,
        };
        setPaymentSession(currentSession);

        const paymentSessionExpiresAt =
          Date.now() + PAYMENT_SESSION_SECONDS * 1000;
        setExpiresAt(paymentSessionExpiresAt);
        setTimeLeft(PAYMENT_SESSION_SECONDS);
        effectiveExpiresAt = paymentSessionExpiresAt;
      }

      if (effectiveExpiresAt && Date.now() >= effectiveExpiresAt) {
        setSessionExpired(true);
        throw new Error("Payment session expired. Please go back and try again.");
      }

      // Step 2: Confirm the card payment with Stripe Elements.
      const cardElement = elements.getElement(CardElement);
      if (!cardElement)
        throw new Error("Card form not ready. Please refresh and try again.");

      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(currentSession.clientSecret, {
          payment_method: { card: cardElement },
        });

      if (stripeError) throw new Error(stripeError.message ?? "Payment failed");

      if (effectiveExpiresAt && Date.now() >= effectiveExpiresAt) {
        throw new Error("Payment session expired. Please try again.");
      }

      if (paymentIntent?.status === "succeeded") {
        const confirmRes = await postPaymentConfirmWithRefresh(
          currentSession.paymentIntentId,
          token,
        );

        if (!confirmRes.ok) {
          const errText = await confirmRes.text().catch(() => "");
          let errMessage = `Payment confirmation failed (HTTP ${confirmRes.status})`;

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

        const confirmText = await confirmRes.text();
        let confirmation: Record<string, unknown> = {
          paymentIntentId: currentSession.paymentIntentId,
        };

        if (confirmText) {
          try {
            const parsed = JSON.parse(confirmText) as Record<string, unknown>;
            confirmation = {
              ...parsed,
              paymentIntentId: currentSession.paymentIntentId,
            };
          } catch {
            confirmation = {
              paymentIntentId: currentSession.paymentIntentId,
              message: confirmText,
            };
          }
        }

        onSuccess(confirmation);
        setLoading(false);
      } else {
        throw new Error("Payment was not completed. Please try again.");
      }
    } catch (err) {
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
      {/* <div style={styles.countdownBox}>
        <span style={styles.countdownLabel}>Payment session</span>
        <span style={styles.countdownValue}>{formatCountdown(timeLeft)}</span>
      </div> */}

      {(depositAmount != null || FIXED_DEPOSIT_AMOUNT != null) && (
        <div style={styles.amountBox}>
          <span style={styles.amountLabel}>Deposit amount :</span>
          <span style={styles.amountValue}>{FIXED_DEPOSIT_AMOUNT} EGP </span>
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
        disabled={!stripe || loading || sessionExpired}
        style={{
          ...styles.payBtn,
          opacity: !stripe || loading || sessionExpired ? 0.6 : 1,
          cursor:
            !stripe || loading || sessionExpired ? "not-allowed" : "pointer",
        }}
      >
        {loading ? (
          <span style={styles.btnInner}>
            <span style={styles.spinnerSmall} /> Processing...
          </span>
        ) : sessionExpired ? (
          <span style={styles.btnInner}>Session expired</span>
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
  doctorId: string;
  date: string;
  startTime: string;
  onPaymentSuccess: () => void;
  onBack: () => void;
}

export default function DepositPage({
  depositAmount,
  doctorId,
  date,
  startTime,
  onPaymentSuccess,
  onBack,
}: DepositPageProps) {
  const [paid, setPaid] = useState(false);
  const [confirmation, setConfirmation] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const handleSuccess = (paymentConfirmation: Record<string, unknown>) => {
    const confirmationPaymentId =
      String(
        paymentConfirmation.paymentIntentId ??
          paymentConfirmation.paymentIntentID ??
          paymentConfirmation.id ??
          "",
      ) || null;

    try {
      localStorage.setItem(
        "payment_confirmation",
        JSON.stringify(paymentConfirmation),
      );
    } catch (_error) {
      /* storage unavailable */
    }

    setConfirmation(paymentConfirmation);
    setPaymentId(confirmationPaymentId);
    setPaid(true);
    onPaymentSuccess();
  };

  const handleBack = () => {
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
            {confirmation && (
              <div style={styles.confirmationBox}>
                <h3 style={styles.confirmationTitle}>
                  Appointment confirmation
                </h3>
                <div style={styles.confirmationGrid}>
                  {getConfirmationSummary(confirmation).map((item) => (
                    <div key={item.label} style={styles.confirmationRow}>
                      <span style={styles.confirmationLabel}>{item.label}</span>
                      <span style={styles.confirmationValue}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                doctorId={doctorId}
                date={date}
                startTime={startTime}
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
  countdownBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#0d1a28",
    border: "1px solid #1e2d40",
    borderRadius: 10,
    padding: "12px 18px",
  },
  countdownLabel: {
    fontSize: 14,
    color: "#566a7f",
  },
  countdownValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "#00c896",
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
  confirmationBox: {
    width: "100%",
    background: "#0d1a28",
    border: "1px solid #1e2d40",
    borderRadius: 12,
    padding: "16px 18px",
    marginTop: 8,
    textAlign: "left",
  },
  confirmationTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#ffffff",
    margin: "0 0 12px",
  },
  confirmationGrid: {
    display: "grid",
    gap: 10,
  },
  confirmationRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: "1px solid #1e2d40",
    paddingBottom: 8,
  },
  confirmationLabel: {
    fontSize: 12,
    color: "#566a7f",
  },
  confirmationValue: {
    fontSize: 12,
    color: "#ffffff",
    textAlign: "right",
    wordBreak: "break-word",
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
