'use client';

import React, { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, Gift } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/api';

export default function AdminPromotionsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [freeCategoryId, setFreeCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCoupons = () => {
    setLoading(true);
    apiRequest('/admin/promotions/coupons')
      .then((data) => setCoupons(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCoupons();
    apiRequest('/categories')
      .then((cats) => {
        if (Array.isArray(cats)) setCategories(cats);
      })
      .catch((err) => console.error('Error loading categories:', err));
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (discountType === 'FREE_GIFT' && !freeCategoryId) {
      alert('Please select a Free Gift Category from the dropdown.');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/admin/promotions/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: discountType === 'FREE_GIFT' ? 0 : parseFloat(discountValue) || 0,
          min_order_value: parseFloat(minOrderValue) || 0,
          max_discount: maxDiscount ? parseFloat(maxDiscount) : null,
          free_category_id: discountType === 'FREE_GIFT' ? freeCategoryId : null,
          is_active: true,
        }),
      });
      setShowModal(false);
      setCode('');
      setDiscountValue('');
      setFreeCategoryId('');
      setDiscountType('PERCENTAGE');
      loadCoupons();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await apiRequest(`/admin/promotions/coupons/${id}`, { method: 'DELETE' });
      loadCoupons();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-neutral-900">
              Promotions & Coupon Management
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
              Create discount rules, minimum spends, and promotional codes
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition"
          >
            <Plus className="w-4 h-4" /> Add Coupon
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-400">
            Loading promotions...
          </div>
        ) : coupons.length > 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-400 uppercase font-semibold">
                    <th className="py-3 px-4">Coupon Code</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Discount Value</th>
                    <th className="py-3 px-4">Min Spend</th>
                    <th className="py-3 px-4">Max Cap</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">{c.code}</td>
                      <td className="py-3 px-4 uppercase text-neutral-600">
                        {c.discount_type === 'FREE_GIFT' ? (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Gift className="w-3 h-3 text-purple-700" /> Free Gift
                          </span>
                        ) : (
                          c.discount_type
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        {c.discount_type === 'PERCENTAGE'
                          ? `${c.discount_value}%`
                          : c.discount_type === 'FREE_GIFT'
                          ? `1 Free Item from ${c.free_category_name || 'Category'}`
                          : `₹${c.discount_value}`}
                      </td>
                      <td className="py-3 px-4">₹{Number(c.min_order_value).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">{c.max_discount ? `₹${c.max_discount}` : 'No cap'}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDelete(c.id)} className="text-neutral-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-dashed border-neutral-200 p-12 text-center text-xs text-neutral-400">
            No active promotional coupons defined. Click &quot;Add Coupon&quot; to configure.
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Create Promotional Coupon</h3>
                <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-black">✕</button>
              </div>

              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div>
                  <label className="block font-semibold uppercase mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-mono"
                    placeholder="e.g. FREEGIFT or JWASVIP"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase mb-1">Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed Amount (₹)</option>
                      <option value="FREE_GIFT">🎁 Free Gift from Category</option>
                    </select>
                  </div>
                  {discountType !== 'FREE_GIFT' ? (
                    <div>
                      <label className="block font-semibold uppercase mb-1">Discount Value *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                        placeholder="15 or 500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-semibold uppercase mb-1">Customer Benefit</label>
                      <div className="border border-neutral-200 bg-neutral-50 rounded px-3 py-2 text-xs text-purple-900 font-bold">
                        100% Free Item
                      </div>
                    </div>
                  )}
                </div>

                {discountType === 'FREE_GIFT' && (
                  <div>
                    <label className="block font-semibold uppercase mb-1">Select Free Gift Category *</label>
                    <select
                      required
                      value={freeCategoryId}
                      onChange={(e) => setFreeCategoryId(e.target.value)}
                      className="w-full border border-purple-300 bg-purple-50/40 rounded px-3 py-2 text-xs focus:outline-none focus:border-purple-600 font-medium"
                    >
                      <option value="">-- Choose Category for Free Items --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Customers who apply this coupon get to select 1 free item from this category at checkout!
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase mb-1">Min Order Value (INR)</label>
                    <input
                      type="number"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(e.target.value)}
                      className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase mb-1">Max Cap (Optional)</label>
                    <input
                      type="number"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                      placeholder="2000"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-neutral-300 rounded font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-black text-white active:text-white px-5 py-2 font-bold uppercase tracking-wider rounded hover:bg-neutral-800 active:bg-neutral-950 disabled:bg-neutral-400 transition"
                  >
                    {submitting ? 'Creating...' : 'Save Coupon'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
