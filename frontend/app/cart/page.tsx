'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { Cart } from '@/types';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const fetchCart = () => {
    setLoading(true);
    apiRequest<Cart>('/cart')
      .then((data) => {
        setCart(data);
        if (data && data.items.length > 0) {
          fetchPreview(data, couponCode);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const fetchPreview = (cartData: Cart, coupon: string) => {
    // Only logged in or if items exist
    apiRequest('/checkout/preview', {
      method: 'POST',
      body: JSON.stringify({ coupon_code: coupon || null }),
    })
      .then((res) => {
        setPreview(res);
        setCouponError(null);
      })
      .catch((err) => {
        if (coupon) setCouponError(err.message || 'Invalid coupon');
      });
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    try {
      const updated = await apiRequest<Cart>(`/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: newQty }),
      });
      setCart(updated);
      fetchPreview(updated, couponCode);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const updated = await apiRequest<Cart>(`/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      setCart(updated);
      if (updated.items.length > 0) {
        fetchPreview(updated, couponCode);
      } else {
        setPreview(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    if (cart) fetchPreview(cart, couponCode.trim());
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs uppercase tracking-widest text-neutral-400">
        Loading shopping bag...
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-4 stroke-1" />
        <h1 className="text-2xl font-bold uppercase tracking-tight text-neutral-900">
          Your shopping bag is empty.
        </h1>
        <p className="text-xs text-neutral-500 mt-2 max-w-sm mx-auto">
          Explore our collection of tailored suits, outerwear, and luxury essentials.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex items-center gap-2 bg-black text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition"
        >
          Explore Catalogue <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold uppercase tracking-tight text-neutral-900 mb-8">
        Shopping Bag ({cart.item_count})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-6">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 sm:gap-6 border-b border-neutral-100 pb-6"
            >
              {/* Thumbnail */}
              <div className="w-24 h-32 flex-shrink-0 bg-neutral-100 rounded-sm overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400 uppercase">
                    JWAS
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-semibold uppercase text-neutral-900">
                        <Link href={`/products/${item.product_slug}`}>{item.product_name}</Link>
                      </h3>
                      <p className="text-xs text-neutral-400 font-mono mt-0.5">SKU: {item.variant_sku}</p>
                      {Object.keys(item.variant_attributes).length > 0 && (
                        <p className="text-xs text-neutral-500 mt-1 uppercase">
                          {Object.entries(item.variant_attributes)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' | ')}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">
                      ₹{Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  {/* Quantity */}
                  <div className="flex items-center border border-neutral-200 rounded">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      className="px-2.5 py-1 text-xs hover:bg-neutral-100"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.available_stock}
                      className="px-2.5 py-1 text-xs hover:bg-neutral-100 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-neutral-400 hover:text-red-600 transition p-1"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary & Checkout Card */}
        <div className="lg:col-span-4 bg-neutral-50 p-6 rounded-lg space-y-6 h-fit">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3">
            Summary
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span className="font-semibold text-neutral-900">
                ₹{Number(preview?.subtotal || cart.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {preview?.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount Applied</span>
                <span>-₹{Number(preview.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-neutral-600">
              <span>Estimated Shipping</span>
              <span>
                {preview?.shipping !== undefined
                  ? preview.shipping === 0
                    ? 'Free'
                    : `₹${Number(preview.shipping).toFixed(2)}`
                  : 'Calculated at checkout'}
              </span>
            </div>

            <div className="flex justify-between text-neutral-600">
              <span>Estimated Taxes (GST)</span>
              <span>
                {preview?.tax !== undefined
                  ? `₹${Number(preview.tax).toFixed(2)}`
                  : 'Calculated at checkout'}
              </span>
            </div>

            <div className="border-t border-neutral-200 pt-3 flex justify-between text-sm font-bold text-neutral-900">
              <span>Estimated Total</span>
              <span>
                ₹{Number(preview?.total || cart.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Coupon Code Input */}
          <form onSubmit={applyCoupon} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="PROMO / COUPON"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 bg-white border border-neutral-300 rounded px-3 py-2 text-xs uppercase focus:outline-none focus:border-black font-mono"
              />
              <button
                type="submit"
                className="bg-black text-white active:text-white px-5 py-2 text-xs font-bold uppercase hover:bg-neutral-800 active:bg-neutral-950 transition rounded"
              >
                Apply
              </button>
            </div>
            {couponError && <p className="text-[11px] text-red-600 font-semibold">{couponError}</p>}
          </form>

          {/* Checkout CTA */}
          <Link
            href="/checkout"
            className="w-full bg-black text-white active:text-white py-3.5 px-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 active:bg-neutral-950 transition flex items-center justify-center gap-2 rounded shadow"
          >
            Proceed to Checkout <ArrowRight className="w-4 h-4 text-white" />
          </Link>
        </div>
      </div>
    </div>
  );
}
