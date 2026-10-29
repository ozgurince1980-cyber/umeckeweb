"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useI18n } from "../../../lib/i18n";

export default function CustomerRegisterPage() {
  const { locale } = useI18n();
  const copy = {
    en: { back:"Back to shopping", title:"Create a customer account", intro:"Your signed-in account connects your orders and neighborhood points. Registration is optional for guest checkout.", full:"Full name", email:"Email", password:"Password", hint:"At least 6 characters", submit:"Create customer account", busy:"Creating account…", existing:"Already have an account?", wallet:"Sign in to your wallet", success:"Your account is ready and you are signed in.", verify:"Registration received. Verify your email, then sign in from your wallet.", error:"Could not create your account. Please try again." },
    de: { back:"Zurück zum Einkauf", title:"Kundenkonto erstellen", intro:"Dein angemeldetes Konto verbindet Bestellungen und Nachbarschaftspunkte. Für Gastbestellungen ist keine Registrierung nötig.", full:"Vollständiger Name", email:"E-Mail", password:"Passwort", hint:"Mindestens 6 Zeichen", submit:"Kundenkonto erstellen", busy:"Konto wird erstellt…", existing:"Du hast bereits ein Konto?", wallet:"In die Geldbörse einloggen", success:"Dein Konto ist erstellt und du bist angemeldet.", verify:"Bitte bestätige deine E-Mail-Adresse und melde dich anschließend in deiner Geldbörse an.", error:"Konto konnte nicht erstellt werden. Bitte erneut versuchen." },
    tr: { back:"Alışverişe dön", title:"Müşteri hesabı oluştur", intro:"Giriş yaptığınız hesap siparişlerinizi ve mahalle puanlarınızı birbirine bağlar. Misafir siparişi için kayıt zorunlu değildir.", full:"Ad Soyad", email:"E-posta", password:"Şifre", hint:"En az 6 karakter", submit:"Müşteri hesabı oluştur", busy:"Hesap oluşturuluyor…", existing:"Zaten hesabınız var mı?", wallet:"Cüzdana giriş yapın", success:"Hesabınız oluşturuldu ve giriş yaptınız.", verify:"Kayıt alındı. E-postanızı doğrulayın, ardından cüzdan sayfasından giriş yapın.", error:"Hesap oluşturulamadı. Lütfen tekrar deneyin." },
  } as const;
  const text = copy[locale];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        setMessage(text.success);
      } else {
        setMessage(text.verify);
      }
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : text.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-4 py-10 text-white">
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-stone-800 bg-stone-900 p-8 shadow-2xl">
        <Link href="/" className="text-xs font-bold text-stone-400 hover:text-white">← {text.back}</Link>
        <div>
          <div className="text-4xl">🏘️</div>
          <h1 className="mt-3 text-2xl font-black">{text.title}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-400">{text.intro}</p>
        </div>

        {error && <div role="alert" className="rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{error}</div>}
        {message && <div role="status" className="rounded-xl border border-emerald-900 bg-emerald-950/50 p-3 text-sm text-emerald-300">{message}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-xs font-bold text-stone-300">{text.full}</label>
            <input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-stone-700 bg-stone-800 p-3 text-sm outline-none focus:border-orange-500" placeholder={text.full} />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-bold text-stone-300">{text.email}</label>
            <input id="email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-stone-700 bg-stone-800 p-3 text-sm outline-none focus:border-orange-500" placeholder={text.email} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-bold text-stone-300">{text.password}</label>
            <input id="password" required minLength={6} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-stone-700 bg-stone-800 p-3 text-sm outline-none focus:border-orange-500" placeholder={text.hint} />
          </div>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-orange-600 py-3.5 text-sm font-black text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? text.busy : text.submit}
          </button>
        </form>

        <p className="text-center text-xs text-stone-400">{text.existing} <Link href="/wallet" className="font-bold text-orange-400 underline">{text.wallet}</Link></p>
      </section>
    </main>
  );
}
