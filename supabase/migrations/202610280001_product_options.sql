-- umEcke: product-specific menu modifiers, price snapshots and owner-management RPC
-- Apply after a database backup. This migration creates schema and functions only; it inserts no sample data.

CREATE TABLE IF NOT EXISTS public.menu_item_option_groups (
  group_id bigserial PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id integer NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_de text,
  name_tr text,
  min_select integer NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select integer NOT NULL DEFAULT 1 CHECK (max_select >= 1),
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT menu_item_option_groups_selection_bounds CHECK (min_select <= max_select)
);
CREATE INDEX IF NOT EXISTS menu_item_option_groups_product_idx
  ON public.menu_item_option_groups(menu_item_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS menu_item_option_groups_restaurant_idx
  ON public.menu_item_option_groups(restaurant_id, menu_item_id);

CREATE TABLE IF NOT EXISTS public.menu_item_options (
  option_id bigserial PRIMARY KEY,
  group_id bigint NOT NULL REFERENCES public.menu_item_option_groups(group_id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_de text,
  name_tr text,
  price_delta numeric(12,2) NOT NULL DEFAULT 0 CHECK (price_delta >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS menu_item_options_group_idx
  ON public.menu_item_options(group_id, is_active, sort_order);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selected_options jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_selected_options_array_check;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_selected_options_array_check
  CHECK (jsonb_typeof(selected_options) = 'array');

-- Client users cannot write/read these tables directly. Public reads go through a validated API,
-- management writes go through a server route that checks owner/manager membership.
ALTER TABLE public.menu_item_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_options ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.menu_item_option_groups, public.menu_item_options FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.menu_item_option_groups, public.menu_item_options TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.menu_item_option_groups_group_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.menu_item_options_option_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.save_menu_item_option_group(
  p_group_id bigint,
  p_restaurant_id uuid,
  p_menu_item_id integer,
  p_name_en text,
  p_name_de text,
  p_name_tr text,
  p_min_select integer,
  p_max_select integer,
  p_required boolean,
  p_sort_order integer,
  p_options jsonb
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group_id bigint;
  v_option_count integer;
BEGIN
  IF p_restaurant_id IS NULL OR p_menu_item_id IS NULL
     OR NULLIF(btrim(p_name_en), '') IS NULL
     OR p_min_select IS NULL OR p_max_select IS NULL
     OR p_min_select < 0 OR p_max_select < 1 OR p_min_select > p_max_select
     OR (COALESCE(p_required,false) AND p_min_select < 1)
     OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'Invalid option group data.';
  END IF;

  SELECT count(*) INTO v_option_count FROM jsonb_array_elements(p_options);
  IF v_option_count < 1 OR v_option_count > 40 OR p_max_select > v_option_count THEN
    RAISE EXCEPTION 'Option count and selection limits do not match.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_options)
      AS o(name_en text, price_delta numeric)
    WHERE NULLIF(btrim(o.name_en), '') IS NULL
       OR o.price_delta IS NULL OR o.price_delta < 0
  ) THEN
    RAISE EXCEPTION 'Every option needs an English name and a non-negative price.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.menu_items m
    WHERE m.id = p_menu_item_id AND m.restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'Menu item is not owned by this restaurant.';
  END IF;

  IF p_group_id IS NULL THEN
    INSERT INTO public.menu_item_option_groups(
      restaurant_id, menu_item_id, name_en, name_de, name_tr,
      min_select, max_select, required, sort_order
    ) VALUES (
      p_restaurant_id, p_menu_item_id, btrim(p_name_en), NULLIF(btrim(p_name_de), ''),
      NULLIF(btrim(p_name_tr), ''), p_min_select, p_max_select, COALESCE(p_required,false),
      COALESCE(p_sort_order,0)
    ) RETURNING group_id INTO v_group_id;
  ELSE
    UPDATE public.menu_item_option_groups SET
      name_en=btrim(p_name_en), name_de=NULLIF(btrim(p_name_de), ''),
      name_tr=NULLIF(btrim(p_name_tr), ''), min_select=p_min_select,
      max_select=p_max_select, required=COALESCE(p_required,false),
      sort_order=COALESCE(p_sort_order,0), updated_at=now()
    WHERE group_id=p_group_id AND restaurant_id=p_restaurant_id AND menu_item_id=p_menu_item_id
    RETURNING group_id INTO v_group_id;
    IF v_group_id IS NULL THEN RAISE EXCEPTION 'Option group not found for this restaurant/product.'; END IF;
    DELETE FROM public.menu_item_options WHERE group_id=v_group_id;
  END IF;

  INSERT INTO public.menu_item_options(group_id,name_en,name_de,name_tr,price_delta,sort_order)
  SELECT v_group_id,btrim(o.name_en),NULLIF(btrim(o.name_de),''),NULLIF(btrim(o.name_tr),''),
         round(o.price_delta,2),COALESCE(o.sort_order,0)
  FROM jsonb_to_recordset(p_options)
    AS o(name_en text,name_de text,name_tr text,price_delta numeric,sort_order integer);

  RETURN v_group_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_menu_item_option_group(bigint,uuid,integer,text,text,text,integer,integer,boolean,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_menu_item_option_group(bigint,uuid,integer,text,text,text,integer,integer,boolean,integer,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.quote_menu_item_options(
  p_menu_item_id integer,
  p_selected_option_ids jsonb
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_input_count integer := 0;
  v_valid_count integer := 0;
  v_group record;
  v_selected_in_group integer;
  v_extra numeric(12,2) := 0;
  v_snapshot jsonb := '[]'::jsonb;
BEGIN
  IF p_selected_option_ids IS NULL THEN p_selected_option_ids := '[]'::jsonb; END IF;
  IF jsonb_typeof(p_selected_option_ids) <> 'array' THEN RAISE EXCEPTION 'Product options are invalid.'; END IF;
  SELECT count(*) INTO v_input_count FROM jsonb_array_elements(p_selected_option_ids);
  IF v_input_count > 100 THEN RAISE EXCEPTION 'Too many product options.'; END IF;

  IF v_input_count > 0 THEN
    IF (SELECT count(DISTINCT value::text) FROM jsonb_array_elements_text(p_selected_option_ids) AS x(value)) <> v_input_count THEN
      RAISE EXCEPTION 'Duplicate product option.';
    END IF;
    SELECT count(*) INTO v_valid_count
    FROM jsonb_array_elements_text(p_selected_option_ids) AS chosen(value)
    JOIN public.menu_item_options o ON o.option_id = chosen.value::bigint AND o.is_active=true
    JOIN public.menu_item_option_groups g ON g.group_id=o.group_id AND g.menu_item_id=p_menu_item_id AND g.is_active=true;
    IF v_valid_count <> v_input_count THEN RAISE EXCEPTION 'An option is inactive or does not belong to this product.'; END IF;
  END IF;

  FOR v_group IN
    SELECT g.group_id,g.name_en,g.name_de,g.name_tr,g.min_select,g.max_select,g.required
    FROM public.menu_item_option_groups g
    WHERE g.menu_item_id=p_menu_item_id AND g.is_active=true
    ORDER BY g.sort_order,g.group_id
  LOOP
    SELECT count(*) INTO v_selected_in_group
    FROM jsonb_array_elements_text(p_selected_option_ids) AS chosen(value)
    JOIN public.menu_item_options o ON o.option_id=chosen.value::bigint
    WHERE o.group_id=v_group.group_id AND o.is_active=true;
    IF v_selected_in_group < v_group.min_select OR v_selected_in_group > v_group.max_select THEN
      RAISE EXCEPTION 'Selection count is invalid for option group: %',v_group.name_en;
    END IF;
  END LOOP;

  SELECT COALESCE(sum(o.price_delta),0),
         COALESCE(jsonb_agg(jsonb_build_object(
           'option_id',o.option_id,'group_id',g.group_id,
           'group_name_en',g.name_en,'group_name_de',g.name_de,'group_name_tr',g.name_tr,
           'name_en',o.name_en,'name_de',o.name_de,'name_tr',o.name_tr,
           'price_delta',o.price_delta
         ) ORDER BY g.sort_order,o.sort_order,o.option_id),'[]'::jsonb)
    INTO v_extra,v_snapshot
  FROM jsonb_array_elements_text(p_selected_option_ids) AS chosen(value)
  JOIN public.menu_item_options o ON o.option_id=chosen.value::bigint AND o.is_active=true
  JOIN public.menu_item_option_groups g ON g.group_id=o.group_id
    AND g.menu_item_id=p_menu_item_id AND g.is_active=true;

  RETURN jsonb_build_object('extra_total',round(v_extra,2),'selected_options',v_snapshot);
END;
$function$;
REVOKE ALL ON FUNCTION public.quote_menu_item_options(integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_menu_item_options(integer,jsonb) TO service_role;

-- Replace the existing order RPC without changing its argument signature. Prices for selected
-- options are now recomputed server-side; order_items stores an immutable localized snapshot.
CREATE OR REPLACE FUNCTION public.create_order_with_financials(
  p_restaurant_id uuid,
  p_customer_phone text,
  p_order_type text,
  p_notes text,
  p_product_name text,
  p_items jsonb,
  p_payment_method text DEFAULT 'Nakit'::text,
  p_payment_required boolean DEFAULT false,
  p_discount_total numeric DEFAULT 0,
  p_tax_total numeric DEFAULT 0,
  p_delivery_fee numeric DEFAULT 0,
  p_tip_amount numeric DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid := gen_random_uuid();
  v_subtotal numeric(12,2);
  v_discount_total numeric(12,2);
  v_tax_total numeric(12,2);
  v_delivery_fee numeric(12,2);
  v_tip_amount numeric(12,2);
  v_grand_total numeric(12,2);
  v_commissionable_amount numeric(12,2);
  v_requested_count integer;
  v_matched_count integer;
BEGIN
  IF p_restaurant_id IS NULL THEN RAISE EXCEPTION 'restaurant_id eksik'; END IF;
  IF p_order_type NOT IN ('table_qr','whatsapp','missed_call') THEN RAISE EXCEPTION 'Geçersiz sipariş türü'; END IF;
  IF p_payment_method NOT IN ('Nakit','Kredi Kartı / POS','Stripe Online') THEN RAISE EXCEPTION 'Geçersiz ödeme yöntemi'; END IF;
  IF p_payment_required=true AND p_payment_method<>'Stripe Online' THEN RAISE EXCEPTION 'Ödeme gerekli ise Stripe Online seçilmelidir'; END IF;
  IF p_payment_required=false AND p_payment_method='Stripe Online' THEN RAISE EXCEPTION 'Stripe Online için ödeme gerekli olmalıdır'; END IF;
  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Sipariş ürünleri geçersiz'; END IF;
  IF COALESCE(p_discount_total,0)<0 OR COALESCE(p_tax_total,0)<0 OR COALESCE(p_delivery_fee,0)<0 OR COALESCE(p_tip_amount,0)<0 THEN RAISE EXCEPTION 'Finansal tutarlar negatif olamaz'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS incoming(menu_item_id integer,quantity integer)
    WHERE incoming.menu_item_id IS NULL OR incoming.menu_item_id<=0 OR incoming.quantity IS NULL OR incoming.quantity<=0 OR incoming.quantity>100
  ) THEN RAISE EXCEPTION 'Sipariş ürünlerinden biri geçersiz'; END IF;
  SELECT count(*) INTO v_requested_count FROM jsonb_to_recordset(p_items) AS incoming(menu_item_id integer,quantity integer);
  SELECT count(*) INTO v_matched_count
  FROM jsonb_to_recordset(p_items) AS incoming(menu_item_id integer,quantity integer)
  JOIN public.menu_items menu ON menu.id=incoming.menu_item_id AND menu.restaurant_id=p_restaurant_id AND menu.is_available=true;
  IF v_requested_count<>v_matched_count THEN RAISE EXCEPTION 'Ürün bulunamadı, restorana ait değil veya satışta değil'; END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS incoming(menu_item_id integer, quantity integer, selected_option_ids jsonb, expected_unit_price numeric)
    JOIN public.menu_items menu ON menu.id=incoming.menu_item_id AND menu.restaurant_id=p_restaurant_id AND menu.is_available=true
    CROSS JOIN LATERAL (SELECT public.quote_menu_item_options(menu.id,incoming.selected_option_ids) AS result) quote
    WHERE incoming.expected_unit_price IS NOT NULL
      AND round(menu.price+(quote.result->>'extra_total')::numeric,2) <> round(incoming.expected_unit_price,2)
  ) THEN RAISE EXCEPTION 'Menu price changed. Refresh the menu and review your cart.'; END IF;

  SELECT round(COALESCE(sum((menu.price + (quote.result->>'extra_total')::numeric) * incoming.quantity),0),2)
    INTO v_subtotal
  FROM jsonb_to_recordset(p_items) AS incoming(menu_item_id integer,quantity integer,selected_option_ids jsonb)
  JOIN public.menu_items menu ON menu.id=incoming.menu_item_id AND menu.restaurant_id=p_restaurant_id AND menu.is_available=true
  CROSS JOIN LATERAL (SELECT public.quote_menu_item_options(menu.id,incoming.selected_option_ids) AS result) quote;

  v_discount_total:=round(COALESCE(p_discount_total,0),2);
  v_tax_total:=round(COALESCE(p_tax_total,0),2);
  v_delivery_fee:=round(COALESCE(p_delivery_fee,0),2);
  v_tip_amount:=round(COALESCE(p_tip_amount,0),2);
  IF v_discount_total>v_subtotal THEN RAISE EXCEPTION 'İndirim ürün ara toplamından büyük olamaz'; END IF;
  v_commissionable_amount:=round(v_subtotal-v_discount_total,2);
  v_grand_total:=round(v_subtotal-v_discount_total+v_tax_total+v_delivery_fee+v_tip_amount,2);

  INSERT INTO public.orders(
    id,customer_phone,order_type,total_amount,status,price,product_name,notes,restaurant_id,
    payment_status,payment_method,currency,payment_required,subtotal,discount_total,tax_total,
    delivery_fee,tip_amount,grand_total,commissionable_amount,payment_processing_fee
  ) VALUES (
    v_order_id,p_customer_phone,p_order_type,v_grand_total,'pending',v_grand_total,p_product_name,p_notes,p_restaurant_id,
    CASE WHEN p_payment_required THEN 'pending' ELSE 'untracked' END,p_payment_method,'EUR',p_payment_required,
    v_subtotal,v_discount_total,v_tax_total,v_delivery_fee,v_tip_amount,v_grand_total,v_commissionable_amount,0
  );

  INSERT INTO public.order_items(order_id,menu_item_id,product_name,quantity,unit_price,line_total,selected_options)
  SELECT v_order_id,menu.id,menu.name,incoming.quantity,
         round(menu.price+(quote.result->>'extra_total')::numeric,2),
         round((menu.price+(quote.result->>'extra_total')::numeric)*incoming.quantity,2),
         quote.result->'selected_options'
  FROM jsonb_to_recordset(p_items) AS incoming(menu_item_id integer,quantity integer,selected_option_ids jsonb)
  JOIN public.menu_items menu ON menu.id=incoming.menu_item_id AND menu.restaurant_id=p_restaurant_id AND menu.is_available=true
  CROSS JOIN LATERAL (SELECT public.quote_menu_item_options(menu.id,incoming.selected_option_ids) AS result) quote;

  RETURN v_order_id;
END;
$function$;

-- Existing trusted Next.js route uses the service role. Avoid direct untrusted client order creation.
REVOKE ALL ON FUNCTION public.create_order_with_financials(uuid,text,text,text,text,jsonb,text,boolean,numeric,numeric,numeric,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_financials(uuid,text,text,text,text,jsonb,text,boolean,numeric,numeric,numeric,numeric) TO service_role;
