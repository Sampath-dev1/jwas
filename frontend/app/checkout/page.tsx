'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ShieldCheck, CreditCard, Banknote, ArrowRight, Gift, Tag, X } from 'lucide-react';
import { apiRequest, getAuthToken, resolveImageUrl } from '@/lib/api';
import { Cart, Address, Order } from '@/types';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [newAddress, setNewAddress] = useState<Address>({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });
  const [useNewAddress, setUseNewAddress] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Coupon & Free Gift state
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponInput, setCouponInput] = useState<string>('');
  const [selectedGiftVariantId, setSelectedGiftVariantId] = useState<string>('');
  const [preview, setPreview] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState<boolean>(false);

  const fetchPreview = async (coupon?: string, giftVarId?: string) => {
    try {
      const codeToUse = coupon !== undefined ? coupon.trim().toUpperCase() : couponCode.trim().toUpperCase();
      const giftToUse = giftVarId !== undefined ? giftVarId : selectedGiftVariantId;
      const res: any = await apiRequest('/checkout/preview', {
        method: 'POST',
        body: JSON.stringify({
          coupon_code: codeToUse || null,
          free_gift_variant_id: giftToUse || null,
        }),
      });
      setPreview(res);
      if (codeToUse) {
        if (res.coupon_valid) {
          setCouponError(null);
          setCouponCode(codeToUse);
          sessionStorage.setItem('jwas_applied_coupon', codeToUse);
        } else {
          setCouponError(res.coupon_message || 'Coupon could not be applied.');
        }
      }
    } catch (err: any) {
      console.error('Preview error:', err);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/account/login?redirect=/checkout');
      return;
    }

    Promise.allSettled([
      apiRequest<Cart>('/cart'),
      apiRequest<Address[]>('/account/addresses'),
    ]).then(([cartRes, addrRes]) => {
      if (cartRes.status === 'fulfilled' && cartRes.value) {
        setCart(cartRes.value);
        if (cartRes.value.items.length === 0) {
          router.push('/cart');
          return;
        }

        const savedCoupon = sessionStorage.getItem('jwas_applied_coupon') || '';
        const savedGift = sessionStorage.getItem('jwas_free_gift_variant') || '';
        if (savedCoupon) {
          setCouponCode(savedCoupon);
          setCouponInput(savedCoupon);
        }
        if (savedGift) {
          setSelectedGiftVariantId(savedGift);
        }
        fetchPreview(savedCoupon, savedGift);
      }
      if (addrRes.status === 'fulfilled' && Array.isArray(addrRes.value) && addrRes.value.length > 0) {
        setAddresses(addrRes.value);
        setSelectedAddressId(addrRes.value[0].id || '');
        setUseNewAddress(false);
      }
      setLoading(false);
    });
  }, [router]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    setCouponError(null);
    await fetchPreview(couponInput.trim().toUpperCase(), selectedGiftVariantId);
    setApplyingCoupon(false);
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponInput('');
    setSelectedGiftVariantId('');
    setCouponError(null);
    sessionStorage.removeItem('jwas_applied_coupon');
    sessionStorage.removeItem('jwas_free_gift_variant');
    fetchPreview('', '');
  };

  const handleSelectFreeGift = (variantId: string) => {
    setSelectedGiftVariantId(variantId);
    sessionStorage.setItem('jwas_free_gift_variant', variantId);
    fetchPreview(couponCode, variantId);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const payload: any = {
        payment_method: paymentMethod,
        coupon_code: couponCode.trim() ? couponCode.trim().toUpperCase() : undefined,
        free_gift_variant_id: selectedGiftVariantId || undefined,
      };

      if (useNewAddress) {
        if (!newAddress.full_name || !newAddress.phone || !newAddress.address_line1 || !newAddress.city || !newAddress.postal_code) {
          throw new Error('Please fill in all mandatory address fields.');
        }
        payload.new_shipping_address = newAddress;
      } else {
        if (!selectedAddressId) {
          throw new Error('Please select a saved shipping address.');
        }
        payload.shipping_address_id = selectedAddressId;
      }

      // Process checkout on server
      const order = await apiRequest<Order>('/checkout/process', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Clear session coupon state on successful placement
      sessionStorage.removeItem('jwas_applied_coupon');
      sessionStorage.removeItem('jwas_free_gift_variant');

      if (paymentMethod === 'cod') {
        setCompletedOrder(order);
      } else {
        // Razorpay payment flow
        try {
          const initRes = await apiRequest(`/payments/initiate/${order.id}`, { method: 'POST' });
          if (initRes.payment_provider === 'razorpay') {
            // For live/test mode razorpay
            alert(`Razorpay Order created: ${initRes.razorpay_order_id}. In testing environment, simulating signature verification.`);
            // Verify
            await apiRequest('/payments/verify', {
              method: 'POST',
              body: JSON.stringify({
                order_id: order.id,
                razorpay_order_id: initRes.razorpay_order_id,
                razorpay_payment_id: 'pay_simulated_' + Math.random().toString(36).substring(2),
                razorpay_signature: 'simulated_sig',
              }),
            });
          }
          setCompletedOrder(order);
        } catch (paymentErr: any) {
          setCompletedOrder(order);
          setErrorMessage(`Order placed in Pending Payment status: ${paymentErr.message}`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Checkout failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs uppercase tracking-widest text-neutral-400">
        Verifying stock and authoritative pricing...
      </div>
    );
  }

  // Order Confirmation State
  if (completedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
        <h1 className="text-3xl font-bold uppercase tracking-tight text-neutral-900">
          Order Confirmed
        </h1>
        <p className="text-sm text-neutral-600 font-mono">
          Order Number: <strong className="text-neutral-900">{completedOrder.order_number}</strong>
        </p>
        <p className="text-xs text-neutral-500 max-w-md mx-auto">
          Thank you for choosing JWAS. Your order has been committed to the inventory ledger and is being prepared for fulfillment.
        </p>

        <div className="bg-neutral-50 border border-neutral-200 rounded p-6 text-left space-y-3 text-xs max-w-md mx-auto">
          <div className="flex justify-between">
            <span className="text-neutral-500">Status</span>
            <span className="font-semibold uppercase">{completedOrder.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Total Amount</span>
            <span className="font-bold">
              ₹{Number(completedOrder.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Delivery To</span>
            <span className="font-medium text-right">
              {completedOrder.shipping_address_snapshot?.full_name}, {completedOrder.shipping_address_snapshot?.city}
            </span>
          </div>
        </div>

        <div className="pt-4 flex justify-center gap-4">
          <Link
            href="/account"
            className="bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition rounded"
          >
            View in Account
          </Link>
          <Link
            href="/shop"
            className="border border-neutral-300 px-6 py-3 text-xs font-bold uppercase tracking-widest hover:border-black transition rounded"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold uppercase tracking-tight text-neutral-900 mb-8">
        Secure Checkout
      </h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Address & Payment */}
        <div className="lg:col-span-7 space-y-10">
          {/* Shipping Address */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-2">
              1. Delivery Address
            </h2>

            {addresses.length > 0 && (
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase">
                  <input
                    type="radio"
                    name="addressChoice"
                    checked={!useNewAddress}
                    onChange={() => setUseNewAddress(false)}
                  />
                  Use saved address
                </label>

                {!useNewAddress && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id || '')}
                        className={`p-4 border rounded cursor-pointer text-xs ${
                          selectedAddressId === addr.id ? 'border-black bg-neutral-50' : 'border-neutral-200'
                        }`}
                      >
                        <p className="font-bold">{addr.full_name}</p>
                        <p className="text-neutral-600 mt-1">{addr.address_line1}</p>
                        <p className="text-neutral-600">{addr.city}, {addr.state} - {addr.postal_code}</p>
                        <p className="text-neutral-500 font-mono mt-1">{addr.phone}</p>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs font-semibold uppercase mt-4">
                  <input
                    type="radio"
                    name="addressChoice"
                    checked={useNewAddress}
                    onChange={() => setUseNewAddress(true)}
                  />
                  Enter new delivery address
                </label>
              </div>
            )}

            {useNewAddress && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-neutral-700 font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.full_name}
                    onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-medium mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-neutral-700 font-medium mb-1">Street Address Line 1 *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.address_line1}
                    onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-neutral-700 font-medium mb-1">Apartment, Suite, Unit (Optional)</label>
                  <input
                    type="text"
                    value={newAddress.address_line2 || ''}
                    onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-medium mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-medium mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-medium mb-1">PIN / Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-medium mb-1">Country</label>
                  <input
                    type="text"
                    readOnly
                    value="India"
                    className="w-full bg-neutral-100 border border-neutral-300 rounded px-3 py-2 text-xs text-neutral-500 cursor-not-allowed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-2">
              2. Payment Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 border rounded cursor-pointer flex items-center gap-3 transition ${
                  paymentMethod === 'cod' ? 'border-black bg-neutral-50' : 'border-neutral-200'
                }`}
              >
                <Banknote className="w-5 h-5 text-neutral-800" />
                <div>
                  <p className="text-xs font-bold uppercase">Cash on Delivery</p>
                  <p className="text-[11px] text-neutral-500">Pay on parcel arrival</p>
                </div>
              </label>

              <label
                onClick={() => setPaymentMethod('razorpay')}
                className={`p-4 border rounded cursor-pointer flex items-center gap-3 transition ${
                  paymentMethod === 'razorpay' ? 'border-black bg-neutral-50' : 'border-neutral-200'
                }`}
              >
                <CreditCard className="w-5 h-5 text-neutral-800" />
                <div>
                  <p className="text-xs font-bold uppercase">Online / UPI / Cards</p>
                  <p className="text-[11px] text-neutral-500">Razorpay secure payment</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Review & Promotions */}
        <div className="lg:col-span-5 bg-neutral-50 border border-neutral-200/80 p-6 rounded-lg space-y-6 h-fit shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3 flex items-center justify-between">
            <span>Order Review</span>
            <span className="text-[11px] font-normal text-neutral-500 font-mono">
              {cart?.items.length} {cart?.items.length === 1 ? 'item' : 'items'}
            </span>
          </h2>

          {/* Cart Items List */}
          <div className="divide-y divide-neutral-200 max-h-72 overflow-y-auto pr-2">
            {cart?.items.map((item) => (
              <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold text-neutral-900">{item.product_name}</p>
                  <p className="text-[11px] text-neutral-500">
                    Qty: {item.quantity} · {Object.values(item.variant_attributes).join(', ')}
                  </p>
                </div>
                <span className="font-medium text-neutral-900">
                  ₹{Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}

            {/* Selected Free Gift Preview item */}
            {preview?.selected_free_gift && (
              <div className="py-3 flex justify-between items-center text-xs bg-purple-50/80 -mx-2 px-2 rounded-md border border-purple-200/60 my-1">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-700 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-purple-950">{preview.selected_free_gift.product_name}</p>
                    <p className="text-[10px] text-purple-800">
                      Free Promotional Gift · {preview.selected_free_gift.variant_title || '1 Unit'}
                    </p>
                  </div>
                </div>
                <span className="font-black text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                  ₹0.00 FREE
                </span>
              </div>
            )}
          </div>

          {/* Coupon Code Entry & Promotion Box */}
          <div className="border-t border-neutral-200 pt-4 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-800 block flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-neutral-600" />
              <span>Apply Coupon / Gift Code</span>
            </label>

            {couponCode && preview?.coupon_valid ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-mono font-bold text-emerald-950 uppercase">{couponCode}</p>
                    <p className="text-[11px] text-emerald-700">
                      {preview.coupon_message || 'Coupon discount active!'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="p-1 text-neutral-400 hover:text-red-600 transition"
                  title="Remove coupon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="e.g. FREEGIFT or VIP10"
                  className="flex-1 text-xs border border-neutral-300 rounded px-3 py-2 bg-white uppercase font-mono tracking-wider focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={applyingCoupon || !couponInput.trim()}
                  className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:bg-neutral-400 transition rounded"
                >
                  {applyingCoupon ? 'Checking...' : 'Apply'}
                </button>
              </div>
            )}

            {couponError && (
              <p className="text-[11px] text-red-600 font-medium">
                {couponError}
              </p>
            )}
          </div>

          {/* Free Gift Selector (When Promotion grants a Free Item) */}
          {preview?.is_free_gift && (
            <div className="p-3.5 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg text-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-purple-950 uppercase tracking-wide">
                <Gift className="w-4 h-4 text-purple-700" />
                <span>Select Your Free Gift</span>
              </div>
              <p className="text-[11px] text-purple-900 leading-relaxed">
                Choose any item from <strong>{preview.free_category_name || 'Free Gift Category'}</strong> to receive it 100% free with your order:
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {preview.free_gift_options?.map((prod: any) =>
                  prod.variants.map((v: any) => {
                    const isChosen = selectedGiftVariantId === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleSelectFreeGift(v.id)}
                        className={`p-2 rounded-md border flex items-center justify-between cursor-pointer transition ${
                          isChosen
                            ? 'bg-purple-100/90 border-purple-600 text-purple-950 shadow-2xs font-semibold'
                            : 'bg-white border-purple-100 hover:border-purple-300 text-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
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
                            <p className="truncate text-[11px] font-medium">{prod.product_name}</p>
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
                          {isChosen ? 'Selected' : 'Pick'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Pricing Summary */}
          <div className="border-t border-neutral-200 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span className="font-semibold text-neutral-900">
                ₹{Number(preview?.subtotal || cart?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {(Number(preview?.discount) > 0 || Number(preview?.discount_amount) > 0) && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Coupon Discount ({couponCode})</span>
                <span>-₹{Number(preview.discount || preview.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {preview?.selected_free_gift && (
              <div className="flex justify-between text-purple-800 font-semibold">
                <span className="flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-purple-700" /> Free Gift Item
                </span>
                <span className="uppercase text-[11px] bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-bold">
                  ₹0.00 (FREE)
                </span>
              </div>
            )}

            <div className="flex justify-between text-neutral-600">
              <span>Shipping</span>
              <span>
                {Number(preview?.shipping || preview?.shipping_amount) > 0
                  ? `₹${Number(preview.shipping || preview.shipping_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                  : 'FREE'}
              </span>
            </div>

            {Number(preview?.tax) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Estimated Taxes</span>
                <span>₹{Number(preview.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold text-neutral-900 border-t border-neutral-200 pt-3">
              <span>Total Payable</span>
              <span>
                ₹{Number(preview?.total || preview?.final_total || cart?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-200 text-xs rounded">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white active:text-white py-3.5 px-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 active:bg-neutral-950 disabled:bg-neutral-400 transition flex items-center justify-center gap-2 rounded shadow"
          >
            {submitting ? 'Committing Order...' : 'Confirm & Place Order'} <ArrowRight className="w-4 h-4 text-white" />
          </button>

          <p className="text-[10px] text-neutral-400 text-center flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Authoritative server-side stock and pricing validation
          </p>
        </div>
      </form>
    </div>
  );
}
