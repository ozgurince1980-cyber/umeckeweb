"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "../../lib/i18n";
const RestaurantManager = dynamic(() => import("./RestaurantManager"), { loading: () => <div className="mx-auto min-h-[420px] max-w-7xl animate-pulse rounded-3xl bg-stone-100" aria-label="Loading restaurants" /> });
export default function RestaurantShowcase() {
 const ref=useRef<HTMLDivElement>(null); const [visible,setVisible]=useState(false); const {t}=useI18n();
 useEffect(()=>{const node=ref.current;if(!node){setVisible(true);return;}if(!("IntersectionObserver" in window)){setVisible(true);return;}const observer=new IntersectionObserver((entries)=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:"240px 0px"});observer.observe(node);return()=>observer.disconnect();},[]);
 return <section ref={ref} id="restaurants" aria-label={t("nav_restaurants")} className="scroll-mt-24 min-h-[360px]">{visible?<RestaurantManager/>:<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><div className="min-h-[320px] rounded-3xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-6"><div className="h-4 w-48 animate-pulse rounded bg-stone-200"/><p className="mt-5 text-sm text-stone-500">{t("home_slow")}</p><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map(i=><div key={i} className="h-52 animate-pulse rounded-2xl bg-stone-100"/>)}</div></div></div>}</section>;
}
