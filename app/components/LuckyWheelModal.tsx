"use client";

import React, { useState } from "react";

interface LuckyWheelModalProps {
  onClose: () => void;
  onApplyCoupon?: (code: string) => void;
}

const slices = [
  { index: 0, title: "%10 İndirim", color: "#E69F5C" },
  { index: 1, title: "Bedava Teslimat", color: "#10b981" },
  { index: 2, title: "%15 İndirim", color: "#3b82f6" },
  { index: 3, title: "3 € Hediye", color: "#8b5cf6" },
  { index: 4, title: "Tatlı İkramı", color: "#ec4899" },
  { index: 5, title: "%20 Süper Şans", color: "#ef4444" },
];

export default function LuckyWheelModal({ onClose, onApplyCoupon }: LuckyWheelModalProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<{ title: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const spinWheel = async () => {
    if (spinning || wonPrize) return;
    setError("Şans çarkı, güvenli ve kullanıcıya bağlı kupon üretimi tamamlanana kadar geçici olarak duraklatıldı.");
  };

  const copyCode = () => {
    if (!wonPrize) return;
    navigator.clipboard.writeText(wonPrize.code);
    setCopied(true);
    if (onApplyCoupon) onApplyCoupon(wonPrize.code);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 text-center text-white shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
        >
          ✕
        </button>

        <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-300">
          🎁 Mahalle Şans Çarkı
        </span>
        <h2 className="mt-2 text-2xl font-black">Günün Şansını Çevir</h2>
        <p className="mt-1 text-xs text-slate-400">
          Mahalle dayanışmasına özel indirimler ve ücretsiz teslimat kuponları kazanın!
        </p>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        {/* ÇARK SVG & İBRE */}
        <div className="relative my-6 mx-auto h-[260px] w-[260px] sm:h-[280px] sm:w-[280px]">
          {/* Üst Kırmızı İbre (Pointer) */}
          <div className="absolute -top-3 left-1/2 z-20 h-0 w-0 -translate-x-1/2 border-x-[12px] border-t-[20px] border-x-transparent border-t-red-500 drop-shadow-md" />

          {/* Dönen Çark */}
          <div
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 4s cubic-bezier(0.15, 0.9, 0.25, 1)" : "none",
            }}
            className="h-full w-full rounded-full border-4 border-amber-300 shadow-2xl"
          >
            <svg viewBox="0 0 300 300" className="h-full w-full">
              {slices.map((s, i) => {
                const angle = 360 / slices.length;
                const startAngle = i * angle;
                const endAngle = (i + 1) * angle;
                const x1 = 150 + 140 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                const y1 = 150 + 140 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                const x2 = 150 + 140 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                const y2 = 150 + 140 * Math.sin((Math.PI * (endAngle - 90)) / 180);
                const pathData = `M 150 150 L ${x1} ${y1} A 140 140 0 0 1 ${x2} ${y2} Z`;
                const textAngle = startAngle + angle / 2;

                return (
                  <g key={s.index}>
                    <path d={pathData} fill={s.color} stroke="#29343C" strokeWidth="2" />
                    <text
                      x="150"
                      y="50"
                      transform={`rotate(${textAngle}, 150, 150)`}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="900"
                    >
                      {s.title}
                    </text>
                  </g>
                );
              })}
              {/* Merkez Göbek */}
              <circle cx="150" cy="150" r="28" fill="#29343C" stroke="#FAC796" strokeWidth="3" />
              <text x="150" y="154" textAnchor="middle" fill="#FAC796" fontSize="9" fontWeight="900">
                Solidareaty
              </text>
            </svg>
          </div>
        </div>

        {/* KAZANILAN ÖDÜL KARTI */}
        {wonPrize ? (
          <div className="space-y-3 rounded-2xl border border-emerald-500/50 bg-emerald-950/40 p-4">
            <div className="text-3xl">🎉</div>
            <div className="text-xs text-emerald-300 font-bold">Tebrikler, Ödülünüz:</div>
            <div className="text-lg font-black text-white">{wonPrize.title}</div>
            <div className="flex items-center justify-center gap-2">
              <span className="rounded-xl border border-dashed border-emerald-400 bg-emerald-900/60 px-4 py-2 font-mono text-base font-black text-emerald-300">
                {wonPrize.code}
              </span>
              <button
                onClick={copyCode}
                className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                {copied ? "✓ Kopyalandı!" : "Kopyala"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Bu kupon kodunu sepette kullanarak indirimden yararlanabilirsiniz.</p>
          </div>
        ) : (
          <button
            onClick={spinWheel}
            disabled={true}
            className="w-full cursor-not-allowed rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 py-3.5 text-sm font-black text-slate-950 shadow-xl hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Güvenlik güncellemesi nedeniyle geçici olarak kapalı
          </button>
        )}
      </div>
    </div>
  );
}
