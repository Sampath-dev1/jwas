'use client';

import React, { useEffect, useState } from 'react';
import { Package, Truck, Check, XCircle, Search, RefreshCw, DollarSign } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/api';
import { Order } from '@/types';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadOrders = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);

    apiRequest<Order[]>(`/admin/orders?${params.toString()}`)
      .then((data) => setOrders(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      await apiRequest(`/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus || undefined,
          tracking_number: trackingNumber || undefined,
          courier_name: courierName || undefined,
        }),
      });
      setShowStatusModal(false);
      loadOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      await apiRequest('/admin/orders/refunds', {
        method: 'POST',
        body: JSON.stringify({
          order_id: selectedOrder.id,
          amount: parseFloat(refundAmount),
          reason: refundReason,
        }),
      });
      setShowRefundModal(false);
      setRefundAmount('');
      setRefundReason('');
      loadOrders();
      alert('Refund processed successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-neutral-900">
              Orders & Fulfillment Control
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
              State-machine workflow validation, shipment tracking, and refund processing
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold border border-neutral-300 rounded px-3 py-2 bg-white text-neutral-800"
            >
              <option value="">All Statuses</option>
              <option value="Pending Payment">Pending Payment</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Processing">Processing</option>
              <option value="Packed">Packed</option>
              <option value="Shipped">Shipped</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-400">
            Loading orders...
          </div>
        ) : orders.length > 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-700 uppercase font-bold text-[11px] tracking-wider">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer Delivery</th>
                    <th className="py-3 px-4">Order Status</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4 text-right">Fulfillment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">{o.order_number}</td>
                      <td className="py-3 px-4 text-neutral-500">
                        {new Date(o.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-neutral-900">{o.shipping_address_snapshot?.full_name}</p>
                        <p className="text-[11px] text-neutral-600 font-medium">{o.shipping_address_snapshot?.city}, {o.shipping_address_snapshot?.state}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100">
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          o.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-neutral-900">
                        ₹{Number(o.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(o);
                            setNewStatus(o.status);
                            setTrackingNumber(o.tracking_number || '');
                            setCourierName(o.courier_name || '');
                            setShowStatusModal(true);
                          }}
                          className="px-2.5 py-1 text-xs font-bold uppercase rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 active:bg-neutral-300 transition"
                        >
                          Update
                        </button>
                        {o.payment_status === 'Paid' && o.status !== 'Refunded' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setRefundAmount(String(o.total_amount));
                              setShowRefundModal(true);
                            }}
                            className="px-2.5 py-1 text-xs font-bold uppercase rounded bg-red-100 hover:bg-red-200 text-red-800 active:bg-red-300 transition"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-dashed border-neutral-300 p-12 text-center text-xs text-neutral-600 font-medium">
            No orders match the selected filters.
          </div>
        )}

        {/* Update Status Modal */}
        {showStatusModal && selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 text-xs text-neutral-900 shadow-xl border border-neutral-200">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Update Fulfillment: {selectedOrder.order_number}
                </h3>
                <button onClick={() => setShowStatusModal(false)} className="text-neutral-500 hover:text-black font-bold">✕</button>
              </div>

              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase text-neutral-900 mb-1 tracking-wider text-[11px]">State Machine Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-semibold text-neutral-900 bg-white"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Processing">Processing</option>
                    <option value="Packed">Packed</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-neutral-900 mb-1 tracking-wider text-[11px]">Courier Carrier</label>
                  <input
                    type="text"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-semibold text-neutral-900 bg-white placeholder:text-neutral-500"
                    placeholder="e.g. BlueDart / Delhivery / DHL"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-neutral-900 mb-1 tracking-wider text-[11px]">Tracking Consignment Number</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-mono font-bold text-neutral-900 bg-white placeholder:text-neutral-500"
                    placeholder="e.g. BLD98712345"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(false)}
                    className="px-4 py-2 border border-neutral-300 rounded font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-black text-white active:text-white px-5 py-2 font-bold uppercase tracking-wider rounded hover:bg-neutral-800 active:bg-neutral-950 disabled:bg-neutral-400 transition"
                  >
                    {submitting ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {showRefundModal && selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 text-xs text-neutral-900 shadow-xl border border-neutral-200">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Initiate Refund: {selectedOrder.order_number}
                </h3>
                <button onClick={() => setShowRefundModal(false)} className="text-neutral-500 hover:text-black font-bold">✕</button>
              </div>

              <form onSubmit={handleProcessRefund} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase text-neutral-900 mb-1 tracking-wider text-[11px]">Refund Amount (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-bold text-neutral-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-neutral-900 mb-1 tracking-wider text-[11px]">Reason for Refund *</label>
                  <textarea
                    rows={2}
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-semibold text-neutral-900 bg-white placeholder:text-neutral-500"
                    placeholder="e.g. Customer return accepted, sizing issue..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowRefundModal(false)}
                    className="px-4 py-2 border border-neutral-300 rounded font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-red-600 text-white active:text-white px-5 py-2 font-bold uppercase tracking-wider rounded hover:bg-red-700 active:bg-red-800 disabled:bg-neutral-400 transition"
                  >
                    {submitting ? 'Processing...' : 'Authorize Refund'}
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
