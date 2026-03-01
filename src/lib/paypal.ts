/**
 * PayPal REST API client — used for subscription billing.
 *
 * Environment variables required:
 *   PAYPAL_CLIENT_ID      – PayPal app client ID
 *   PAYPAL_CLIENT_SECRET   – PayPal app secret
 *   PAYPAL_MODE            – "sandbox" | "live"  (default: sandbox)
 *   PAYPAL_WEBHOOK_ID      – The webhook ID from PayPal dashboard (for verification)
 */

const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";

const BASE_URL =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// ─── Access Token ────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  // Reuse token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth failed: ${err}`);
  }

  const data = await res.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

// ─── Generic request helper ─────────────────────────────────

async function paypalRequest(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getPayPalAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  // Some PayPal endpoints return 204 with no body
  if (res.status === 204) return null;

  const body = await res.json();

  if (!res.ok) {
    console.error("PayPal API error:", JSON.stringify(body, null, 2));
    throw new Error(body.message || `PayPal request failed (${res.status})`);
  }

  return body;
}

// ─── Products ─────────────────────────────────────────────────

export async function createPayPalProduct(name: string, description: string) {
  return paypalRequest("/v1/catalogs/products", {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });
}

// ─── Billing Plans ─────────────────────────────────────────────

interface CreatePlanParams {
  productId: string;
  name: string;
  description: string;
  price: number; // e.g. 29.00
  currency: string; // e.g. "USD" or "JOD"
  interval: "MONTH" | "YEAR";
  trialDays?: number;
}

export async function createPayPalPlan(params: CreatePlanParams) {
  const billingCycles: any[] = [];

  // Optional trial cycle
  if (params.trialDays && params.trialDays > 0) {
    billingCycles.push({
      frequency: {
        interval_unit: "DAY",
        interval_count: params.trialDays,
      },
      tenure_type: "TRIAL",
      sequence: 1,
      total_cycles: 1,
      pricing_scheme: {
        fixed_price: { value: "0", currency_code: params.currency },
      },
    });
  }

  // Regular billing cycle
  billingCycles.push({
    frequency: {
      interval_unit: params.interval,
      interval_count: 1,
    },
    tenure_type: "REGULAR",
    sequence: params.trialDays ? 2 : 1,
    total_cycles: 0, // infinite
    pricing_scheme: {
      fixed_price: {
        value: params.price.toFixed(2),
        currency_code: params.currency,
      },
    },
  });

  return paypalRequest("/v1/billing/plans", {
    method: "POST",
    body: JSON.stringify({
      product_id: params.productId,
      name: params.name,
      description: params.description,
      billing_cycles: billingCycles,
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    }),
  });
}

// ─── Subscriptions ──────────────────────────────────────────────

interface CreateSubscriptionParams {
  planId: string; // PayPal plan ID
  subscriberEmail: string;
  subscriberName: string;
  returnUrl: string;
  cancelUrl: string;
  customId?: string; // Your internal clinic ID
}

export async function createPayPalSubscription(
  params: CreateSubscriptionParams
) {
  return paypalRequest("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: params.planId,
      subscriber: {
        name: { given_name: params.subscriberName },
        email_address: params.subscriberEmail,
      },
      custom_id: params.customId || "",
      application_context: {
        brand_name: "CarePilot",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    }),
  });
}

export async function getPayPalSubscription(subscriptionId: string) {
  return paypalRequest(`/v1/billing/subscriptions/${subscriptionId}`);
}

export async function cancelPayPalSubscription(
  subscriptionId: string,
  reason: string
) {
  return paypalRequest(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function suspendPayPalSubscription(
  subscriptionId: string,
  reason: string
) {
  return paypalRequest(`/v1/billing/subscriptions/${subscriptionId}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function activatePayPalSubscription(subscriptionId: string) {
  return paypalRequest(`/v1/billing/subscriptions/${subscriptionId}/activate`, {
    method: "POST",
    body: JSON.stringify({ reason: "Reactivating subscription" }),
  });
}

// ─── Webhook Verification ───────────────────────────────────────

export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn("PAYPAL_WEBHOOK_ID not set — skipping verification");
    return true; // In development, allow unverified
  }

  try {
    const result = await paypalRequest(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify({
          auth_algo: headers["paypal-auth-algo"],
          cert_url: headers["paypal-cert-url"],
          transmission_id: headers["paypal-transmission-id"],
          transmission_sig: headers["paypal-transmission-sig"],
          transmission_time: headers["paypal-transmission-time"],
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        }),
      }
    );

    return result.verification_status === "SUCCESS";
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return false;
  }
}
