'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Plus, Archive, Trash2, Upload, Image as ImageIcon, X, CheckCircle2, AlertCircle } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest, uploadImage } from '@/lib/api';
import { Product, Category } from '@/types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New product form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [variantSize, setVariantSize] = useState('Standard');
  const [initialStock, setInitialStock] = useState('10');

  // Image Upload state
  const [uploadedImages, setUploadedImages] = useState<{ url: string; alt_text?: string; is_main?: boolean }[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setLoading(true);
    Promise.allSettled([
      apiRequest<Product[]>('/admin/products?limit=100'),
      apiRequest<Category[]>('/admin/categories'),
    ]).then(([prodRes, catRes]) => {
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) {
        setProducts(prodRes.value);
      }
      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value)) {
        setCategories(catRes.value);
        if (catRes.value.length > 0 && !categoryId) {
          setCategoryId(catRes.value[0].id);
        }
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadImage(file);
        setUploadedImages((prev) => [
          ...prev,
          {
            url: res.url,
            alt_text: file.name.split('.')[0],
            is_main: prev.length === 0, // First uploaded image is main
          },
        ]);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed. Supported formats: JPG, PNG, WEBP (Max 5MB).');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveUploadedImage = (indexToRemove: number) => {
    setUploadedImages((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (next.length > 0 && !next.some((img) => img.is_main)) {
        next[0].is_main = true;
      }
      return next;
    });
  };

  const handleSetMainImage = (index: number) => {
    setUploadedImages((prev) =>
      prev.map((img, idx) => ({
        ...img,
        is_main: idx === index,
      }))
    );
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      alert('Please select a category for this product.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name,
        sku,
        description,
        selling_price: parseFloat(sellingPrice),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        status,
        category_id: categoryId,
        variants: [
          {
            sku: `${sku}-01`,
            attributes: { size: variantSize },
            selling_price: parseFloat(sellingPrice),
            initial_stock: parseInt(initialStock, 10) || 0,
          },
        ],
        images: uploadedImages.map((img, idx) => ({
          image_url: img.url,
          alt_text: img.alt_text || name,
          is_main: img.is_main || idx === 0,
          display_order: idx,
        })),
      };

      await apiRequest('/admin/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowModal(false);
      setName('');
      setSku('');
      setDescription('');
      setSellingPrice('');
      setOriginalPrice('');
      setUploadedImages([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const confirmed = confirm(
      `Are you sure you want to permanently delete "${product.name}" (${product.sku})? This will completely remove it from the catalog.`
    );
    if (!confirmed) return;

    try {
      const res = await apiRequest(`/admin/products/${product.id}`, { method: 'DELETE' });
      alert(res.message || 'Product deleted completely.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product.');
    }
  };

  const handleArchive = async (productId: string) => {
    if (!confirm('Are you sure you want to archive this product?')) return;
    try {
      await apiRequest(`/admin/products/${productId}/archive`, { method: 'POST' });
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
              Product Catalog Management
            </h1>
            <p className="text-xs text-neutral-600 uppercase tracking-wider mt-1 font-medium">
              Add, configure, image-upload, and remove products and variant stock
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-black text-white active:text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded shadow hover:bg-neutral-800 active:bg-neutral-950 transition"
          >
            <Plus className="w-4 h-4 text-white" /> Add Product
          </button>
        </div>

        {/* Product Table */}
        {loading ? (
          <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-500 font-semibold">
            Loading products...
          </div>
        ) : products.length > 0 ? (
          <div className="bg-white rounded-lg border border-neutral-300 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-700 uppercase font-bold">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Stock Availability</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {products.map((p) => {
                    const mainImg = p.images.find((i) => i.is_main) || p.images[0];
                    const totalAvailable = p.variants.reduce((acc, v) => acc + (v.available_stock || 0), 0);
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50 transition">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <div className="w-12 h-14 bg-neutral-100 border border-neutral-200 rounded overflow-hidden flex-shrink-0">
                            {mainImg ? (
                              <img src={mainImg.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500 font-bold">JWAS</div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-neutral-900 block text-sm">{p.name}</span>
                            <span className="text-[11px] text-neutral-500 font-mono">{p.slug}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-neutral-800">{p.sku}</td>
                        <td className="py-3 px-4 font-bold text-neutral-900 text-sm">
                          ₹{Number(p.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-neutral-800">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            totalAvailable <= 0
                              ? 'bg-red-100 text-red-800'
                              : totalAvailable <= 5
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {totalAvailable} In Stock
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'published'
                              ? 'bg-emerald-100 text-emerald-900'
                              : p.status === 'archived'
                              ? 'bg-neutral-200 text-neutral-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="px-3 py-1.5 text-xs font-bold uppercase rounded bg-red-100 hover:bg-red-200 text-red-800 active:bg-red-300 transition inline-flex items-center gap-1.5 shadow-2xs"
                            title="Permanently Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-800" /> Delete
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
          <div className="bg-white rounded-lg border border-dashed border-neutral-300 p-12 text-center text-xs text-neutral-500 font-semibold">
            No products created yet. Click &quot;Add Product&quot; to build your catalogue.
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs text-neutral-900 shadow-xl border border-neutral-200">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-base font-bold uppercase tracking-wider text-black">Create New Product</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-neutral-700 hover:text-black font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase text-neutral-800 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-medium text-neutral-900"
                    placeholder="e.g. Italian Wool Double-Breasted Trench"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase text-neutral-800 mb-1">SKU *</label>
                    <input
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-mono font-bold text-neutral-900"
                      placeholder="e.g. TRN-001"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-neutral-800 mb-1">Category *</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-semibold text-neutral-900 bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase text-neutral-800 mb-1">Selling Price (INR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-bold text-neutral-900"
                      placeholder="4999.00"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-neutral-800 mb-1">Original Price (Optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-medium text-neutral-900"
                      placeholder="5999.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase text-neutral-800 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-medium text-neutral-900"
                    placeholder="Artisanal tailoring notes, cut, fabric weight..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase text-neutral-800 mb-1">Variant Size / Option</label>
                    <input
                      type="text"
                      value={variantSize}
                      onChange={(e) => setVariantSize(e.target.value)}
                      className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-medium text-neutral-900"
                      placeholder="M or 40 Regular"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-neutral-800 mb-1">Initial Stock Units</label>
                    <input
                      type="number"
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                      className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-bold text-neutral-900"
                      placeholder="10"
                    />
                  </div>
                </div>

                {/* Upload Image from Device Gallery */}
                <div className="space-y-2 pt-1 border-t border-neutral-200">
                  <div className="flex justify-between items-baseline">
                    <label className="block font-bold uppercase text-neutral-900">
                      Product Images (Upload from Device) *
                    </label>
                    <span className="text-[11px] text-neutral-500 font-medium">PNG, JPG, WEBP (Max 5MB)</span>
                  </div>

                  {/* Drag & Drop / File Browser Button */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 rounded-lg p-5 text-center cursor-pointer hover:border-black hover:bg-neutral-50 transition flex flex-col items-center justify-center space-y-2"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                    />
                    <div className="p-3 bg-neutral-100 rounded-full text-black">
                      <Upload className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-neutral-900">
                        {uploadingImage ? 'Uploading image...' : 'Click to Browse Device Gallery'}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Select image(s) from your computer</p>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="p-2.5 bg-red-50 text-red-800 border border-red-200 rounded text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-800" /> {uploadError}
                    </div>
                  )}

                  {/* Uploaded Images Preview Gallery */}
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                      {uploadedImages.map((img, idx) => (
                        <div
                          key={idx}
                          className={`relative aspect-[3/4] rounded border-2 overflow-hidden bg-neutral-100 group ${
                            img.is_main ? 'border-black' : 'border-neutral-200'
                          }`}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          {img.is_main && (
                            <span className="absolute top-1 left-1 bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                              Main
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-1.5">
                            <button
                              type="button"
                              onClick={() => handleRemoveUploadedImage(idx)}
                              className="self-end p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                              title="Delete this image"
                            >
                              <X className="w-3.5 h-3.5 text-white" />
                            </button>
                            {!img.is_main && (
                              <button
                                type="button"
                                onClick={() => handleSetMainImage(idx)}
                                className="w-full py-1 bg-white text-black text-[10px] font-bold rounded uppercase hover:bg-neutral-100"
                              >
                                Set Main
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold uppercase text-neutral-800 mb-1">Publication Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs font-semibold text-neutral-900 bg-white"
                  >
                    <option value="published">Published (Visible in Online Store)</option>
                    <option value="draft">Draft (Private to Staff)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 border border-neutral-300 rounded font-bold uppercase tracking-wider text-neutral-900 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-black text-white active:text-white px-6 py-2.5 font-bold uppercase tracking-wider rounded shadow hover:bg-neutral-800 active:bg-neutral-950 disabled:bg-neutral-400 transition"
                  >
                    {submitting ? 'Saving...' : 'Save & Publish Product'}
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
