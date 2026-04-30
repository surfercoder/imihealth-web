-- Pending signups: staging area for paid-plan signups before MercadoPago confirms payment.
--
-- A row lands here on form submission and is consumed by the MP webhook when the
-- preapproval transitions to "authorized". The auth.users / doctors / subscriptions
-- rows are only materialized at that point — abandoned signups never pollute the
-- main user tables.
--
-- The password is encrypted in Node (AES-256-GCM, key from SIGNUP_ENC_KEY env)
-- before being stored here. Postgres only ever sees the ciphertext.

CREATE TABLE public.pending_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  encrypted_password text NOT NULL,
  signup_data jsonb NOT NULL,
  mp_preapproval_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pending_signups_mp_preapproval_id_idx
  ON public.pending_signups (mp_preapproval_id)
  WHERE mp_preapproval_id IS NOT NULL;

ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

-- No client-facing policies. All access is via the service role (server actions
-- and the webhook handler).
