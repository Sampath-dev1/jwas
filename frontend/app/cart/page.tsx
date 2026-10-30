'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowRight, ShoppingBag, ShieldCheck, Gift, CheckCircle2 } from 'lucide-react';
import { apiRequest, resolveImageUrl } from '@/lib/api';
import { Cart } from '@/types';
import ScrollReveal from '@/components/ScrollReveal';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [selectedGiftVariantId, setSelectedGiftVariantId] = useState<string>('');
  const [preview, setPreview] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const fetchCart = () => {
    setLoading(true);
    apiRequest<Cart>('/cart')
      .then((data) => {
        setCart(data);
        if (data && data.items.length > 0) {
          const savedCoupon = sessionStorage.getItem('jwas_applied_coupon') || '';
          if (savedCoupon && !couponCode) setCouponCode(savedCoupon);
          fetchPreview(data, savedCoupon || couponCode, selectedGiftVariantId);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const fetchPreview = (cartData: Cart, coupon: string, giftVarId?: string) => {
    apiRequest('/checkout/preview', {
      method: 'POST',
      body: JSON.stringify({ 
        coupon_code: coupon ? coupon.trim().toUpperCase() : null,
        free_gift_variant_id: giftVarId || null
      }),
    })
      .then((res: any) => {
        setPreview(res);
        if (res.coupon_valid) {
          setCouponError(null);
          if (coupon) sessionStorage.setItem('jwas_applied_coupon', coupon.trim().toUpperCase());
        } else if (coupon && res.coupon_message) {
          setCouponError(res.coupon_message);
          sessionStorage.removeItem('jwas_applied_coupon');
        } else {
          setCouponError(null);
        }
      })
      .catch((err) => {
        if (coupon) setCouponError(err.message || 'Invalid coupon');
      });
  };

  useEffect(() => {
    const savedGift = sessionStorage.getItem('jwas_free_gift_variant') || '';
    if (savedGift) setSelectedGiftVariantId(savedGift);
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
      fetchPreview(updated, couponCode, selectedGiftVariantId);
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
        fetchPreview(updated, couponCode, selectedGiftVariantId);
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
    if (cart) fetchPreview(cart, couponCode.trim(), selectedGiftVariantId);
  };

  const handleSelectGift = (variantId: string) => {
    setSelectedGiftVariantId(variantId);
    sessionStorage.setItem('jwas_free_gift_variant', variantId);
    if (cart) fetchPreview(cart, couponCode, variantId);
  };

  const handleProceedToCheckout = () => {
    if (couponCode.trim() && preview?.coupon_valid) {
      sessionStorage.setItem('jwas_applied_coupon', couponCode.trim().toUpperCase());
    }
    if (selectedGiftVariantId) {
      sessionStorage.setItem('jwas_free_gift_variant', selectedGiftVariantId);
    }
    router.push('/checkout');
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
        <ScrollReveal direction="fade" delay={100}>
          <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-4 stroke-1" />
          <h1 className="text-2xl font-bold uppercase tracking-tight text-neutral-900">
            Your shopping bag is empty.
          </h1>
          <p className="text-xs text-neutral-500 mt-2 max-w-sm mx-auto">
            Explore our collection of hand-crafted silk sarees and luxury essentials.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex items-center gap-2 bg-black text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition"
          >
            Explore Catalogue <ArrowRight className="w-4 h-4" />
          </Link>
        </ScrollReveal>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <ScrollReveal direction="down" delay={50}>
        <h1 className="text-3xl font-bold uppercase tracking-tight text-neutral-900 mb-8">
          Shopping Bag ({cart.item_count})
        </h1>
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-6">
          {cart.items.map((item, idx) => (
            <ScrollReveal key={item.id} direction="up" delay={idx * 60}>
              <div className="flex gap-4 sm:gap-6 border-b border-neutral-100 pb-6">
                {/* Thumbnail */}
                <div className="w-24 h-32 flex-shrink-0 bg-neutral-100 rounded-sm overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={resolveImageUrl(item.image_url)}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                    />
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
                        {item.variant_sku && (
                          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                            SKU: {item.variant_sku}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-bold text-neutral-900">
                        ₹{Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    {/* Quantity modifier */}
                    <div className="flex items-center border border-neutral-200 rounded">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className="px-2.5 py-1 text-xs font-bold hover:bg-neutral-100"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 text-xs font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className="px-2.5 py-1 text-xs font-bold hover:bg-neutral-100"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-neutral-400 hover:text-red-600 transition"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-4">
          <ScrollReveal direction="left" delay={150}>
            <div className="bg-neutral-50 border border-neutral-200/80 rounded-lg p-6 space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3">
                Order Summary
              </h2>

              {/* Coupon Form */}
              <form onSubmit={applyCoupon} className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 block">
                  Promo / Gift Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 text-xs border border-neutral-300 rounded px-3 py-2 bg-white uppercase font-mono tracking-wider focus:outline-none focus:border-black"
                  />
                  <button
                    type="submit"
                    className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition rounded"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-[11px] text-red-600 font-medium">{couponError}</p>}
                {preview?.coupon_valid && (
                  <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                    {preview.coupon_message || 'Coupon applied successfully!'}
                  </p>
                )}
              </form>

              {/* Free Gift Promotion Picker */}
              {preview?.is_free_gift && (
                <div className="p-3.5 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-purple-950 uppercase tracking-wide">
                    <Gift className="w-4 h-4 text-purple-700" />
                    <span>Free Gift Unlocked!</span>
                  </div>
                  <p className="text-[11px] text-purple-900 leading-relaxed">
                    Select any 1 free item from <strong>{preview.free_category_name || 'Free Gifts'}</strong>:
                  </p>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {preview.free_gift_options?.map((prod: any) =>
                      prod.variants.map((v: any) => {
                        const isChosen = selectedGiftVariantId === v.id;
                        return (
                          <div
                            key={v.id}
                            onClick={() => handleSelectGift(v.id)}
                            className={`p-2 rounded-md border flex items-center justify-between cursor-pointer transition ${
                              isChosen
                                ? 'bg-purple-100/80 border-purple-600 text-purple-950 shadow-2xs font-semibold'
                                : 'bg-white border-purple-100 hover:border-purple-300 text-neutral-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {prod.image_url ? (
                                <img
                                  src={resolveImageUrl(prod.image_url)}
                                  alt={prod.product_name}
                                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-purple-200 flex items-center justify-center text-[9px] font-bold text-purple-800">
                                  GIFT
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-[11px]">{prod.product_name}</p>
                                <p className="text-[10px] text-neutral-500">
                                  {v.title || Object.values(v.attributes || {}).join(', ')} · <span className="line-through">₹{v.price}</span>
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                                isChosen ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {isChosen ? 'Selected' : 'Choose'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Calculations */}
              <div className="space-y-3 text-xs border-t border-neutral-200 pt-4">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-neutral-900">
                    ₹{Number(preview?.subtotal || cart.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {(Number(preview?.discount) > 0 || Number(preview?.discount_amount) > 0) && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount</span>
                    <span>-₹{Number(preview.discount || preview.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {preview?.selected_free_gift && (
                  <div className="flex justify-between text-purple-700 font-semibold">
                    <span className="flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" /> Free Gift: {preview.selected_free_gift.product_name}
                    </span>
                    <span className="uppercase text-[11px] bg-purple-100 px-1.5 py-0.5 rounded">₹0.00 FREE</span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-600">
                  <span>Estimated Shipping</span>
                  <span>{Number(preview?.shipping || preview?.shipping_amount) > 0 ? `₹${preview.shipping || preview.shipping_amount}` : 'Calculated at checkout'}</span>
                </div>

                <div className="flex justify-between text-sm font-bold text-neutral-900 border-t border-neutral-200 pt-3">
                  <span>Total</span>
                  <span>
                    ₹{Number(preview?.total || preview?.final_total || cart.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="w-full bg-black text-white py-3.5 px-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition rounded flex items-center justify-center gap-2 shadow"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
                <ShieldCheck className="w-4 h-4 text-neutral-600" />
                <span>Encrypted 256-bit Secure Checkout</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
