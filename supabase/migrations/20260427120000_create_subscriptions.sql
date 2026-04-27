-- Subscriptions and enterprise leads.
--
-- Free plan: 10 informes max, can upgrade to Pro at any time.
-- Pro plan: monthly ($30) or yearly ($300) via MercadoPago preapproval.
-- Cancelled Pro past period_end → read-only access (sign-in works,
-- existing data visible, no new informes).

CREATE TYPE public.plan_type AS ENUM ('free', 'pro_monthly', 'pro_yearly');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'pending');

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_type NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  mp_preapproval_id text UNIQUE,
  mp_payer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_status_idx ON public.subscriptions (status);
CREATE INDEX subscriptions_current_period_end_idx ON public.subscriptions (current_period_end)
  WHERE current_period_end IS NOT NULL;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Owners can read their own subscription. All writes go through the service role
-- (server actions / webhook handlers using the admin client).
CREATE POLICY subscriptions_owner_select ON public.subscriptions
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_subscriptions_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_subscriptions_updated_at();

-- Auto-create a free subscription row for every new auth user.
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- Trigger functions should not be invokable as RPC by clients.
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_subscriptions_updated_at() FROM anon, authenticated, public;

-- Backfill: every existing auth user gets a free subscription.
INSERT INTO public.subscriptions (user_id, plan, status)
SELECT u.id, 'free', 'active'
FROM auth.users u
LEFT JOIN public.subscriptions s ON s.user_id = u.id
WHERE s.id IS NULL;

-- Enterprise leads: write-only inbox for the public pricing form.
-- Anonymous users can submit. Reads only via service role.
CREATE TABLE public.enterprise_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY enterprise_leads_public_insert ON public.enterprise_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
