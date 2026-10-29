'use client';
import { useState } from 'react';
import ProductModal from './ProductModal';

export default function ProductListClient({ products, onAddToCart }: { products: any[]; onAddToCart: (cartItem: any) => void }) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  return (
    <>
      <div className="grid gap-4">
        {products && products.length > 0 ? (
          products.map((product: any) => (
            <button
              type="button"
              key={product.id} 
              onClick={() => setSelectedProduct(product)}
              className="w-full text-left bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border cursor-pointer hover:border-green-500 hover:shadow-md transition-all"
            >
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                <span className="text-green-600 font-bold mt-2 inline-block">€{product.price}</span>
              </div>
              {product.image_url && (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-20 h-20 object-cover rounded-lg border" 
                />
              )}
            </button>
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">Bu restorana ait henüz ürün bulunmuyor.</p>
        )}
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={onAddToCart}
        />
      )}
    </>
  );
}