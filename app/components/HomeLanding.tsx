"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RestaurantShowcase from "./RestaurantShowcase";
import SolidareatyLogo from "./SolidareatyLogo";
import { useI18n } from "../../lib/i18n";

export default function HomeLanding() {
  const { t } = useI18n();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    // Sayfa ilk açıldığında dev splash ekranı 2.2 saniye gösterilsin, sonra kaldırılsın
    const timer = setTimeout(() => {
      setSplashDone(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* İLK AÇILIŞ (SPLASH) EKRANI */}
      {!splashDone && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-stone-950 text-white transition-opacity duration-700 animate-out fade-out fill-mode-forwards">
          <div className="scale-150 sm:scale-[2.2] transform transition-transform duration-1000 ease-in-out">
            <SolidareatyLogo className="w-72 h-auto" />
          </div>
          <p className="mt-8 text-xs font-bold tracking-[0.25em] text-amber-200/80 uppercase animate-pulse">
            The Community Network
          </p>
        </div>
      )}

      <main className="min-h-screen bg-white text-stone-900">
        {/* Üst Promosyon Bandı */}
        <section className="bg-gradient-to-r from-brand-primary via-brand-coral to-brand-wine text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs font-bold sm:px-6">
            <span>🎉 {t("home_promo")}</span>
            <Link href="/courier" className="rounded-full bg-white/15 px-3 py-1.5 hover:bg-white/25 transition">
              {t("home_courier")} →
            </Link>
          </div>
        </section>

        {/* Hero Bölümü */}
        <section className="relative overflow-hidden bg-stone-950 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_15%,rgba(230,159,92,.22),transparent_55%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <span className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-200">
                {t("home_eyebrow")}
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
                {t("home_title")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-stone-300 sm:text-lg">
                {t("home_desc")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#restaurants"
                  className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-brand-primary/95 transition"
                >
                  {t("home_browse")} ↓
                </a>
                <Link
                  href="/produzentenmarkt"
                  className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold hover:bg-white/10 transition"
                >
                  {t("nav_producers")}
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-stone-400">
                <span>✓ Fair local commissions</span>
                <span>✓ Neighborhood couriers</span>
                <span>✓ Solidarity meals</span>
              </div>
            </div>

            {/* Sağ Taraftaki 5'li Ekosistem Kartları (SVG Piktogramlı) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex min-h-48 flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-br from-brand-primary/20 to-brand-wine/10 p-5 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🍲</span>
                  <span className="rounded-full bg-brand-primary/20 px-2.5 py-1 text-[10px] font-extrabold text-amber-200">
                    Restaurants
                  </span>
                </div>
                <p className="max-w-xs text-base font-extrabold text-stone-100">
                  Independent restaurants, connected directly to their neighborhood.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between">
                <span className="text-2xl">🌱</span>
                <p className="mt-2 text-xs font-bold text-stone-200">Local producers</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between">
                <span className="text-2xl">🚲</span>
                <p className="mt-2 text-xs font-bold text-stone-200">Fair delivery</p>
              </div>
            </div>
          </div>
        </section>

        <RestaurantShowcase />

        {/* Alt Bilgi Kartları */}
        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-stone-200 bg-stone-900 p-6 text-white">
            <div className="text-3xl">🥗</div>
            <h2 className="mt-4 text-xl font-black">{t("home_meal_title")}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">{t("home_meal_desc")}</p>
            <Link
              href="/meal-plans"
              className="mt-5 inline-flex rounded-xl bg-brand-light px-4 py-2.5 text-sm font-black text-stone-950 hover:bg-brand-light/90 transition"
            >
              {t("home_meal_cta")} →
            </Link>
          </article>

          <article className="rounded-3xl border border-amber-200/60 bg-amber-50/70 p-6">
            <div className="text-3xl">🌾</div>
            <h2 className="mt-4 text-xl font-black text-stone-900">{t("home_market_title")}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{t("home_market_desc")}</p>
            <Link
              href="/produzentenmarkt"
              className="mt-5 inline-flex rounded-xl bg-brand-wine px-4 py-2.5 text-sm font-black text-white hover:bg-brand-wine/90 transition"
            >
              {t("home_market_cta")} →
            </Link>
          </article>

          <article className="rounded-3xl border border-orange-200/60 bg-orange-50/70 p-6">
            <div className="text-3xl">🍲</div>
            <h2 className="mt-4 text-xl font-black text-stone-900">{t("home_suspended_title")}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{t("home_suspended_desc")}</p>
            <Link
              href="/askida-yemek"
              className="mt-5 inline-flex rounded-xl bg-brand-coral px-4 py-2.5 text-sm font-black text-white hover:bg-brand-coral/90 transition"
            >
              {t("home_suspended_cta")} →
            </Link>
          </article>
        </section>

        {/* Footer */}
        <footer className="border-t border-stone-200 bg-stone-50">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-5 px-5 py-7 text-xs text-stone-500">
            <span>© {new Date().getFullYear()} Solidareaty · Local value, fair work.</span>
            <div className="flex flex-wrap gap-4">
              <Link href="/account/register" className="hover:text-brand-wine">{t("nav_register")}</Link>
              <Link href="/wallet" className="hover:text-brand-wine">{t("nav_wallet")}</Link>
              <Link href="/promoter" className="hover:text-brand-wine">{t("nav_promoter")}</Link>
              <Link href="/producer" className="hover:text-brand-wine">{t("nav_producer_panel")}</Link>
              <Link href="/kds" className="hover:text-brand-wine">{t("nav_kds")}</Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}