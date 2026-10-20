'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, MapPin, LogOut, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { apiRequest, getAuthToken, clearAuthToken, getStoredUser } from '@/lib/api';
import { Order, Address } from '@/types';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses'>('orders');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/account/login');
      return;
    }

    const stored = getStoredUser();
    setUser(stored);

    Promise.allSettled([
      apiRequest<Order[]>('/account/orders'),
      apiRequest<Address[]>('/account/addresses'),
    ]).then(([orderRes, addrRes]) => {
      if (orderRes.status === 'fulfilled' && Array.isArray(orderRes.value)) {
        setOrders(orderRes.value);
      }
      if (addrRes.status === 'fulfilled' && Array.isArray(addrRes.value)) {
        setAddresses(addrRes.value);
      }
      setLoading(false);
    });
  }, [router]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await apiRequest(`/account/orders/${orderId}/cancel`, { method: 'POST' });
      // Refresh
      const updated = await apiRequest<Order[]>('/account/orders');
      setOrders(updated);
      alert('Order cancelled successfully.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    router.push('/account/login');
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs uppercase tracking-widest text-neutral-400">
        Loading private account records...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Account Header */}
      <div className="border-b border-neutral-200 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Private Portal</span>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-neutral-900 mt-1">
            Welcome, {user?.full_name || 'Customer'}
          </h1>
          <p className="text-xs text-neutral-500 font-mono mt-0.5">{user?.email}</p>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-600 hover:text-red-800 transition"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-neutral-200 my-8">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'orders' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-neutral-700'
          }`}
        >
          Orders History ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'addresses' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-neutral-700'
          }`}
        >
          Saved Addresses ({addresses.length})
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {orders.length > 0 ? (
            orders.map((o) => (
              <div key={o.id} className="border border-neutral-200 rounded-lg p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-4 text-xs">
                  <div>
                    <span className="text-neutral-400 uppercase font-semibold">Order: </span>
                    <strong className="text-neutral-900 font-mono">{o.order_number}</strong>
                    <span className="text-neutral-400 ml-4">
                      {new Date(o.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      o.status === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : o.status === 'Cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-neutral-100 text-neutral-800'
                    }`}>
                      {o.status}
                    </span>

                    {['Pending Payment', 'Confirmed'].includes(o.status) && (
                      <button
                        onClick={() => handleCancelOrder(o.id)}
                        className="text-red-600 hover:underline text-xs font-semibold"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-neutral-100">
                  {o.items.map((it) => (
                    <div key={it.id} className="py-2.5 flex justify-between text-xs">
                      <div>
                        <p className="font-semibold text-neutral-900">{it.product_name_snapshot}</p>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          SKU: {it.sku_snapshot} · Qty: {it.quantity}
                        </p>
                      </div>
                      <span className="font-semibold text-neutral-900">
                        ₹{Number(it.total_item_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total & Tracking */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-t border-neutral-100 pt-3 text-xs">
                  <div className="text-neutral-500">
                    {o.tracking_number ? (
                      <p>
                        Courier: <strong>{o.courier_name || 'Express Courier'}</strong> · Tracking: <strong className="font-mono">{o.tracking_number}</strong>
                      </p>
                    ) : (
                      <p>Fulfillment in preparation.</p>
                    )}
                  </div>
                  <div className="font-bold text-sm text-neutral-900 mt-2 sm:mt-0">
                    Total: ₹{Number(o.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center border border-dashed border-neutral-200 rounded-lg p-12">
              <Package className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-800">You have not placed any orders yet.</p>
              <p className="text-xs text-neutral-400 mt-1">Explore our collections and place your first order.</p>
              <Link
                href="/shop"
                className="mt-6 inline-flex items-center gap-1.5 bg-black text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition rounded"
              >
                Shop Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Addresses Tab */}
      {activeTab === 'addresses' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {addresses.map((a) => (
            <div key={a.id} className="border border-neutral-200 rounded-lg p-5 text-xs space-y-2">
              <div className="flex justify-between items-baseline font-bold uppercase">
                <span>{a.full_name}</span>
                {a.is_default && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Default</span>}
              </div>
              <p className="text-neutral-600">{a.address_line1}</p>
              {a.address_line2 && <p className="text-neutral-600">{a.address_line2}</p>}
              <p className="text-neutral-600">{a.city}, {a.state} - {a.postal_code}</p>
              <p className="text-neutral-500 font-mono pt-1">Phone: {a.phone}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
