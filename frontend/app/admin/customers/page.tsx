'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, Package } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/api';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const loadCustomers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);

    apiRequest(`/admin/customers?${params.toString()}`)
      .then((data) => setCustomers(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSelectCustomer = async (id: string) => {
    try {
      const data = await apiRequest(`/admin/customers/${id}`);
      setSelectedCustomer(data);
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
              Customer Registry
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
              Registered customer profiles, order history, and contact verification
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-400">
            Loading customer accounts...
          </div>
        ) : customers.length > 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-400 uppercase font-semibold">
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4 text-center">Lifetime Orders</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 font-bold text-neutral-900">{c.full_name}</td>
                      <td className="py-3 px-4 font-mono text-neutral-600">{c.email}</td>
                      <td className="py-3 px-4">{c.phone || '—'}</td>
                      <td className="py-3 px-4 text-center font-bold">{c.total_orders}</td>
                      <td className="py-3 px-4 text-neutral-500">
                        {new Date(c.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSelectCustomer(c.id)}
                          className="font-bold uppercase text-black underline"
                        >
                          Details
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
            No customers registered yet.
          </div>
        )}

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Customer Profile: {selectedCustomer.full_name}
                </h3>
                <button onClick={() => setSelectedCustomer(null)} className="text-neutral-400 hover:text-black">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded">
                <div>
                  <span className="text-neutral-400 uppercase font-semibold">Email:</span>
                  <p className="font-mono font-bold mt-0.5">{selectedCustomer.email}</p>
                </div>
                <div>
                  <span className="text-neutral-400 uppercase font-semibold">Phone:</span>
                  <p className="font-bold mt-0.5">{selectedCustomer.phone || 'None'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold uppercase tracking-wider text-neutral-900 mb-2">Order History</h4>
                {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                  <div className="divide-y divide-neutral-100 border border-neutral-200 rounded">
                    {selectedCustomer.orders.map((o: any) => (
                      <div key={o.id} className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-mono font-bold text-neutral-900">{o.order_number}</p>
                          <span className="text-[10px] text-neutral-400">
                            {new Date(o.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">₹{Number(o.total_amount).toFixed(2)}</p>
                          <span className="text-[10px] uppercase font-bold text-neutral-600">{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-400 italic">No orders placed by this customer yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
