"use client";

import React, { useState } from 'react';

interface CartModalProps {
  items: any[];
  onClose: () => void;
  onUpdateQuantity: (cartId: string, delta: number) => void;
  onClearCart: () => void;
  restaurantPhone?: string;
  restaurantName: string;
  restaurantId?: string; // Supabase orders kaydı için restoran ID'si
}

export default function CartModal({
  items,
  onClose,
  onUpdateQuantity,
  onClearCart,
  restaurantName,
  restaurantId
}: CartModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [serviceOption, setServiceOption] = useState("Paket Servis");
  const [paymentMethod, setPaymentMethod] = useState("Nakit");
  const [orderNote, setOrderNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPrice = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0);

  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      alert("Lütfen Ad Soyad ve Telefon bilgilerinizi doldurun.");
      return;
    }

    setIsSubmitting(true);

    // 1. Supabase orders Tablosuna Kayıt Atma (API Çağrısı)
    try {
      const productSummary = items.map(i => `${i.quantity}x ${i.name}`).join(", ");
      await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId || null,
          customer_phone: customerPhone,
          order_type: 'whatsapp',
          total_amount: totalPrice,
          notes: `Müşteri: ${customerName} | Servis: ${serviceOption} | Ödeme: ${paymentMethod} | Adres: ${deliveryAddress || 'Yok'} | Not: ${orderNote || 'Yok'}`,
          product_name: productSummary,
        })
      });
    } catch (err) {
      console.error("Sipariş veritabanına kaydedilirken hata oluştu, WhatsApp yönlendirmesi devam ediyor:", err);
    } finally {
      setIsSubmitting(false);
    }

    // 2. Çok Katmanlı WhatsApp Yönlendirme ve Sipariş Şablonu
    let message = `🔔 *YENİ PLATFORM SİPARİŞİ (umEcke)*\n`;
    message += `-----------------------------------\n`;
    message += `🏛️ *RESTORAN:* *${restaurantName.toUpperCase()}*\n`;
    message += `-----------------------------------\n`;
    message += `👤 *Müşteri:* ${customerName}\n`;
    message += `📞 *Telefon:* ${customerPhone}\n`;
    message += `🚀 *Servis Türü:* ${serviceOption}\n`;
    if (serviceOption === "Paket Servis") {
      message += `📍 *Teslimat Adresi:* ${deliveryAddress || "Belirtilmedi"}\n`;
    }
    message += `💳 *Ödeme Yöntemi:* ${paymentMethod}\n`;
    if (orderNote) message += `📝 *Sipariş Notu:* ${orderNote}\n`;
    message += `-----------------------------------\n`;
    message += `🍽️ *SİPARİŞ EDİLEN ÜRÜNLER:*\n`;

    items.forEach((item, index) => {
      message += `${index + 1}. *${item.quantity}x ${item.name}* — ${(item.price * item.quantity).toFixed(2)} €\n`;
      if (item.size) message += `   ▫ Porsiyon: ${item.size.name}\n`;
      if (item.extras && item.extras.length > 0) {
        message += `   ▫ Ekstralar: ${item.extras.map((e: any) => e.name).join(", ")}\n`;
      }
    });

    message += `-----------------------------------\n`;
    message += `💰 *GENEL TOPLAM:* *${totalPrice.toFixed(2)} €*\n`;
    message += `ℹ️ *Bu sipariş umEcke dijital altyapısı üzerinden yönlendirilmiştir.*`;

    // Merkezi Twilio WhatsApp Hattı (+14124246766)
    const targetPhone = "14124246766"; 
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
    onClearCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sipariş Tamamlama</h2>
            <p className="text-sm text-gray-500">{restaurantName}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* İçerik / Form */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Ürün Listesi */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Sepetteki Ürünler</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.cartId} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex-1 pr-3">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    {item.size && <p className="text-xs text-gray-500">Boyut: {item.size.name}</p>}
                    {item.extras && item.extras.length > 0 && (
                      <p className="text-xs text-gray-500">Ekstralar: {item.extras.map((e: any) => e.name).join(", ")}</p>
                    )}
                    <span className="text-sm font-bold text-green-600 mt-1 block">{(item.price * item.quantity).toFixed(2)} €</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => onUpdateQuantity(item.cartId, -1)}
                      className="w-7 h-7 bg-white border rounded-lg font-bold text-gray-700 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm min-w-[20px] text-center">{item.quantity}</span>
                    <button 
                      onClick={() => onUpdateQuantity(item.cartId, 1)}
                      className="w-7 h-7 bg-white border rounded-lg font-bold text-gray-700 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Müşteri Bilgileri Formu */}
          <form onSubmit={handleSendOrder} className="space-y-4">
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Teslimat & İletişim Bilgileri</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ad Soyad *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ahmet Yılmaz"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon *</label>
                <input 
                  type="tel" 
                  required
                  placeholder="+49 151 12345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Servis Türü</label>
                <select 
                  value={serviceOption} 
                  onChange={(e) => setServiceOption(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black outline-none bg-white"
                >
                  <option value="Paket Servis">Paket Servis</option>
                  <option value="Gel-Al">Gel-Al</option>
                  <option value="Mekanda Servis">Mekanda Servis</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ödeme Yöntemi</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black outline-none bg-white"
                >
                  <option value="Nakit">Nakit</option>
                  <option value="Kredi Kartı / POS">Kredi Kartı / POS</option>
                </select>
              </div>
            </div>

            {serviceOption === "Paket Servis" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Teslimat Adresi</label>
                <textarea 
                  rows={2}
                  placeholder="Sokak, Bina No, Daire, Posta Kodu / Şehir"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black outline-none resize-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sipariş Notu</label>
              <input 
                type="text" 
                placeholder="Örn: Zili çalmayın, acı sos bol olsun vb."
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg flex justify-between items-center px-6 mt-4 cursor-pointer"
            >
              <span>{isSubmitting ? "Sipariş İşleniyor..." : "📲 WhatsApp ile Siparişi Tamamla"}</span>
              <span className="text-lg">{totalPrice.toFixed(2)} €</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}