// One-shot setup script: creates the two MercadoPago preapproval plans
// (Pro monthly $30 USD, Pro yearly $300 USD).
//
// Usage:
//   node --env-file=.env scripts/setup-mp-plans.mjs
//
// Prints plan IDs at the end. Copy those into .env:
//   MERCADOPAGO_PRO_MONTHLY_PLAN_ID=...
//   MERCADOPAGO_PRO_YEARLY_PLAN_ID=...

const MP_API = "https://api.mercadopago.com";

function envOrDie(key) {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
  return v;
}

const TOKEN = envOrDie("MERCADOPAGO_ACCESS_TOKEN");
const APP_URL = envOrDie("NEXT_PUBLIC_APP_URL");

async function createPlan({ reason, frequency, frequencyType, amount, currency }) {
  const body = {
    reason,
    auto_recurring: {
      frequency,
      frequency_type: frequencyType,
      transaction_amount: amount,
      currency_id: currency,
    },
    back_url: `${APP_URL}/billing/return`,
    payment_methods_allowed: {
      payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
    },
  };
  const res = await fetch(`${MP_API}/preapproval_plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`MercadoPago createPlan failed (${res.status}): ${text}`);
  }
  return JSON.parse(text);
}

async function main() {
  console.log("Creating Pro monthly plan (30 000 ARS / month)…");
  const monthly = await createPlan({
    reason: "IMI Health Pro — mensual",
    frequency: 1,
    frequencyType: "months",
    amount: 30000,
    currency: "ARS",
  });
  console.log(`  ✓ id=${monthly.id}`);

  console.log("Creating Pro yearly plan (300 000 ARS / year)…");
  const yearly = await createPlan({
    reason: "IMI Health Pro — anual",
    frequency: 12,
    frequencyType: "months",
    amount: 300000,
    currency: "ARS",
  });
  console.log(`  ✓ id=${yearly.id}`);

  console.log("\nAdd these to your .env:");
  console.log(`MERCADOPAGO_PRO_MONTHLY_PLAN_ID=${monthly.id}`);
  console.log(`MERCADOPAGO_PRO_YEARLY_PLAN_ID=${yearly.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
