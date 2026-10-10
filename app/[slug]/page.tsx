export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import ProductListClient from '@/app/components/ProductListClient'; // İstemci bileşenini içeri aktarıyoruz

// Supabase istemcisi
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function RestaurantMenuPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  console.log("Aranan Restoran Slug:", slug);

  // 1. Restoranı slug değerine göre bul (.maybeSingle kullanarak hata patlamasını önlüyoruz)
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (restError) {
    console.error("Supabase Restoran Sorgu Hatası:", restError);
  }

  // Eğer restoran bulunamadıysa 404 ver
  if (!restaurant) {
    console.warn("Restoran bulunamadı, 404 tetikleniyor. Slug:", slug);
    notFound();
  }

  // 2. Restorana ait ürünleri/menüyü çek
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*')
    .eq('restaurant_id', restaurant.id);

  if (prodError) {
    console.error("Supabase Ürünler Sorgu Hatası:", prodError);
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Restoran Kapak ve Bilgileri */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto p-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
          <p className="text-sm text-gray-600 mt-1">{restaurant.description || 'Hoş geldiniz! Siparişinizi hemen verebilirsiniz.'}</p>
        </div>
      </div>

      {/* Ürünler Listesi (İnteraktif yapı ProductListClient içine devredildi) */}
      <div className="max-w-2xl mx-auto p-4 mt-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Menü</h2>
        <ProductListClient products={products || []} />
      </div>
    </main>
  );
}