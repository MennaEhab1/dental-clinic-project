import { useState, useEffect, CSSProperties } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_test_51TOkagLoiZyxnlGRqwSWZUL2KTbJYHtExgYdcBaMfoABgDMLUXr2wWmtUmuGNznzdRjPzBOxYNZFsGyZ5TZz9oyZ00Ead5PZnc");

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
  appointmentId: number;
  onSuccess: (paymentIntent: { id: string; status: string }) => void;
}

function CheckoutForm({ appointmentId, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchingIntent, setFetchingIntent] = useState(true);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        // ✅ التعديل: استخدام "auth_token" بدل "token"
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`${BASE_URL}/api/Payment/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ appointmentId }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            (errData as { message?: string }).message ||
              "Failed to create payment intent"
          );
        }

        const data = await res.json() as {
          clientSecret: string;
          amount?: number;
          depositAmount?: number;
        };

        setClientSecret(data.clientSecret);
        setDepositAmount(data.amount ?? data.depositAmount ?? null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
      } finally {
        setFetchingIntent(false);
      }
    };

    if (appointmentId) createPaymentIntent();
  }, [appointmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const { error: stripeError, paymentIntent } =
      await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent);
    } else {
      setError("Payment was not completed. Please try again.");
      setLoading(false);
    }
  };

  if (fetchingIntent) {
    return (
      <div style={styles.centered}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Preparing your payment...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {depositAmount !== null && (
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
      )}

      <button
        type="submit"
        disabled={!stripe || loading || fetchingIntent}
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

// ✅ التعديل: onPaymentSuccess بتستقبل paymentIntentId
interface DepositPageProps {
  appointmentId: number;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
}

export default function DepositPage({
  appointmentId,
  onPaymentSuccess,
  onBack,
}: DepositPageProps) {
  const [paid, setPaid] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // ✅ التعديل: بيبعت الـ paymentIntentId للـ parent
  const handleSuccess = (pi: { id: string; status: string }) => {
    setPaymentId(pi.id);
    setPaid(true);
    onPaymentSuccess(pi.id);
  };

  return (
    <div style={styles.page}>
      <div style={styles.progressBar}>
        {["Service", "Doctor", "Date & Time", "Details", "Deposit", "Confirm"].map(
          (step, i) => {
            const active = i === 4;
            const done = i < 4;
            return (
              <div key={step} style={styles.progressItem}>
                <div
                  style={{
                    ...styles.progressDot,
                    background: done || active ? "#00c896" : "#2a3a4a",
                    border: active ? "2px solid #00c896" : "none",
                    boxShadow: active
                      ? "0 0 0 4px rgba(0,200,150,0.15)"
                      : "none",
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
          }
        )}
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
              Your appointment is confirmed. A confirmation will be sent to
              your email.
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
                appointmentId={appointmentId}
                onSuccess={handleSuccess}
              />
            </Elements>

            <button onClick={onBack} style={styles.backBtn}>
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