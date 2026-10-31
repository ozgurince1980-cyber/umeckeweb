"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type MutableRefObject } from "react";
import RestaurantShowcase from "./RestaurantShowcase";
import SolidareatyLogo from "./SolidareatyLogo";
import { useI18n } from "../../lib/i18n";

type Connection = { d: string; targetX: number; targetY: number; color: string; delay: number };

function NetworkPictogram({ name, size = 22 }: { name: string; size?: number }) {
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    restaurant: <><path {...line} d="M4 10h16l-1.3 10H5.3L4 10Z"/><path {...line} d="M7 10V7a5 5 0 0 1 10 0v3M8 14h8"/></>,
    producer: <><path {...line} d="M5 20V9l7-5 7 5v11M3 20h18M9 20v-6h6v6"/><path {...line} d="M12 4c0-2 2-3 4-3 0 2-1 4-4 4"/></>,
    courier: <><circle {...line} cx="6" cy="17" r="3.5"/><circle {...line} cx="18" cy="17" r="3.5"/><path {...line} d="m6 17 4-8h4l4 8m-8-8 4 8H6m4-8-2-3H5"/></>,
    community: <><circle {...line} cx="9" cy="8" r="3"/><circle {...line} cx="17" cy="9" r="2.5"/><path {...line} d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2m1-6a4 4 0 0 1 5 4v2"/></>,
    care: <><path {...line} d="M12 20s-8-4.7-8-10a4.3 4.3 0 0 1 8-2 4.3 4.3 0 0 1 8 2c0 5.3-8 10-8 10Z"/><path {...line} d="M8 12h2l1-2 2 4 1-2h2"/></>,
    sparkle: <><path {...line} d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path {...line} d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block", flexShrink: 0 }}>{paths[name] || paths.sparkle}</svg>;
}

function NetworkMark({ size = 168, dotRefs }: { size?: number; dotRefs: MutableRefObject<(SVGCircleElement | null)[]> }) {
  return <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Solidareaty community network mark" style={{ display: "block", overflow: "visible" }}>
    <circle cx="100" cy="100" r="71" fill="none" stroke="#d9c9a8" strokeWidth="2" strokeDasharray="3 7" />
    <g stroke="#d7c5a4" strokeWidth="2.5" strokeLinecap="round"><path d="M100 100 48 57"/><path d="M100 100 151 55"/><path d="M100 100 37 129"/><path d="M100 100 162 130"/><path d="M100 100 100 174"/></g>
    <g fill="#e6a05f"><circle cx="72" cy="77" r="5"/><circle cx="127" cy="76" r="5"/><circle cx="67" cy="116" r="5"/><circle cx="134" cy="117" r="5"/><circle cx="100" cy="137" r="5"/></g>
    <g fill="#fff8ec" stroke="#d66d4b" strokeWidth="2">
      <circle r="3.2"><animateMotion path="M100 100 L48 57" dur="2.5s" begin="0s" repeatCount="indefinite"/></circle>
      <circle r="3.2"><animateMotion path="M100 100 L151 55" dur="2.8s" begin=".35s" repeatCount="indefinite"/></circle>
      <circle r="3.2"><animateMotion path="M100 100 L37 129" dur="2.65s" begin=".7s" repeatCount="indefinite"/></circle>
      <circle r="3.2"><animateMotion path="M100 100 L162 130" dur="2.9s" begin="1.05s" repeatCount="indefinite"/></circle>
      <circle r="3.2"><animateMotion path="M100 100 L100 174" dur="2.55s" begin="1.4s" repeatCount="indefinite"/></circle>
    </g>
    <circle cx="100" cy="100" r="19" fill="#263f32"/><circle cx="100" cy="100" r="7" fill="#e9a66a"/>
    <circle ref={(node)=>{dotRefs.current[0]=node}} className="sa-brand-node" style={{animationDelay:"0s"}} cx="48" cy="57" r="10" fill="#d66d4b" stroke="#fff9ef" strokeWidth="4"/><circle ref={(node)=>{dotRefs.current[1]=node}} className="sa-brand-node" style={{animationDelay:".13s"}} cx="151" cy="55" r="10" fill="#879b75" stroke="#fff9ef" strokeWidth="4"/><circle ref={(node)=>{dotRefs.current[2]=node}} className="sa-brand-node" style={{animationDelay:".26s"}} cx="37" cy="129" r="10" fill="#d2a05f" stroke="#fff9ef" strokeWidth="4"/><circle ref={(node)=>{dotRefs.current[3]=node}} className="sa-brand-node" style={{animationDelay:".39s"}} cx="162" cy="130" r="10" fill="#879b75" stroke="#fff9ef" strokeWidth="4"/><circle ref={(node)=>{dotRefs.current[4]=node}} className="sa-brand-node" style={{animationDelay:".52s"}} cx="100" cy="174" r="10" fill="#d66d4b" stroke="#fff9ef" strokeWidth="4"/>
  </svg>;
}

