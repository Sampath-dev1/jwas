'use client';

import React, { useEffect, useState } from 'react';
import { Palette, Plus, Trash2, ExternalLink } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest, resolveImageUrl } from '@/lib/api';

export default function AdminCmsPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [buttonText, setButtonText] = useState('Explore Collection');
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    apiRequest('/admin/cms/banners')
      .then((data) => setBanners(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/admin/cms/banners', {
        method: 'POST',
        body: JSON.stringify({
          title,
          image_url: imageUrl,
          destination_url: destinationUrl,
          button_text: buttonText,
          is_active: true,
        }),
      });
      setShowModal(false);
      setTitle('');
      setImageUrl('');
      setDestinationUrl('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      await apiRequest(`/admin/cms/banners/${id}`, { method: 'DELETE' });
      loadData();
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
              Homepage & Content Management
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
              Configure hero showcases, promotional campaigns, and interactive button destinations
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition"
          >
            <Plus className="w-4 h-4" /> Add Banner
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-400">
            Loading homepage configuration...
          </div>
        ) : banners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {banners.map((b) => (
              <div key={b.id} className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs flex flex-col justify-between">
                <div className="aspect-[16/9] w-full bg-neutral-100 relative">
                  <img src={resolveImageUrl(b.image_url)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 bg-white/90 backdrop-blur-xs rounded text-neutral-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2 text-xs">
                  <h3 className="font-bold text-neutral-900 uppercase text-sm">{b.title}</h3>
                  <div className="flex justify-between items-center text-neutral-500">
                    <span>CTA: &quot;{b.button_text}&quot;</span>
                    <span className="font-mono text-[11px] truncate max-w-[180px]">{b.destination_url}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-dashed border-neutral-200 p-12 text-center text-xs text-neutral-400">
            No hero banners configured yet. When empty, storefront renders the clean default JWAS brand presentation.
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Add Hero Banner</h3>
                <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-black">✕</button>
              </div>

              <form onSubmit={handleCreateBanner} className="space-y-4">
                <div>
                  <label className="block font-semibold uppercase mb-1">Headline Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                    placeholder="e.g. AUTUMN / WINTER 2026 COUTURE"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase mb-1">Banner Image URL *</label>
                  <input
                    type="url"
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase mb-1">Button Destination URL</label>
                  <input
                    type="text"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                    placeholder="/shop or /categories/silk"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase mb-1">Button Label</label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                  />
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
                    {submitting ? 'Saving...' : 'Save Banner'}
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
