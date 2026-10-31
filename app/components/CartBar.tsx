"use client";

import React from 'react';
import { useI18n } from "../../lib/i18n";

interface CartBarProps {
  items: any[];
  onOpenCart: () => void;
}

export default function CartBar({ items, onOpenCart }: CartBarProps) {
  const { t } = useI18n();
  if (!items || items.length === 0) return null;

  const totalCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const totalPrice = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '600px',
      backgroundColor: '#111',
      color: '#fff',
      padding: '16px 24px',
      borderRadius: '16px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{totalCount} {t("cart_items")}</span>
        <span style={{ color: '#666' }}>|</span>
        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#48bb78' }}>{totalPrice.toFixed(2)} €</span>
      </div>
      <button
        onClick={onOpenCart}
        style={{
          backgroundColor: '#38a169',
          color: '#fff',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '10px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {t("cart_submit")}
      </button>
    </div>
  );
}