export default function HomeLanding() {
  const { t } = useI18n();
  const stageRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const targetRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const brandDotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [motionAllowed, setMotionAllowed] = useState(false);

  const stakeholders = [
    { icon: "restaurant", label: "Independent restaurants", color: "#d66d4b" },
    { icon: "producer", label: "Local producers", color: "#879b75" },
    { icon: "courier", label: "Fair delivery partners", color: "#d2a05f" },
    { icon: "community", label: "Community promoters", color: "#879b75" },
    { icon: "community", label: "Customers and neighbours", color: "#d66d4b" },
  ];

  useEffect(() => {
    const stage = stageRef.current;
    const mark = markRef.current;
    if (!stage || !mark) return;
    const updateConnections = () => {
      const bounds = stage.getBoundingClientRect();
      const originBounds = mark.getBoundingClientRect();
      const centerX = originBounds.left + originBounds.width / 2 - bounds.left;
      const centerY = originBounds.top + originBounds.height / 2 - bounds.top;
      const targets: Connection[] = [];
      targetRefs.current.slice(0, stakeholders.length + 1).forEach((node, index) => {
        if (!node) return;
        const sourceNode = index < stakeholders.length ? brandDotRefs.current[index] : null;
        const sourceBounds = sourceNode?.getBoundingClientRect();
        const x1 = sourceBounds ? sourceBounds.left + sourceBounds.width / 2 - bounds.left : centerX;
        const y1 = sourceBounds ? sourceBounds.top + sourceBounds.height / 2 - bounds.top : centerY;
        const rect = node.getBoundingClientRect();
        const x2 = rect.left + rect.width / 2 - bounds.left;
        const y2 = rect.top + rect.height / 2 - bounds.top;
        const bend = (index - 2) * Math.min(34, bounds.width * 0.035);
        const curveX = x1 + (x2 - x1) * 0.52 + bend;
        const curveY = y1 + (y2 - y1) * 0.55;
        targets.push({ d: `M ${x1} ${y1} Q ${curveX} ${curveY} ${x2} ${y2}`, targetX: x2, targetY: y2, color: index === stakeholders.length ? "#b38c57" : stakeholders[index]?.color || "#879b75", delay: index * 0.13 });
      });
      setConnections(targets);
    };
    updateConnections();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateConnections) : null;
    observer?.observe(stage);
    observer?.observe(mark);
    brandDotRefs.current.forEach((node) => { if (node) observer?.observe(node); });
    targetRefs.current.forEach((node) => { if (node) observer?.observe(node); });
    window.addEventListener("resize", updateConnections);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMotionAllowed(!reduced);
    return () => { observer?.disconnect(); window.removeEventListener("resize", updateConnections); };
  }, []);

  const modules = [
    { href: "/#restaurants", label: t("nav_restaurants"), icon: "restaurant" },
    { href: "/meal-plans", label: t("nav_meal_plans"), icon: "care" },
    { href: "/produzentenmarkt", label: t("nav_producers"), icon: "producer" },
    { href: "/askida-yemek", label: t("home_suspended_title"), icon: "care" },
    { href: "/track", label: t("nav_track"), icon: "sparkle" },
    { href: "/wallet", label: t("nav_wallet"), icon: "community" },
  ];

  return <main className="sa-home min-h-screen bg-[#f7f8f3] text-[#263f32]">
    <style>{`
      @keyframes sa-connection-draw { to { stroke-dashoffset: 0; } }
      @keyframes sa-picto-arrive { 0% { transform:scale(.75); opacity:.6 } 60% { transform:scale(1.14); opacity:1 } 100% { transform:scale(1); opacity:1 } }
      @keyframes sa-brand-node-pulse { 0%,100% { transform:scale(1); opacity:.9 } 45% { transform:scale(1.24); opacity:1 } }
      @keyframes sa-connection-fade { to { opacity:0 } }
      @keyframes sa-traveler-fade { 0%,72% { opacity:1 } 100% { opacity:0 } }
      @keyframes sa-mark-pulse { 0%,100% { filter:drop-shadow(0 12px 22px rgba(38,63,50,.08)) } 50% { filter:drop-shadow(0 14px 27px rgba(182,130,78,.22)) } }
      @keyframes sa-splash-fade { 0%,75% { opacity:1 } 100% { opacity:0 } }
      .sa-home .sa-connection { stroke-dasharray:1; stroke-dashoffset:1; opacity:.38; animation:sa-connection-draw .72s cubic-bezier(.2,.65,.25,1) forwards,sa-connection-fade .38s ease-out 1.12s forwards; }
      .sa-home .sa-traveler { animation:sa-traveler-fade 1.25s ease-out forwards; }
      .sa-home .sa-picto { transform-box:fill-box; transform-origin:center; animation:sa-picto-arrive .55s ease-out both; }
      .sa-home .sa-mark { animation:sa-mark-pulse 4s ease-in-out infinite; }
      .sa-home .sa-brand-node { transform-box:fill-box; transform-origin:center; animation:sa-brand-node-pulse 2.15s ease-in-out infinite; }
      .sa-home .sa-nav-card { transition:transform .18s ease,background .18s ease,border-color .18s ease; }
      .sa-home .sa-nav-card:hover { transform:translateY(-2px); background:#f8f3e9; border-color:#ddcdb3; }
      .sa-home .sa-network-lines { position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; z-index:2; }
      @media(max-width:760px){.sa-home .sa-modules{grid-template-columns:repeat(3,minmax(0,1fr))!important}.sa-home .sa-hero{grid-template-columns:1fr!important}.sa-home .sa-hero-art{min-height:230px!important}.sa-home .sa-stakeholders{grid-template-columns:repeat(2,minmax(0,1fr))!important}.sa-home .sa-side-branch{margin-top:10px}}
      @media(max-width:420px){.sa-home .sa-modules{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(prefers-reduced-motion:reduce){.sa-home .sa-connection,.sa-home .sa-picto,.sa-home .sa-mark,.sa-home .sa-brand-node{animation:none!important;transition:none!important}.sa-home .sa-connection{stroke-dashoffset:0;opacity:0}.sa-home .sa-traveler{display:none}}
    `}</style>

    <nav aria-label="Explore Solidareaty" className="sa-modules mx-auto grid max-w-7xl grid-cols-6 gap-2 px-5 pb-5 sm:px-8">
      {modules.map((module) => <Link key={module.href} href={module.href} className="sa-nav-card flex min-h-[62px] min-w-0 items-center justify-center gap-2 rounded-2xl border border-[#e6eae2] bg-white px-2 py-2 text-center text-[11px] font-extrabold text-[#53665a] no-underline"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f2eee5] text-[#957458]"><NetworkPictogram name={module.icon} size={18}/></span><span>{module.label}</span></Link>)}
    </nav>

    <div ref={stageRef} className="relative mx-auto max-w-7xl px-5 pb-12 sm:px-8">
      <svg className="sa-network-lines" aria-hidden="true" viewBox={`0 0 ${Math.max(stageRef.current?.clientWidth || 1, 1)} ${Math.max(stageRef.current?.clientHeight || 1, 1)}`} preserveAspectRatio="none">
        {connections.map((connection, index) => <g key={`connection-${index}`}>
          <path d={connection.d} pathLength="1" fill="none" stroke={connection.color} strokeWidth="2" strokeOpacity=".35" strokeLinecap="round" className={motionAllowed ? "sa-connection" : ""} style={{ animationDelay: `${connection.delay}s`, strokeDashoffset: motionAllowed ? 1 : 0 }}/>
          {motionAllowed && <circle className="sa-traveler" r="4.2" fill={connection.color} stroke="#f7f8f3" strokeWidth="2" style={{ animationDelay: `${connection.delay}s` }}><animateMotion path={connection.d} dur="1.1s" begin={`${connection.delay}s`} fill="freeze" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".2 .65 .25 1"/></circle>}
          <circle className={motionAllowed ? "sa-picto" : ""} cx={connection.targetX} cy={connection.targetY} r="3" fill={connection.color} style={{ animationDelay: `${connection.delay + .78}s` }}/>
        </g>)}
      </svg>

      <section id="top" className="relative z-[1] grid min-h-[354px] grid-cols-[1.08fr_.92fr] items-center gap-6 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#e9efdf] via-[#f2efdf] to-[#f5dfd1] p-7 sm:p-12">
        <div className="relative z-[3]"><span className="inline-flex items-center gap-2 rounded-full border border-[#dce3d8] bg-white/70 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[#65765f]"><NetworkPictogram name="sparkle" size={15}/>Local food. Fair work. Stronger neighbourhoods.</span><h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.02] tracking-tight text-[#263f32] sm:text-6xl">Good things happen around the corner.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-[#617066] sm:text-base">Order from independent restaurants and local producers. Keep more value in your neighbourhood.</p><a href="#restaurants" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d96a49] px-5 py-3 text-xs font-extrabold text-white no-underline">{t("home_browse")}<span aria-hidden="true">→</span></a></div>
        <div className="sa-hero-art relative z-[3] grid min-h-[270px] place-items-center"><div className="absolute h-[245px] w-[245px] rounded-full border border-white/75 bg-white/35"/><div ref={markRef} className="sa-mark relative grid h-[196px] w-[196px] place-items-center rounded-full bg-white/65 shadow-[0_18px_42px_rgba(38,63,50,.10)]"><NetworkMark size={172} dotRefs={brandDotRefs}/></div><span className="absolute right-0 top-5 rounded-xl bg-white px-3 py-2 text-[10px] font-extrabold text-[#566b59] shadow">Local value, shared fairly</span><span className="absolute bottom-5 left-0 rounded-xl bg-[#263f32] px-3 py-2 text-[10px] font-bold text-white">Connected neighbourhoods</span></div>
      </section>

      <section className="relative z-[1] pt-14">
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#a47652]">A connected local ecosystem</p><h2 className="mb-4 text-2xl font-black tracking-tight text-[#263f32] sm:text-3xl">Every part of the neighbourhood matters</h2>
        <div className="sa-stakeholders grid grid-cols-5 gap-2">{stakeholders.map((item, index)=><div key={item.label} className="relative z-[3] flex min-h-[76px] items-center gap-2 rounded-2xl border border-[#e7eae3] bg-white/95 p-3 text-[10px] font-bold text-[#596b5e] shadow-sm sm:text-xs"><span ref={(node)=>{targetRefs.current[index]=node}} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f2eee5] text-[#927653]"><NetworkPictogram name={item.icon} size={19}/></span>{item.label}</div>)}</div>
        <div className="sa-side-branch relative z-[3] mt-2 flex items-center gap-3 rounded-2xl border border-[#e9dfcf] bg-[#f4efe5]/95 p-3 text-xs font-bold text-[#766347] shadow-sm"><span ref={(node)=>{targetRefs.current[stakeholders.length]=node}} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/80 text-[#9a7950]"><NetworkPictogram name="care" size={19}/></span><span>Pay-it-forward meals bring neighbours in need into the circle of care.</span></div>
      </section>
    </div>

    <RestaurantShowcase />
    <section className="mx-auto grid max-w-7xl gap-3 px-5 py-9 sm:grid-cols-3 sm:px-8"><article className="rounded-3xl border border-[#e4e7df] bg-white p-6"><span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#f3eee4] text-[#927653]"><NetworkPictogram name="care"/></span><h2 className="text-lg font-black">{t("home_meal_title")}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{t("home_meal_desc")}</p><Link href="/meal-plans" className="mt-4 inline-flex rounded-xl bg-[#263f32] px-4 py-2.5 text-xs font-extrabold text-white no-underline">{t("home_meal_cta")} →</Link></article><article className="rounded-3xl border border-[#e4e7df] bg-white p-6"><span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#f3eee4] text-[#927653]"><NetworkPictogram name="producer"/></span><h2 className="text-lg font-black">{t("home_market_title")}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{t("home_market_desc")}</p><Link href="/produzentenmarkt" className="mt-4 inline-flex rounded-xl bg-[#657b5c] px-4 py-2.5 text-xs font-extrabold text-white no-underline">{t("home_market_cta")} →</Link></article><article className="rounded-3xl border border-[#e9dfcf] bg-[#f7f2e8] p-6"><span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white text-[#927653]"><NetworkPictogram name="care"/></span><h2 className="text-lg font-black">{t("home_suspended_title")}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{t("home_suspended_desc")}</p><Link href="/askida-yemek" className="mt-4 inline-flex rounded-xl bg-[#ad7652] px-4 py-2.5 text-xs font-extrabold text-white no-underline">{t("home_suspended_cta")} →</Link></article></section>
    <footer className="border-t border-[#e4e8e1] bg-white"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-5 px-5 py-7 text-xs text-stone-500 sm:px-8"><span>© {new Date().getFullYear()} Solidareaty · Local value, fair work.</span><div className="flex flex-wrap gap-4"><Link href="/account/register">{t("nav_register")}</Link><Link href="/wallet">{t("nav_wallet")}</Link><Link href="/promoter">{t("nav_promoter")}</Link><Link href="/producer">{t("nav_producer_panel")}</Link><Link href="/kds">{t("nav_kds")}</Link></div></div></footer>
  </main>;
}
