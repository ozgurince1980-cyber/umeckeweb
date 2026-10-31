BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source_channel text NOT NULL DEFAULT 'legacy';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_source_channel_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_source_channel_check
  CHECK (source_channel IN ('website', 'whatsapp', 'table_qr', 'kiosk', 'phone', 'legacy'));

CREATE INDEX IF NOT EXISTS idx_orders_source_channel_created_at
  ON public.orders(source_channel, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_website_order_with_checkout_access(
  p_restaurant_id uuid,
  p_customer_phone text,
  p_order_type text,
  p_notes text,
  p_product_name text,
  p_items jsonb,
  p_payment_method text,
  p_payment_required boolean,
  p_coupon_code text,
  p_tax_total numeric,
  p_delivery_fee numeric,
  p_tip_amount numeric,
  p_customer_user_id uuid,
  p_points_to_spend integer,
  p_checkout_token_hash text,
  p_source_channel text DEFAULT 'website'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
BEGIN
  IF p_source_channel NOT IN ('website','whatsapp','table_qr','kiosk','phone') THEN
    RAISE EXCEPTION 'Invalid order source channel.';
  END IF;

  v_order_id := public.create_order_with_coupon_wallet_and_checkout_access(
    p_restaurant_id => p_restaurant_id,
    p_customer_phone => p_customer_phone,
    p_order_type => p_order_type,
    p_notes => p_notes,
    p_product_name => p_product_name,
    p_items => p_items,
    p_payment_method => p_payment_method,
    p_payment_required => p_payment_required,
    p_coupon_code => p_coupon_code,
    p_tax_total => p_tax_total,
    p_delivery_fee => p_delivery_fee,
    p_tip_amount => p_tip_amount,
    p_customer_user_id => p_customer_user_id,
    p_points_to_spend => p_points_to_spend,
    p_checkout_token_hash => p_checkout_token_hash
  );

  UPDATE public.orders
     SET source_channel = p_source_channel
   WHERE id = v_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not attach the website order source.';
  END IF;

  RETURN v_order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_website_order_with_checkout_access(
  uuid,text,text,text,text,jsonb,text,boolean,text,numeric,numeric,numeric,uuid,integer,text,text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_website_order_with_checkout_access(
  uuid,text,text,text,text,jsonb,text,boolean,text,numeric,numeric,numeric,uuid,integer,text,text
) TO service_role;

COMMIT;
