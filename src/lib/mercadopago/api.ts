// Thin typed wrapper around MercadoPago's REST API for subscriptions.
//
// Docs: https://www.mercadopago.com.ar/developers/en/docs/subscriptions
//
// All calls use the access token from MERCADOPAGO_ACCESS_TOKEN. Idempotency
// keys are sent on POSTs that we never want duplicated server-side (plan and
// preapproval creation).

const MP_API = "https://api.mercadopago.com";

function token(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured");
  }
  return t;
}

async function call<T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token()}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${MP_API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `MercadoPago ${method} ${path} failed (${res.status}): ${text.slice(0, 500)}`,
    );
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export type PreapprovalFrequencyType = "days" | "months";

export interface PreapprovalAutoRecurring {
  frequency: number;
  frequency_type: PreapprovalFrequencyType;
  transaction_amount: number;
  currency_id: string;
  /** ISO timestamp; required when status='authorized', optional otherwise. */
  start_date?: string;
  end_date?: string;
  repetitions?: number;
  billing_day?: number;
  billing_day_proportional?: boolean;
}

export interface PreapprovalPlanInput {
  reason: string;
  auto_recurring: PreapprovalAutoRecurring;
  back_url: string;
  payment_methods_allowed?: {
    payment_types?: { id: string }[];
    payment_methods?: { id: string }[];
  };
}

export interface PreapprovalPlan {
  id: string;
  reason: string;
  status: "active" | "inactive" | "cancelled";
  init_point: string;
  auto_recurring: PreapprovalAutoRecurring;
}

export async function createPreapprovalPlan(
  input: PreapprovalPlanInput,
  idempotencyKey?: string,
): Promise<PreapprovalPlan> {
  return call<PreapprovalPlan>(
    "POST",
    "/preapproval_plan",
    input,
    idempotencyKey,
  );
}

export interface PreapprovalInput {
  preapproval_plan_id: string;
  reason: string;
  external_reference: string;
  payer_email: string;
  back_url: string;
  /** "pending" → user picks a card on MP checkout. "authorized" requires card_token_id. */
  status: "pending" | "authorized";
  auto_recurring: PreapprovalAutoRecurring;
}

export type PreapprovalStatus =
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled";

export interface Preapproval {
  id: string;
  preapproval_plan_id: string;
  status: PreapprovalStatus;
  external_reference: string;
  payer_email: string;
  payer_id: number | null;
  init_point: string;
  next_payment_date: string | null;
  date_created: string;
  last_modified: string;
  auto_recurring: PreapprovalAutoRecurring;
}

export async function createPreapproval(
  input: PreapprovalInput,
  idempotencyKey?: string,
): Promise<Preapproval> {
  return call<Preapproval>("POST", "/preapproval", input, idempotencyKey);
}

export async function getPreapproval(id: string): Promise<Preapproval> {
  return call<Preapproval>("GET", `/preapproval/${encodeURIComponent(id)}`);
}

export async function updatePreapprovalStatus(
  id: string,
  status: "cancelled" | "paused",
): Promise<Preapproval> {
  return call<Preapproval>(
    "PUT",
    `/preapproval/${encodeURIComponent(id)}`,
    { status },
  );
}

export interface AuthorizedPayment {
  id: number;
  preapproval_id: string;
  /** "scheduled" | "processed" | "recycling" | "cancelled". */
  status: string;
  /** "approved" | "rejected" | "pending" | null. */
  payment_status: string | null;
  transaction_amount: number;
  currency_id: string;
  date_created: string;
  /** Date the next charge is scheduled for. */
  debit_date: string | null;
}

export async function getAuthorizedPayment(
  id: string | number,
): Promise<AuthorizedPayment> {
  return call<AuthorizedPayment>(
    "GET",
    `/authorized_payments/${encodeURIComponent(String(id))}`,
  );
}
