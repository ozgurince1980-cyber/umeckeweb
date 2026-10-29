BEGIN;

-- Secure replacement entry point for the promoter's in-person "Close the Deal".
-- The legacy restaurant creator remains service-role-only; this wrapper checks
-- the signed-in promoter and then calls the legacy routine under that identity.
CREATE OR REPLACE FUNCTION public.complete_promoter_restaurant_onboarding(
  p_name text,
  p_phone text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_address text DEFAULT NULL::text,
  p_zipcode text DEFAULT '18209'::text,
  p_city text DEFAULT 'Bad Doberan'::text,
  p_cuisine_type text DEFAULT 'Yerel / Anadolu Mutfağı'::text,
  p_weekly_hours jsonb DEFAULT NULL::jsonb,
  p_service_options text[] DEFAULT ARRAY['Paket Servis','Gel-Al','Mekanda Servis']::text[],
  p_payment_methods text[] DEFAULT ARRAY['Nakit','Kredi Kartı / POS','Stripe Online']::text[],
  p_parking_info text DEFAULT 'Ücretsiz Cadde Otoparkı'::text,
  p_plan_key text DEFAULT 'basic'::text,
  p_menu_items jsonb DEFAULT '[]'::jsonb,
  p_referral_code text DEFAULT NULL::text,
  p_is_onsite_by_promoter boolean DEFAULT true
)
RETURNS TABLE(
  restaurant_id uuid,
  restaurant_slug text,
  referral_id uuid,
  reward_amount numeric,
  menu_items_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Promoter sign-in is required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.promoter_profiles pp
    WHERE pp.user_id = v_uid
      AND pp.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'An approved promoter profile is required.';
  END IF;

  IF p_is_onsite_by_promoter IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'This endpoint is only for promoter-assisted onboarding.';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.complete_restaurant_onboarding(
    p_name => p_name,
    p_phone => p_phone,
    p_email => p_email,
    p_address => p_address,
    p_zipcode => p_zipcode,
    p_city => p_city,
    p_cuisine_type => p_cuisine_type,
    p_weekly_hours => p_weekly_hours,
    p_service_options => p_service_options,
    p_payment_methods => p_payment_methods,
    p_parking_info => p_parking_info,
    p_plan_key => p_plan_key,
    p_menu_items => p_menu_items,
    p_referral_code => p_referral_code,
    p_is_onsite_by_promoter => true
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_promoter_restaurant_onboarding(
  text,text,text,text,text,text,text,jsonb,text[],text[],text,text,jsonb,text,boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_promoter_restaurant_onboarding(
  text,text,text,text,text,text,text,jsonb,text[],text[],text,text,jsonb,text,boolean
) TO authenticated, service_role;

COMMIT;
