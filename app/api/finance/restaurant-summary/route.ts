import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase yapılandırması eksik.",
        },
        { status: 503 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçerli Auth oturumu bulunamadı.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "").trim();

    /*
      Önemli:
      Supabase client'a kullanıcının Auth token'ını aktarıyoruz.
      Böylece RPC içinde auth.uid() doğru kullanıcıyı görür.
    */
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Kullanıcı oturumu doğrulanamadı.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const restaurantId = String(body.restaurant_id || "").trim();
    const from = body.from ? String(body.from) : null;
    const to = body.to ? String(body.to) : null;

    if (!restaurantId) {
      return NextResponse.json(
        {
          success: false,
          error: "restaurant_id eksik.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "get_restaurant_financial_summary",
      {
        p_restaurant_id: restaurantId,
        p_from: from,
        p_to: to,
      }
    );

    if (error) {
      console.error("Finans raporu RPC hatası:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 403 }
      );
    }

    const summary = Array.isArray(data)
      ? data[0] || null
      : data;

    return NextResponse.json({
      success: true,
      data: summary,
      user_id: user.id,
    });
  } catch (error) {
    console.error("Finans raporu API hatası:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Finans raporu alınamadı.",
      },
      { status: 500 }
    );
  }
}