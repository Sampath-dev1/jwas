'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, ShoppingBag, Boxes, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/api';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/admin/dashboard')
      .then((data) => setMetrics(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-neutral-900">
            Executive Operations Dashboard
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Real-time business telemetry backed by persistent PostgreSQL database records
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-400">
            Querying production telemetry...
          </div>
        ) : (
          <>
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Gross Sales */}
              <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Gross Realized Sales
                </span>
                <p className="text-2xl font-black text-neutral-900 mt-2">
                  ₹{Number(metrics?.gross_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-neutral-600 mt-1">From verified paid orders only</p>
              </div>

              {/* Net Sales */}
              <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Net Revenue
                </span>
                <p className="text-2xl font-black text-neutral-900 mt-2">
                  ₹{Number(metrics?.net_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-neutral-600 mt-1">After deducting ₹{metrics?.refund_total || 0} refunds</p>
              </div>

              {/* Orders */}
              <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Total Orders Placed
                </span>
                <p className="text-2xl font-black text-neutral-900 mt-2">
                  {metrics?.total_orders || 0}
                </p>
                <p className="text-[10px] text-neutral-600 mt-1">{metrics?.awaiting_processing || 0} awaiting processing</p>
              </div>

              {/* Low Stock Alerts */}
              <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Inventory Alerts
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-2xl font-black text-neutral-900">{metrics?.low_stock_count || 0}</p>
                  <span className="text-xs text-amber-600 font-semibold">Low Stock</span>
                  <p className="text-2xl font-black text-neutral-900 ml-2">{metrics?.out_of_stock_count || 0}</p>
                  <span className="text-xs text-red-600 font-semibold">Out</span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">Real-time variant threshold monitoring</p>
              </div>
            </div>

            {/* Catalog Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-lg border border-neutral-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Products in Catalog</h3>
                <p className="text-3xl font-black text-neutral-900 mt-2">{metrics?.total_products || 0}</p>
                <p className="text-xs text-neutral-600 mt-1">
                  {metrics?.published_products || 0} Published · {metrics?.draft_products || 0} Draft
                </p>
                <Link href="/admin/products" className="inline-block mt-4 text-xs font-bold text-black uppercase underline">
                  Manage Products
                </Link>
              </div>

              <div className="bg-white p-5 rounded-lg border border-neutral-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Active Categories</h3>
                <p className="text-3xl font-black text-neutral-900 mt-2">{metrics?.total_categories || 0}</p>
                <p className="text-xs text-neutral-600 mt-1">Parent & Nested Subcategories</p>
                <Link href="/admin/categories" className="inline-block mt-4 text-xs font-bold text-black uppercase underline">
                  Manage Hierarchy
                </Link>
              </div>

              <div className="bg-white p-5 rounded-lg border border-neutral-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Customer Base</h3>
                <p className="text-3xl font-black text-neutral-900 mt-2">{metrics?.total_customers || 0}</p>
                <p className="text-xs text-neutral-600 mt-1">Registered Customer Accounts</p>
                <Link href="/admin/customers" className="inline-block mt-4 text-xs font-bold text-black uppercase underline">
                  View Customers
                </Link>
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Recent Orders
                </h2>
                <Link href="/admin/orders" className="text-xs font-bold uppercase text-black hover:underline flex items-center gap-1">
                  View All Orders <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {metrics?.recent_orders && metrics.recent_orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 text-neutral-700 uppercase font-bold text-[11px] tracking-wider">
                        <th className="py-2.5">Order Number</th>
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5">Payment</th>
                        <th className="py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {metrics.recent_orders.map((o: any) => (
                        <tr key={o.id} className="hover:bg-neutral-50">
                          <td className="py-3 font-mono font-bold text-neutral-900">
                            <Link href={`/admin/orders`}>{o.order_number}</Link>
                          </td>
                          <td className="py-3 text-neutral-500">
                            {new Date(o.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100">
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              o.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {o.payment_status}
                            </span>
                          </td>
                          <td className="py-3 text-right font-bold text-neutral-900">
                            ₹{Number(o.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded">
                  No orders recorded yet. Sales metrics will calculate dynamically as orders are received.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
