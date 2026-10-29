BEGIN;

-- Catalog tables are read-only from clients; management writes remain through
-- authenticated RLS policies or trusted service-role onboarding APIs.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
ON TABLE public.menu_items
FROM PUBLIC, anon;

REVOKE ALL PRIVILEGES
ON TABLE public.subscription_plans
FROM PUBLIC, anon, authenticated;
GRANT SELECT
ON TABLE public.subscription_plans
TO service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
ON TABLE public.meal_plan_templates
FROM PUBLIC, anon, authenticated;
GRANT SELECT
ON TABLE public.meal_plan_templates
TO anon, authenticated, service_role;

-- Wheel rewards are managed server-side; browsers must not read or mutate the
-- reward probability table directly. The client spin action is temporarily
-- disabled until a verified-user/one-claim-per-period wrapper is installed.
REVOKE ALL PRIVILEGES
ON TABLE public.wheel_rewards
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.wheel_rewards
TO service_role;

COMMIT;
