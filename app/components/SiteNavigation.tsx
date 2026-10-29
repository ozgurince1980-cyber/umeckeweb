"use client";

import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import SolidareatyLogo from "./SolidareatyLogo";
import { useI18n } from "../../lib/i18n";

export default function SiteNavigation() {
  const { t } = useI18n();
  const links = [
    ["/", t("nav_restaurants")],
    ["/meal-plans", t("nav_meal_plans")],
    ["/produzentenmarkt", t("nav_producers")],
    ["/askida-yemek", t("nav_suspended")],
    ["/track", t("nav_track")],
    ["/wallet", t("nav_wallet")],
  ];
  const partner = [
    ["/partner/restaurant", t("nav_restaurant_signup")],
    ["/producer", t("nav_producer_panel")],
    ["/courier", t("nav_courier")],
    ["/promoter", t("nav_promoter")],
    ["/kds", t("nav_kds")],
    ["/account/register", t("nav_register")],
  ];

  return (
    <header className="sticky top-0 z-[3000] border-b border-stone-200/80 bg-white/95 shadow-sm backdrop-blur">
      <nav aria-label="Primary" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-2 sm:px-6">
        <Link href="/" aria-label="Solidareaty home" className="shrink-0">
          <SolidareatyLogo className="h-12 w-[205px] max-w-[42vw]" />
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-stone-700">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="transition hover:text-brand-wine">
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-full border border-stone-200 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50">
              {t("nav_partner_panels")} ▾
            </summary>
            <div className="absolute right-0 z-[5000] mt-2 grid min-w-52 gap-1 rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
              {partner.map(([href, label]) => (
                <Link key={href} href={href} className="rounded-lg px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-brand-light/30 hover:text-brand-wine">
                  {label}
                </Link>
              ))}
            </div>
          </details>
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
