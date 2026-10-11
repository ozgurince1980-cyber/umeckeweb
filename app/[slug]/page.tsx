export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import RestaurantManager from '../components/RestaurantManager';

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

  // 1. Restoranı slug değerine göre bul
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

  return (
    <main className="min-h-screen bg-gray-50">
      <RestaurantManager />
    </main>
  );
}