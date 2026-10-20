'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Plus, Save } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [taxRules, setTaxRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New shipping method state
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodRate, setNewMethodRate] = useState('');
  const [newMethodFreeAbove, setNewMethodFreeAbove] = useState('');

  // New tax rule state
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');

  const loadSettings = () => {
    setLoading(true);
    Promise.allSettled([
      apiRequest('/admin/settings/business'),
      apiRequest('/admin/settings/shipping'),
      apiRequest('/admin/settings/taxes'),
    ]).then(([bizRes, shipRes, taxRes]) => {
      if (bizRes.status === 'fulfilled') setSettings(bizRes.value || {});
      if (shipRes.status === 'fulfilled') setShippingMethods(shipRes.value || []);
      if (taxRes.status === 'fulfilled') setTaxRules(taxRes.value || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/admin/settings/business', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      alert('Business settings saved successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/settings/shipping', {
        method: 'POST',
        body: JSON.stringify({
          name: newMethodName,
          rate: parseFloat(newMethodRate),
          free_above: newMethodFreeAbove ? parseFloat(newMethodFreeAbove) : null,
          is_active: true,
        }),
      });
      setNewMethodName('');
      setNewMethodRate('');
      setNewMethodFreeAbove('');
      loadSettings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/settings/taxes', {
        method: 'POST',
        body: JSON.stringify({
          name: newTaxName,
          tax_percentage: parseFloat(newTaxRate),
          is_active: true,
        }),
      });
      setNewTaxName('');
      setNewTaxRate('');
      loadSettings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-neutral-900">
            System & Business Configuration
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Authoritative shipping rules, GST tax percentages, and store profile parameters
          </p>
        </div>

        {/* Business Settings Form */}
        <div className="bg-white p-6 rounded-lg border border-neutral-200 space-y-4 text-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-3">
            Brand Profile
          </h2>
          <form onSubmit={handleSaveBusiness} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold uppercase mb-1">Brand Name</label>
                <input
                  type="text"
                  value={settings.store_name || 'JWAS'}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase mb-1">Currency Code</label>
                <input
                  type="text"
                  readOnly
                  value="INR (₹)"
                  className="w-full bg-neutral-100 border border-neutral-300 rounded px-3 py-2 text-xs text-neutral-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase mb-1">Support Email</label>
                <input
                  type="email"
                  value={settings.support_email || ''}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                  placeholder="concierge@jwas.com"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase mb-1">Support Phone</label>
                <input
                  type="tel"
                  value={settings.support_phone || ''}
                  onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                  placeholder="+91 80 4000 0000"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-black text-white active:text-white px-5 py-2 font-bold uppercase tracking-wider rounded hover:bg-neutral-800 active:bg-neutral-950 shadow transition"
              >
                <Save className="w-4 h-4 text-white" /> Save Profile
              </button>
            </div>
          </form>
        </div>

        {/* Shipping Methods */}
        <div className="bg-white p-6 rounded-lg border border-neutral-200 space-y-4 text-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-3">
            Authoritative Shipping Rules
          </h2>

          <div className="divide-y divide-neutral-100">
            {shippingMethods.map((m) => (
              <div key={m.id} className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-bold text-neutral-900 uppercase">{m.name}</span>
                  <p className="text-neutral-500 text-[11px]">
                    Base Rate: ₹{m.rate} {m.free_above ? `· Free for orders above ₹${m.free_above}` : ''}
                  </p>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddShipping} className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-100">
            <div>
              <input
                type="text"
                required
                placeholder="Method Name (e.g. Express Courier)"
                value={newMethodName}
                onChange={(e) => setNewMethodName(e.target.value)}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-xs"
              />
            </div>
            <div>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Rate (₹) e.g. 150"
                value={newMethodRate}
                onChange={(e) => setNewMethodRate(e.target.value)}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-xs"
              />
            </div>
            <div>
              <input
                type="number"
                step="0.01"
                placeholder="Free above (₹) e.g. 5000"
                value={newMethodFreeAbove}
                onChange={(e) => setNewMethodFreeAbove(e.target.value)}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              className="bg-black text-white active:text-white px-4 py-2 font-bold uppercase rounded hover:bg-neutral-800 active:bg-neutral-950 shadow transition"
            >
              Add Method
            </button>
          </form>
        </div>

        {/* Taxes */}
        <div className="bg-white p-6 rounded-lg border border-neutral-200 space-y-4 text-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-3">
            Authoritative Tax & GST Rules
          </h2>

          <div className="divide-y divide-neutral-100">
            {taxRules.map((t) => (
              <div key={t.id} className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-bold text-neutral-900 uppercase">{t.name}</span>
                  <p className="text-neutral-500 text-[11px]">Percentage: {t.tax_percentage}%</p>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTax} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-100">
            <div>
              <input
                type="text"
                required
                placeholder="Tax Name (e.g. Standard GST)"
                value={newTaxName}
                onChange={(e) => setNewTaxName(e.target.value)}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-xs"
              />
            </div>
            <div>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Percentage (%) e.g. 12 or 18"
                value={newTaxRate}
                onChange={(e) => setNewTaxRate(e.target.value)}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              className="bg-black text-white active:text-white px-4 py-2 font-bold uppercase rounded hover:bg-neutral-800 active:bg-neutral-950 shadow transition"
            >
              Add Tax Rule
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
