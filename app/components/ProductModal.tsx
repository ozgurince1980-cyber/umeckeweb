'use client';
import { useState } from 'react';

interface ProductModalProps {
  product: any;
  onClose: () => void;
  onAddToCart: (cartItem: any) => void;
}

export default function ProductModal({ product, onClose, onAddToCart }: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState<any>({ id: '1', name: 'Normal Boy', price: 0 });
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Örnek dinamik seçenekler
  const sizes = [
    { id: '1', name: 'Normal Boy', price: 0 },
    { id: '2', name: 'Büyük Boy', price: 2.50 },
  ];

  const extras = [
    { id: 'e1', name: 'Ekstra Peynir', price: 1.00 },
    { id: 'e2', name: 'Acı Sos', price: 0.50 },
    { id: 'e3', name: 'Mantar', price: 1.50 },
  ];

  const handleExtraToggle = (extraId: string) => {
    if (selectedExtras.includes(extraId)) {
      setSelectedExtras(selectedExtras.filter(id => id !== extraId));
    } else {
      setSelectedExtras([...selectedExtras, extraId]);
    }
  };

  // Toplam fiyat hesaplama
  const basePrice = Number(product.price) || 0;
  const sizePrice = selectedSize ? selectedSize.price : 0;
  const extrasPrice = selectedExtras.reduce((total, extraId) => {
    const extra = extras.find(e => e.id === extraId);
    return total + (extra ? extra.price : 0);
  }, 0);

  const unitPrice = basePrice + sizePrice + extrasPrice;
  const totalPrice = unitPrice * quantity;

  const handleAddClick = () => {
    // Seçilen ekstraların detaylarını bulalım
    const detailedExtras = selectedExtras.map(extraId => extras.find(e => e.id === extraId)).filter(Boolean);

    const cartItem = {
      cartId: `${product.id}-${selectedSize?.id}-${selectedExtras.sort().join('-')}`,
      id: product.id,
      name: product.name,
      price: unitPrice,
      quantity: quantity,
      size: selectedSize,
      extras: detailedExtras,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Başlık ve Görsel */}
        <div className="relative p-6 border-b">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors"
          >
            ✕
          </button>
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
          <p className="text-sm text-gray-500 mt-1">{product.description}</p>
        </div>

        {/* Seçenekler Alanı */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Boyut Seçimi (Radio) */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Porsiyon / Boyut Seçiniz</h3>
            <div className="space-y-2">
              {sizes.map((size) => (
                <label 
                  key={size.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedSize?.id === size.id ? 'border-green-600 bg-green-50/50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input 
                      type="radio" 
                      name="size" 
                      checked={selectedSize?.id === size.id}
                      onChange={() => setSelectedSize(size)}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-800 font-medium">{size.name}</span>
                  </div>
                  <span className="text-gray-600 text-sm">+{size.price.toFixed(2)} €</span>
                </label>
              ))}
            </div>
          </div>

          {/* Ekstralar (Checkbox) */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Ekstralar ve Soslar</h3>
            <div className="space-y-2">
              {extras.map((extra) => (
                <label 
                  key={extra.id} 
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      checked={selectedExtras.includes(extra.id)}
                      onChange={() => handleExtraToggle(extra.id)}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-800 font-medium">{extra.name}</span>
                  </div>
                  <span className="text-gray-600 text-sm">+{extra.price.toFixed(2)} €</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Alt Sepete Ekleme Barı */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 bg-white border rounded-lg font-bold text-gray-700 hover:bg-gray-100"
            >
              -
            </button>
            <span className="font-semibold text-lg">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 bg-white border rounded-lg font-bold text-gray-700 hover:bg-gray-100"
            >
              +
            </button>
          </div>

          <button 
            onClick={handleAddClick}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all flex-1 ml-4 flex justify-between items-center"
          >
            <span>Sepete Ekle</span>
            <span>{totalPrice.toFixed(2)} €</span>
          </button>
        </div>

      </div>
    </div>
  );
}