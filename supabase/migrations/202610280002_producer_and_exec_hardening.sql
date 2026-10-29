BEGIN;

-- Producer catalogue purchase RPC: keep guest consumer orders supported by the
-- server route, but reject anonymous direct calls and enforce restaurant buyer
-- membership inside the SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION public.create_producer_order(
  p_producer_id uuid,
  p_buyer_type text,
  p_buyer_restaurant_id uuid DEFAULT NULL::uuid,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_notes text DEFAULT NULL::text,
  p_delivery_address jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid := gen_random_uuid();
  v_buyer_user_id uuid := auth.uid();
  v_subtotal numeric(12,2);
  v_requested_count integer;
  v_matched_count integer;
BEGIN
  IF p_producer_id IS NULL THEN
    RAISE EXCEPTION 'producer_id eksik';
  END IF;

  IF p_buyer_type IS NULL OR p_buyer_type NOT IN ('consumer', 'restaurant') THEN
    RAISE EXCEPTION 'Geçersiz buyer_type';
  END IF;

  IF p_buyer_type = 'restaurant' THEN
    IF p_buyer_restaurant_id IS NULL OR v_buyer_user_id IS NULL THEN
      RAISE EXCEPTION 'Restoran alıcısı için giriş yapmış kullanıcı ve restaurant_id gereklidir';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.restaurant_memberships rm
      JOIN public.restaurants r ON r.id = rm.restaurant_id
      WHERE rm.user_id = v_buyer_user_id
        AND rm.restaurant_id = p_buyer_restaurant_id
        AND rm.is_active IS TRUE
        AND rm.role IN ('owner', 'manager')
        AND r.is_active IS TRUE
    ) THEN
      RAISE EXCEPTION 'Bu restoran adına üretici siparişi verme yetkiniz yok';
    END IF;
  END IF;

  IF p_buyer_type = 'restaurant'
     AND p_buyer_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restoran alıcısı için restaurant_id gereklidir';
  END IF;

  IF p_buyer_type = 'consumer'
     AND p_buyer_restaurant_id IS NOT NULL THEN
    RAISE EXCEPTION 'Tüketici siparişinde buyer_restaurant_id gönderilemez';
  END IF;

  IF jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sipariş ürünleri boş olamaz';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.producers p
    WHERE p.id = p_producer_id
      AND p.is_active = true
      AND p.verification_status = 'approved'
      AND p.documents_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Üretici satış için doğrulanmış değil';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS incoming(
      producer_product_id uuid,
      quantity numeric
    )
    WHERE incoming.producer_product_id IS NULL
       OR incoming.quantity IS NULL
       OR incoming.quantity <= 0
  ) THEN
    RAISE EXCEPTION 'Ürün veya miktar geçersiz';
  END IF;

  SELECT COUNT(*) INTO v_requested_count
  FROM jsonb_to_recordset(p_items) AS incoming(
    producer_product_id uuid,
    quantity numeric
  );

  SELECT COUNT(*) INTO v_matched_count
  FROM jsonb_to_recordset(p_items) AS incoming(
    producer_product_id uuid,
    quantity numeric
  )
  JOIN public.producer_products pp
    ON pp.id = incoming.producer_product_id
   AND pp.producer_id = p_producer_id
   AND pp.is_available = true
   AND pp.stock > 0
  WHERE (pp.sale_type = 'both' OR pp.sale_type = p_buyer_type)
    AND incoming.quantity >= COALESCE(pp.minimum_quantity, 1)
    AND (pp.maximum_quantity IS NULL OR incoming.quantity <= pp.maximum_quantity)
    AND MOD(incoming.quantity, COALESCE(pp.quantity_step, 1)) = 0;

  IF v_requested_count <> v_matched_count THEN
    RAISE EXCEPTION 'Ürünlerden biri satışa uygun değil veya miktar kurallarına uymuyor';
  END IF;

  SELECT ROUND(COALESCE(SUM(pp.price * incoming.quantity), 0), 2)
    INTO v_subtotal
  FROM jsonb_to_recordset(p_items) AS incoming(
    producer_product_id uuid,
    quantity numeric
  )
  JOIN public.producer_products pp
    ON pp.id = incoming.producer_product_id
   AND pp.producer_id = p_producer_id
   AND pp.is_available = true;

  INSERT INTO public.producer_orders (
    id, producer_id, buyer_user_id, buyer_type, buyer_restaurant_id,
    status, payment_status, subtotal, discount_total, tax_total,
    delivery_fee, grand_total, currency, notes, delivery_address
  ) VALUES (
    v_order_id,
    p_producer_id,
    CASE WHEN p_buyer_type = 'consumer' THEN v_buyer_user_id ELSE NULL END,
    p_buyer_type,
    p_buyer_restaurant_id,
    'pending', 'pending', v_subtotal, 0, 0, 0, v_subtotal, 'EUR', p_notes,
    p_delivery_address
  );

  INSERT INTO public.producer_order_items (
    producer_order_id, producer_product_id, product_name_snapshot,
    quantity, unit_code, unit_label, unit_price, line_total,
    package_size, package_unit
  )
  SELECT
    v_order_id, pp.id, pp.name, incoming.quantity,
    COALESCE(pp.unit_code, 'piece'),
    COALESCE(pp.unit_label, pp.unit, 'adet'),
    pp.price, ROUND(pp.price * incoming.quantity, 2),
    pp.package_size, pp.package_unit
  FROM jsonb_to_recordset(p_items) AS incoming(
    producer_product_id uuid,
    quantity numeric
  )
  JOIN public.producer_products pp
    ON pp.id = incoming.producer_product_id
   AND pp.producer_id = p_producer_id
   AND pp.is_available = true;

  RETURN v_order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_producer_order(
  uuid, text, uuid, jsonb, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_producer_order(
  uuid, text, uuid, jsonb, text, jsonb
) TO authenticated, service_role;

-- Anonymous solidarity donations remain a supported feature, but anonymous
-- callers cannot claim admin/legacy sources or submit a named non-anonymous gift.
CREATE OR REPLACE FUNCTION public.create_suspended_meal_donation(
  p_restaurant_id uuid,
  p_menu_item_id integer,
  p_quantity integer DEFAULT 1,
  p_donor_name text DEFAULT NULL::text,
  p_is_anonymous boolean DEFAULT true,
  p_source text DEFAULT 'direct'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_donation_id uuid;
  v_user_id uuid := auth.uid();
  v_meal_name text;
  v_unit_price numeric(12,2);
  v_total_amount numeric(12,2);
  v_actor_role text := COALESCE(auth.role(), 'anon');
BEGIN
  IF p_restaurant_id IS NULL OR p_menu_item_id IS NULL THEN
    RAISE EXCEPTION 'Restoran ve menü ürünü gereklidir.';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 20 THEN
    RAISE EXCEPTION 'Bağış miktarı 1 ile 20 arasında olmalıdır.';
  END IF;
  IF p_source NOT IN ('direct','cart','admin','legacy') THEN
    RAISE EXCEPTION 'Geçersiz bağış kaynağı.';
  END IF;
  IF v_actor_role <> 'service_role' AND p_source NOT IN ('direct','cart') THEN
    RAISE EXCEPTION 'Bu bağış kaynağı yalnızca yetkili sunucu işlemleri içindir.';
  END IF;
  IF p_is_anonymous IS FALSE AND v_user_id IS NULL THEN
    RAISE EXCEPTION 'İsminizle bağış yapmak için giriş yapmalısınız.';
  END IF;

  SELECT mi.name, mi.price
    INTO v_meal_name, v_unit_price
    FROM public.menu_items mi
   WHERE mi.id = p_menu_item_id
     AND mi.restaurant_id = p_restaurant_id
     AND mi.is_available IS TRUE;

  IF v_meal_name IS NULL OR v_unit_price IS NULL OR v_unit_price < 0 THEN
    RAISE EXCEPTION 'Ürün bulunamadı, restorana ait değil veya satışta değil.';
  END IF;

  v_total_amount := round(v_unit_price * p_quantity, 2);

  INSERT INTO public.suspended_meal_donations (
    restaurant_id, menu_item_id, meal_name_snapshot, quantity, unit_price,
    total_amount, donor_user_id, donor_name, is_anonymous,
    payment_status, status, source
  ) VALUES (
    p_restaurant_id,
    p_menu_item_id,
    v_meal_name,
    p_quantity,
    v_unit_price,
    v_total_amount,
    CASE WHEN p_is_anonymous IS FALSE THEN v_user_id ELSE NULL END,
    CASE WHEN p_is_anonymous IS TRUE THEN NULL ELSE NULLIF(btrim(p_donor_name), '') END,
    p_is_anonymous,
    'pending',
    'pending_payment',
    p_source
  )
  RETURNING id INTO v_donation_id;

  RETURN v_donation_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_suspended_meal_donation(
  uuid, integer, integer, text, boolean, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_suspended_meal_donation(
  uuid, integer, integer, text, boolean, text
) TO anon, authenticated, service_role;

-- KDS/producers/courier self-data functions require an authenticated identity.
REVOKE EXECUTE ON FUNCTION public.kds_update_order_status(uuid, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kds_update_order_status(uuid, text)
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_permission(text, uuid, uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text, uuid, uuid)
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_producer_memberships()
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_producer_memberships()
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_producer_orders(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_producer_orders(uuid)
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_restaurant_memberships()
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_restaurant_memberships()
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_courier_profile()
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_courier_profile()
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_courier_deliveries()
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_courier_deliveries()
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.toggle_courier_online_status(boolean)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_courier_online_status(boolean)
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.promoter_onboard_producer(text, text, text, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promoter_onboard_producer(text, text, text, text)
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_producer_order_status(uuid, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_producer_order_status(uuid, text)
TO authenticated, service_role;

COMMIT;
