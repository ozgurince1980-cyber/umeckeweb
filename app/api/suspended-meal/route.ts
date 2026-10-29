import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error("Supabase ortam değişkenleri bulunamadı.");
const supabase = createClient(url, anonKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const restaurantId = String(body.restaurant_id || "");
    const menuItemId = Number(body.menu_item_id);
    const quantity = Number(body.quantity ?? 1);
    const isAnonymous = body.is_anonymous !== false;
    const source = body.source === "cart" ? "cart" : "direct";
    if (!restaurantId || !Number.isInteger(menuItemId) || menuItemId <= 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return NextResponse.json({ success: false, error: "Geçersiz bağış bilgisi." }, { status: 400 });
    const { data, error } = await supabase.rpc("create_suspended_meal_donation", { p_restaurant_id: restaurantId, p_menu_item_id: menuItemId, p_quantity: quantity, p_donor_name: isAnonymous ? null : (body.donor_name ? String(body.donor_name).slice(0, 120) : null), p_is_anonymous: isAnonymous, p_source: source });
    if (error) { console.error("Askıda yemek bağış hatası:", error); return NextResponse.json({ success: false, error: error.message }, { status: 500 }); }
    return NextResponse.json({ success: true, donation_id: data, payment_status: "pending", status: "pending_payment" });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu." }, { status: 500 }); }
}
