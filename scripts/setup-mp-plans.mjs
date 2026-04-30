// One-shot setup script: creates the two MercadoPago preapproval plans.
// Plan amounts are immutable in MP, so re-run this script (and update env
// vars) any time you need to change pricing.
//
// Usage:
//   npm run setup:mp-plans 15 75                  # production smoke-test pricing (15 ARS / 75 ARS)
//   npm run setup:mp-plans 30000 300000           # ARS-anchored production pricing
//
// MercadoPago rejects amounts below 15 ARS, so 15 is the smoke-test floor.
// Defaults (no args): 30000 ARS / 300000 ARS.
//
// Prints plan IDs at the end. Copy those into .env (and into Vercel envs):
//   MERCADOPAGO_PRO_MONTHLY_PLAN_ID=...
//   MERCADOPAGO_PRO_YEARLY_PLAN_ID=...
//
// Keep the displayed prices in src/actions/billing.ts (PLAN_CONFIG.arsAmount)
// and the i18n strings (proPriceMonthly/Yearly, save60, yearlyHint) in sync
// with whatever amount you create here.

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

function parseAmount(raw, fallback, label) {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`Invalid ${label} amount: ${raw}`);
    process.exit(1);
  }
  return n;
}

async function main() {
  const monthlyArs = parseAmount(process.argv[2], 30000, "monthly");
  const yearlyArs = parseAmount(process.argv[3], 300000, "yearly");

  console.log(`Creating Pro monthly plan (${monthlyArs} ARS / month)…`);
  const monthly = await createPlan({
    reason: "IMI Health Pro — mensual",
    frequency: 1,
    frequencyType: "months",
    amount: monthlyArs,
    currency: "ARS",
  });
  console.log(`  ✓ id=${monthly.id}`);

  console.log(`Creating Pro yearly plan (${yearlyArs} ARS / year)…`);
  const yearly = await createPlan({
    reason: "IMI Health Pro — anual",
    frequency: 12,
    frequencyType: "months",
    amount: yearlyArs,
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
