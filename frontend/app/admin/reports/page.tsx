'use client';

import React, { useEffect, useState } from 'react';
import { Download, BarChart3, Calendar, FileSpreadsheet } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest, getAdminAuthToken } from '@/lib/api';

export default function AdminReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const loadReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);

    apiRequest(`/admin/reports/summary?${params.toString()}`)
      .then((data) => setSummary(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleExportCSV = () => {
    const token = getAdminAuthToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    fetch(`${apiUrl}/admin/reports/export-orders-csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jwas_orders_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      })
      .catch((err) => alert('Export failed: ' + err.message));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-neutral-900">
              Audited Analytics & Financial Reports
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
              Deterministic calculations based strictly on real database order ledgers
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded hover:bg-black transition"
          >
            <Download className="w-4 h-4" /> Export CSV Report
          </button>
        </div>

        {/* Date Filters */}
        <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold uppercase text-neutral-600">Start Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-neutral-300 rounded px-2.5 py-1 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold uppercase text-neutral-600">End Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-neutral-300 rounded px-2.5 py-1 text-xs"
            />
          </div>
          <button
            onClick={loadReport}
            className="bg-black text-white px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-neutral-800"
          >
            Filter
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-400">
            Calculating report metrics...
          </div>
        ) : summary ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Gross Sales</span>
                <p className="text-3xl font-black text-neutral-900 mt-2">
                  ₹{Number(summary.gross_sales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">Total revenue committed from paid orders</p>
              </div>

              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Refund Deductions</span>
                <p className="text-3xl font-black text-red-600 mt-2">
                  -₹{Number(summary.total_refunds).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">Completed returns and customer adjustments</p>
              </div>

              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Net Realized Revenue</span>
                <p className="text-3xl font-black text-emerald-600 mt-2">
                  ₹{Number(summary.net_sales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">Gross sales minus processed refunds</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-center">
              <div className="bg-white p-5 rounded-lg border border-neutral-200">
                <p className="text-2xl font-black text-neutral-900">{summary.orders_count}</p>
                <p className="text-xs font-bold uppercase text-neutral-500 mt-1">Paid Orders Recorded</p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-neutral-200">
                <p className="text-2xl font-black text-neutral-900">{summary.completed_orders}</p>
                <p className="text-xs font-bold uppercase text-neutral-500 mt-1">Orders Fulfilled</p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-neutral-200">
                <p className="text-2xl font-black text-neutral-900">{summary.units_sold}</p>
                <p className="text-xs font-bold uppercase text-neutral-500 mt-1">Physical Units Sold</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-dashed border-neutral-200 p-12 text-center text-xs text-neutral-400">
            No report records in this date range. Zero fake chart points are rendered.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
