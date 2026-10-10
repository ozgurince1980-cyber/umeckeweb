<<<<<<< HEAD
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

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

  // 1. Restoranı slug değerine göre bul
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single();

  if (restError || !restaurant) {
    notFound();
  }

  // 2. Restorana ait ürünleri/menüyü çek
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('is_available', true);

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Restoran Kapak ve Bilgileri */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto p-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
          <p className="text-sm text-gray-600 mt-1">{restaurant.description || 'Hoş geldiniz! Siparişinizi hemen verebilirsiniz.'}</p>
        </div>
      </div>

      {/* Ürünler Listesi */}
      <div className="max-w-2xl mx-auto p-4 mt-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Menü</h2>
        <div className="grid gap-4">
          {products?.map((product: any) => (
            <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border">
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                <span className="text-green-600 font-bold mt-2 inline-block">€{product.price}</span>
              </div>
              {product.image_url && (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-20 h-20 object-cover rounded-lg border" 
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
=======
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
>>>>>>> edd03a9 (Proje modalları ve duzeltmeler eklendi)
}