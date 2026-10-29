"use client";
import { useI18n, type Locale } from "../../lib/i18n";
export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return <label className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700" aria-label={t("language")}>
    <span aria-hidden="true">🌐</span><span className="sr-only">{t("language")}</span>
    <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} className="cursor-pointer bg-transparent outline-none" aria-label={t("language")}>
      <option value="en">EN</option><option value="de">DE</option><option value="tr">TR</option>
    </select>
  </label>;
}
