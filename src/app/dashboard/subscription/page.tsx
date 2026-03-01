"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  Crown,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Zap,
  Users,
  Calendar,
  Globe,
  Sparkles,
  Palette,
  Shield,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSession } from "next-auth/react";

interface Plan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  paypalPlanId: string;
  features: {
    maxDoctors: number;
    maxPatients: number;
    maxAppointmentsPerMonth: number;
    patientPortal: boolean;
    aiSummary: boolean;
    customBranding: boolean;
  };
}

interface CurrentSubscription {
  subscription: {
    id: string;
    status: string;
    paypalSubscriptionId: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  plan: Plan | null;
  clinic: {
    subscriptionStatus: string;
    trialEndsAt: string | null;
  };
  usage: {
    doctors: number;
    patients: number;
    appointmentsThisMonth: number;
  };
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
        </div>
      }
    >
      <SubscriptionPageContent />
    </Suspense>
  );
}

function SubscriptionPageContent() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isAdmin = session?.user?.role === "admin";

  // Check URL params for post-checkout status
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setMessage({
        type: "success",
        text: "Payment successful! Your subscription is being activated. It may take a moment.",
      });
    } else if (status === "cancelled") {
      setMessage({
        type: "error",
        text: "Checkout was cancelled. You can try again anytime.",
      });
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [plansRes, currentRes] = await Promise.all([
        fetch("/api/subscriptions/plans"),
        fetch("/api/subscriptions/current"),
      ]);

      if (plansRes.ok) {
        setPlans(await plansRes.json());
      }
      if (currentRes.ok) {
        setCurrent(await currentRes.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    setMessage(null);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Checkout failed" });
        return;
      }

      // Redirect to PayPal
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancel = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You will lose access at the end of your billing period."
      )
    )
      return;

    setCancelLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by admin from dashboard" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Cancellation failed",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Subscription cancelled successfully.",
      });
      fetchData(); // refresh
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading subscription info…
          </p>
        </div>
      </div>
    );
  }

  const clinicStatus = current?.clinic?.subscriptionStatus || "none";
  const trialEndsAt = current?.clinic?.trialEndsAt;
  const trialDaysLeft = trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(trialEndsAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const currentPlan = current?.plan;
  const usage = current?.usage;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="page-title">
          <CreditCard className="h-6 w-6 text-sky-500" />
          <span>Subscription & Billing</span>
        </h1>
        <p className="page-subtitle">
          Manage your clinic's subscription plan and billing
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={
            message.type === "success" ? "alert-success" : "alert-error"
          }
        >
          {message.text}
        </div>
      )}

      {/* Trial Banner */}
      {clinicStatus === "trialing" && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/30">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                Free Trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}{" "}
                left
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Your free trial expires on{" "}
                <strong>
                  {new Date(trialEndsAt!).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
                . Choose a plan below to continue using CarePilot without
                interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expired / Cancelled Banner */}
      {(clinicStatus === "expired" || clinicStatus === "cancelled") && (
        <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-6 dark:border-red-800 dark:from-red-950/30 dark:to-rose-950/30">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                {clinicStatus === "expired"
                  ? "Trial Expired"
                  : "Subscription Cancelled"}
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {clinicStatus === "expired"
                  ? "Your free trial has ended. Subscribe to a plan to continue using CarePilot."
                  : "Your subscription has been cancelled. Choose a plan below to reactivate."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan + Usage */}
      {currentPlan && clinicStatus === "active" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Current Plan Card */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900 dark:text-sky-400">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {currentPlan.name} Plan
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Active subscription
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Shield className="mr-1 h-3 w-3" />
                Active
              </span>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {currentPlan.currency === "JOD" ? "JD" : "$"}
                  {currentPlan.price}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  /{currentPlan.interval === "YEAR" ? "year" : "month"}
                </span>
              </div>
              {current?.subscription?.currentPeriodEnd && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Next billing:{" "}
                  {new Date(
                    current.subscription.currentPeriodEnd
                  ).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              {isAdmin && (
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="mt-4 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                >
                  {cancelLoading ? "Cancelling…" : "Cancel Subscription"}
                </button>
              )}
            </div>
          </div>

          {/* Usage Card */}
          <div className="card">
            <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
              Current Usage
            </h3>
            <div className="space-y-4">
              <UsageBar
                label="Doctors"
                icon={<Users className="h-4 w-4" />}
                current={usage?.doctors || 0}
                max={currentPlan.features.maxDoctors}
              />
              <UsageBar
                label="Patients"
                icon={<Users className="h-4 w-4" />}
                current={usage?.patients || 0}
                max={currentPlan.features.maxPatients}
              />
              <UsageBar
                label="Appointments (this month)"
                icon={<Calendar className="h-4 w-4" />}
                current={usage?.appointmentsThisMonth || 0}
                max={currentPlan.features.maxAppointmentsPerMonth}
              />
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div>
        <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
          {clinicStatus === "active" ? "Switch Plan" : "Choose a Plan"}
        </h2>

        {plans.length === 0 ? (
          <div className="card py-12 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              No subscription plans available yet. Plans will be configured by
              the platform administrator.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = currentPlan?._id === plan._id;
              const isPopular = plan.slug === "pro";

              return (
                <div
                  key={plan._id}
                  className={`relative overflow-hidden rounded-2xl border p-6 transition-all ${
                    isPopular
                      ? "border-sky-300 bg-gradient-to-b from-sky-50/80 to-white shadow-lg shadow-sky-100/50 dark:border-sky-700 dark:from-sky-950/30 dark:to-slate-900 dark:shadow-sky-950/30"
                      : "border-slate-200 bg-white/80 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute right-4 top-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-white">
                        <Zap className="h-3 w-3" />
                        Popular
                      </span>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute right-4 top-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                        <Check className="h-3 w-3" />
                        Current
                      </span>
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {plan.name}
                  </h3>
                  {plan.description && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {plan.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">
                      {plan.currency === "JOD" ? "JD" : "$"}
                      {plan.price}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      /{plan.interval === "YEAR" ? "year" : "mo"}
                    </span>
                  </div>

                  <ul className="mt-6 space-y-3">
                    <FeatureItem
                      icon={<Users className="h-4 w-4" />}
                      text={
                        plan.features.maxDoctors === -1
                          ? "Unlimited doctors"
                          : `Up to ${plan.features.maxDoctors} doctors`
                      }
                    />
                    <FeatureItem
                      icon={<Users className="h-4 w-4" />}
                      text={
                        plan.features.maxPatients === -1
                          ? "Unlimited patients"
                          : `Up to ${plan.features.maxPatients} patients`
                      }
                    />
                    <FeatureItem
                      icon={<Calendar className="h-4 w-4" />}
                      text={
                        plan.features.maxAppointmentsPerMonth === -1
                          ? "Unlimited appointments"
                          : `${plan.features.maxAppointmentsPerMonth} appointments/mo`
                      }
                    />
                    <FeatureItem
                      icon={<Globe className="h-4 w-4" />}
                      text="Patient Portal"
                      enabled={plan.features.patientPortal}
                    />
                    <FeatureItem
                      icon={<Sparkles className="h-4 w-4" />}
                      text="AI Visit Summary"
                      enabled={plan.features.aiSummary}
                    />
                    <FeatureItem
                      icon={<Palette className="h-4 w-4" />}
                      text="Custom Branding"
                      enabled={plan.features.customBranding}
                    />
                  </ul>

                  <div className="mt-6">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                      >
                        Current Plan
                      </button>
                    ) : isAdmin ? (
                      <button
                        onClick={() => handleCheckout(plan._id)}
                        disabled={
                          checkoutLoading === plan._id || !plan.paypalPlanId
                        }
                        className={`w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                          isPopular
                            ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md hover:shadow-lg hover:from-sky-600 hover:to-cyan-600"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        } disabled:opacity-50`}
                      >
                        {checkoutLoading === plan._id ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Redirecting…
                          </span>
                        ) : !plan.paypalPlanId ? (
                          "Coming Soon"
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Subscribe
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        )}
                      </button>
                    ) : (
                      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                        Contact your clinic admin to change plans
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Info */}
      <div className="card card-muted">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-sky-500" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Secure Payments via PayPal
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              All payments are processed securely through PayPal. You can pay
              with credit/debit cards (Visa, Mastercard) or your PayPal balance.
              Subscriptions renew automatically each billing cycle. You can
              cancel anytime from this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function FeatureItem({
  icon,
  text,
  enabled = true,
}: {
  icon: React.ReactNode;
  text: string;
  enabled?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 text-sm">
      {enabled ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
          <Check className="h-3 w-3" />
        </span>
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <X className="h-3 w-3" />
        </span>
      )}
      <span
        className={
          enabled
            ? "text-slate-700 dark:text-slate-300"
            : "text-slate-400 line-through dark:text-slate-500"
        }
      >
        {text}
      </span>
    </li>
  );
}

function UsageBar({
  label,
  icon,
  current,
  max,
}: {
  label: string;
  icon: React.ReactNode;
  current: number;
  max: number;
}) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min(100, (current / max) * 100);
  const isNearLimit = !unlimited && pct >= 80;
  const isAtLimit = !unlimited && pct >= 100;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          {icon}
          {label}
        </div>
        <span
          className={`text-xs font-medium ${
            isAtLimit
              ? "text-red-600 dark:text-red-400"
              : isNearLimit
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {current} / {unlimited ? "∞" : max}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              isAtLimit
                ? "bg-red-500"
                : isNearLimit
                ? "bg-amber-500"
                : "bg-sky-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
