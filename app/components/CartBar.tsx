"use client";

import React from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartBarProps {
  items: CartItem[];
  onOpenCart: () => void;
}

export default function CartBar({ items, onOpenCart }: CartBarProps) {
  if (!items || items.length === 0) return null;

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50 flex justify-between items-center max-w-2xl mx-auto rounded-t-2xl">
      <div>
        <span className="font-bold text-gray-900">{totalCount} Ürün</span>
        <span className="mx-2 text-gray-300">|</span>
        <span className="font-semibold text-green-600">{totalPrice.toFixed(2)} €</span>
      </div>
      <button
        onClick={onOpenCart}
        className="bg-black text-white px-6 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-sm"
      >
        Sepete Git / Sipariş Ver
      </button>
    </div>
  );
}