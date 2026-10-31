"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import RestaurantShowcase from "./RestaurantShowcase";
import SolidareatyLogo from "./SolidareatyLogo";
import { useI18n } from "../../lib/i18n";

function HomePictogram({ name, size = 22 }: { name: string; size?: number }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const icons: Record<string, ReactNode> = {
    restaurant: <><path {...stroke} d="M4 10h16l-1.3 10H5.3L4 10Z"/><path {...stroke} d="M7 10V7a5 5 0 0 1 10 0v3M8 14h8"/></>,
    producer: <><path {...stroke} d="M5 20V9l7-5 7 5v11M3 20h18M9 20v-6h6v6"/><path {...stroke} d="M12 4c0-2 2-3 4-3 0 2-1 4-4 4"/></>,
    courier: <><circle {...stroke} cx="6" cy="17" r="3.5"/><circle {...stroke} cx="18" cy="17" r="3.5"/><path {...stroke} d="m6 17 4-8h4l4 8m-8-8 4 8H6m4-8-2-3H5"/></>,
    community: <><circle {...stroke} cx="9" cy="8" r="3"/><circle {...stroke} cx="17" cy="9" r="2.5"/><path {...stroke} d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2m1-6a4 4 0 0 1 5 4v2"/></>,
    care: <><path {...stroke} d="M12 20s-8-4.7-8-10a4.3 4.3 0 0 1 8-2 4.3 4.3 0 0 1 8 2c0 5.3-8 10-8 10Z"/><path {...stroke} d="M8 12h2l1-2 2 4 1-2h2"/></>,
    meal: <><path {...stroke} d="M4 12h16a8 8 0 0 1-16 0Z"/><path {...stroke} d="M7 8c-1-1 1-2 0-3m5 3c-1-1 1-2 0-3m5 3c-1-1 1-2 0-3"/></>,
    market: <><path {...stroke} d="M4 10h16l-1 10H5L4 10Zm-1 0 2-5h14l2 5"/><path {...stroke} d="M9 20v-5h6v5"/></>,
    track: <><circle {...stroke} cx="12" cy="12" r="8.5"/><path {...stroke} d="M12 7v5l3.5 2"/></>,
    wallet: <><rect {...stroke} x="3" y="6" width="18" height="14" rx="2.5"/><path {...stroke} d="M3 9h18m-5 5h2"/></>,
    sparkle: <><path {...stroke} d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path {...stroke} d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block", flexShrink: 0 }}>{icons[name] || icons.sparkle}</svg>;
}

export default function HomeLanding() {
  const { t } = useI18n();
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("solidareaty-splash-seen") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setShowSplash(true);
      const timer = window.setTimeout(() => {
        setShowSplash(false);
        try { sessionStorage.setItem("solidareaty-splash-seen", "1"); } catch { /* Storage can be unavailable. */ }
      }, 1550);
      return () => window.clearTimeout(timer);
    } catch { /* Storage can be unavailable. */ }
  }, []);

  const modules = [
    { href: "/#restaurants", label: t("nav_restaurants"), icon: "restaurant" },
    { href: "/meal-plans", label: t("nav_meal_plans"), icon: "meal" },
    { href: "/produzentenmarkt", label: t("nav_producers"), icon: "market" },
    { href: "/askida-yemek", label: t("home_suspended_title"), icon: "care" },
    { href: "/track", label: t("nav_track"), icon: "track" },
    { href: "/wallet", label: t("nav_wallet"), icon: "wallet" },
  ];
  const stakeholders = [
    { icon: "restaurant", label: "Independent restaurants" },
    { icon: "producer", label: "Local producers" },
    { icon: "courier", label: "Fair delivery partners" },
    { icon: "community", label: "Community promoters" },
    { icon: "community", label: "Customers and neighbours" },
  ];

  return (
    <>
      <style>{`
        @keyframes sa-splash-to-brand { 0% { transform: translate(0,0) scale(1.65); opacity:1 } 72% { opacity:1 } 100% { transform: translate(calc(56px - 50vw),calc(28px - 50vh)) scale(.18); opacity:0 } }
        @keyframes sa-splash-fade { 0%,72% { opacity:1 } 100% { opacity:0 } }
        @keyframes sa-mark-breathe { 0%,100% { transform:scale(1) } 50% { transform:scale(1.035) } }
        @keyframes sa-pictogram-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-2px) } }
        .sa-home-splash { animation:sa-splash-fade 1.55s ease forwards }
        .sa-home-splash-mark { animation:sa-splash-to-brand 1.45s cubic-bezier(.72,0,.24,1) forwards }
        .sa-home-logo { animation:sa-mark-breathe 4s ease-in-out infinite }
        .sa-home-module svg,.sa-stakeholders svg { animation:sa-pictogram-float 3.8s ease-in-out infinite }
        .sa-home-module { transition:transform .18s ease,background .18s ease,border-color .18s ease }
        .sa-home-module:hover { transform:translateY(-2px); background:#f8f3e9; border-color:#ddcdb3 }
        @media(max-width:700px){.sa-modules{grid-template-columns:repeat(3,minmax(0,1fr))!important}.sa-stakeholders{grid-template-columns:repeat(2,minmax(0,1fr))!important}.sa-home-hero{grid-template-columns:1fr!important}.sa-home-hero-art{min-height:170px!important}.sa-home-padding{padding-left:16px!important;padding-right:16px!important}}
        @media(max-width:420px){.sa-modules{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
      `}</style>

      {showSplash && <div className="sa-home-splash" aria-hidden="true" style={{ position:"fixed", inset:0, zIndex:99999, display:"grid", placeItems:"center", background:"#f7f8f3", pointerEvents:"none" }}><div className="sa-home-splash-mark"><SolidareatyLogo className="w-[320px] max-w-[82vw] h-auto"/></div></div>}

      <main className="min-h-screen bg-[#f7f8f3] text-[#263f32]">
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="/#top" aria-label="Solidareaty home" className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-[#263f32] no-underline"><SolidareatyLogo className="sa-home-logo h-11 w-auto"/><span>Solidareaty</span></a>
          <Link href="/partner/restaurant" className="rounded-full bg-[#263f32] px-4 py-2.5 text-xs font-extrabold text-white no-underline">{t("nav_restaurant_signup")}</Link>
        </header>

        <nav aria-label="Explore Solidareaty" className="sa-modules mx-auto grid max-w-7xl grid-cols-6 gap-2 px-5 pb-5 sm:px-8">
          {modules.map((module) => <Link key={module.href} href={module.href} className="sa-home-module flex min-h-[64px] min-w-0 items-center justify-center gap-2 rounded-2xl border border-[#e6eae2] bg-white px-2 py-2 text-center text-[11px] font-extrabold text-[#53665a] no-underline"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f2eee5] text-[#957458]"><HomePictogram name={module.icon} size={18}/></span><span>{module.label}</span></Link>)}
        </nav>

        <section id="top" className="sa-home-padding mx-auto max-w-7xl px-5 pb-9 sm:px-8">
          <div className="sa-home-hero relative grid min-h-[350px] grid-cols-[1.08fr_.92fr] items-center gap-6 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#e8efdf] via-[#f2efdf] to-[#f5dfd1] p-7 sm:p-12">
            <div className="relative z-10"><div className="inline-flex items-center gap-2 rounded-full border border-[#dfe5da] bg-white/70 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[#62745f]"><HomePictogram name="sparkle" size={15}/>{t("home_eyebrow")}</div><h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.02] tracking-tight text-[#263f32] sm:text-6xl">{t("home_title")}</h1><p className="mt-4 max-w-xl text-sm leading-7 text-[#617066] sm:text-base">{t("home_desc")}</p><a href="#restaurants" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d96a49] px-5 py-3 text-xs font-extrabold text-white no-underline">{t("home_browse")}<span aria-hidden="true">→</span></a></div>
            <div className="sa-home-hero-art relative grid min-h-[255px] place-items-center"><div className="absolute h-56 w-56 rounded-full border border-white/70 bg-white/35"/><div className="relative rounded-full bg-white/65 p-5 shadow-xl"><SolidareatyLogo className="sa-home-logo h-36 w-auto"/></div><span className="absolute right-0 top-6 rounded-xl bg-white px-3 py-2 text-[10px] font-extrabold text-[#566b59] shadow">Local value, shared fairly</span><span className="absolute bottom-5 left-0 rounded-xl bg-[#263f32] px-3 py-2 text-[10px] font-bold text-white">Connected neighbourhoods</span></div>
          </div>
        </section>

        <section className="sa-home-padding mx-auto max-w-7xl px-5 pb-10 sm:px-8"><div className="mb-4"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#a47652]">A connected local ecosystem</p><h2 className="text-2xl font-black tracking-tight text-[#263f32] sm:text-3xl">Every part of the neighbourhood matters</h2></div><div className="sa-stakeholders grid grid-cols-5 gap-2">{stakeholders.map((item)=><div key={item.label} className="flex min-h-[76px] items-center gap-2 rounded-2xl border border-[#e7eae3] bg-white p-3 text-[10px] font-bold text-[#596b5e] sm:text-xs"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f2eee5] text-[#927653]"><HomePictogram name={item.icon} size={19}/></span>{item.label}</div>)}</div><div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#e9dfcf] bg-[#f4efe5] p-3 text-xs font-bold text-[#766347]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/70 text-[#9a7950]"><HomePictogram name="care" size={19}/></span>Pay-it-forward meals bring neighbours in need into the circle of care.</div></section>

        <RestaurantShowcase />

        <section className="sa-home-padding mx-auto grid max-w-7xl gap-3 px-5 py-9 sm:grid-cols-3 sm:px-8">
          <article className="rounded-3xl border border-[#e4e7df] bg-white p-6"><span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#f3eee4] text-[#927653]"><HomePictogram name="meal"/></span><h2 className="text-lg font-black">{t("home_meal_title")}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{t("home_meal_desc")}</p><Link href="/meal-plans" className="mt-4 inline-flex rounded-xl bg-[#263f32] px-4 py-2.5 text-xs font-extrabold text-white no-underline">{t("home_meal_cta")} →</Link></article>
          <article className="rounded-3xl border border-[#e4e7df] bg-white p-6"><span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#f3eee4] text-[#927653]"><HomePictogram name="market"/></span><h2 className="text-lg font-black">{t("home_market_title")}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{t("home_market_desc")}</p><Link href="/produzentenmarkt" className="mt-4 inline-flex rounded-xl bg-[#657b5c] px-4 py-2.5 text-xs font-extrabold text-white no-underline">{t("home_market_cta")} →</Link></article>
          <article className="rounded-3xl border border-[#e9dfcf] bg-[#f7f2e8] p-6"><span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white text-[#927653]"><HomePictogram name="care"/></span><h2 className="text-lg font-black">{t("home_suspended_title")}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{t("home_suspended_desc")}</p><Link href="/askida-yemek" className="mt-4 inline-flex rounded-xl bg-[#ad7652] px-4 py-2.5 text-xs font-extrabold text-white no-underline">{t("home_suspended_cta")} →</Link></article>
        </section>
        <footer className="border-t border-[#e4e8e1] bg-white"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-5 px-5 py-7 text-xs text-stone-500 sm:px-8"><span>© {new Date().getFullYear()} Solidareaty · Local value, fair work.</span><div className="flex flex-wrap gap-4"><Link href="/account/register">{t("nav_register")}</Link><Link href="/wallet">{t("nav_wallet")}</Link><Link href="/promoter">{t("nav_promoter")}</Link><Link href="/producer">{t("nav_producer_panel")}</Link><Link href="/kds">{t("nav_kds")}</Link></div></div></footer>
      </main>
    </>
  );
}
