'use client';

import React, { useEffect, useState } from 'react';
import { Boxes, AlertCircle, History } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/api';

export default function AdminInventoryPage() {
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('RESTOCK_SUPPLY');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [movementHistory, setMovementHistory] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadInventory = () => {
    setLoading(true);
    apiRequest(`/admin/inventory?low_stock_only=${lowStockFilter}`)
      .then((data) => setInventoryList(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInventory();
  }, [lowStockFilter]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    setSubmitting(true);
    try {
      await apiRequest('/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          variant_id: selectedVariant.variant_id,
          quantity_change: parseInt(adjustQty, 10),
          reason: adjustReason,
        }),
      });
      setShowAdjustModal(false);
      setAdjustQty('');
      loadInventory();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = async (variant: any) => {
    setSelectedVariant(variant);
    try {
      const history = await apiRequest(`/admin/inventory/movements/${variant.variant_id}`);
      setMovementHistory(history || []);
      setShowHistoryModal(true);
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
              Inventory & Warehouse Telemetry
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
              Authoritative variant stock levels with atomic reservation tracking and movement audit trails
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold uppercase cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => setLowStockFilter(e.target.checked)}
            />
            Show Low Stock Alerts Only
          </label>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-400">
            Querying warehouse state...
          </div>
        ) : inventoryList.length > 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-400 uppercase font-semibold">
                    <th className="py-3 px-4">Variant SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-center">Physical Stock</th>
                    <th className="py-3 px-4 text-center">Reserved</th>
                    <th className="py-3 px-4 text-center">Available Stock</th>
                    <th className="py-3 px-4 text-center">Threshold</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {inventoryList.map((inv) => {
                    const isLow = inv.current_stock <= inv.low_stock_threshold;
                    return (
                      <tr key={inv.id} className="hover:bg-neutral-50">
                        <td className="py-3 px-4 font-mono font-bold text-neutral-900">{inv.sku}</td>
                        <td className="py-3 px-4 font-medium">{inv.product_name}</td>
                        <td className="py-3 px-4 text-center font-bold">{inv.current_stock}</td>
                        <td className="py-3 px-4 text-center text-neutral-500">{inv.reserved_stock}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inv.available_stock <= 0
                              ? 'bg-red-100 text-red-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {inv.available_stock} Available
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-neutral-400">{inv.low_stock_threshold}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedVariant(inv);
                              setShowAdjustModal(true);
                            }}
                            className="px-2.5 py-1 text-xs font-bold uppercase rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 active:bg-neutral-300 transition"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => openHistory(inv)}
                            className="px-2.5 py-1 text-xs font-bold uppercase rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 active:bg-neutral-300 transition"
                          >
                            Audit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-dashed border-neutral-200 p-12 text-center text-xs text-neutral-400">
            {lowStockFilter
              ? 'No low stock warnings recorded at this time.'
              : 'No inventory records exist. Add products to populate warehouse inventory.'}
          </div>
        )}

        {/* Adjust Stock Modal */}
        {showAdjustModal && selectedVariant && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 text-xs text-neutral-900 shadow-xl border border-neutral-200">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Adjust Inventory ({selectedVariant.sku})
                </h3>
                <button onClick={() => setShowAdjustModal(false)} className="text-neutral-500 hover:text-black font-bold">✕</button>
              </div>

              <form onSubmit={handleAdjustStock} className="space-y-4">
                <p className="text-neutral-800 font-medium">
                  Current Stock: <strong className="font-bold text-neutral-900">{selectedVariant.current_stock}</strong>
                </p>

                <div>
                  <label className="block font-bold uppercase text-neutral-900 mb-1 tracking-wider text-[11px]">
                    Quantity Change (+ or -) *
                  </label>
                  <input
                    type="number"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-mono font-bold text-neutral-900 bg-white"
                    placeholder="e.g. 10 to add, -2 to subtract"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-neutral-900 mb-1 tracking-wider text-[11px]">Reason for Adjustment *</label>
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-semibold text-neutral-900 bg-white"
                  >
                    <option value="RESTOCK_SUPPLY">RESTOCK_SUPPLY - Inward shipment received</option>
                    <option value="AUDIT_CORRECTION">AUDIT_CORRECTION - Physical stock reconciliation</option>
                    <option value="DAMAGED_WRITE_OFF">DAMAGED_WRITE_OFF - Defective piece discard</option>
                    <option value="SAMPLE_WITHDRAWAL">SAMPLE_WITHDRAWAL - Studio sample</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="px-4 py-2 border border-neutral-300 rounded font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-black text-white active:text-white px-5 py-2 font-bold uppercase tracking-wider rounded hover:bg-neutral-800 active:bg-neutral-950 disabled:bg-neutral-400 transition"
                  >
                    {submitting ? 'Updating...' : 'Commit Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && selectedVariant && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Movement History: {selectedVariant.sku}
                </h3>
                <button onClick={() => setShowHistoryModal(false)} className="text-neutral-400 hover:text-black">✕</button>
              </div>

              {movementHistory.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {movementHistory.map((m) => (
                    <div key={m.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-neutral-900">{m.reason}</span>
                        <p className="text-[11px] text-neutral-400">
                          {new Date(m.created_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold ${m.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                        </span>
                        <p className="text-[10px] text-neutral-500">
                          {m.previous_quantity} → {m.new_quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-neutral-400 py-6">No previous movements recorded.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
