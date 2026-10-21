'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, FolderTree, Eye, EyeOff, Pencil } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/api';
import { Category } from '@/types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = () => {
    setLoading(true);
    apiRequest<Category[]>('/admin/categories')
      .then((data) => setCategories(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setParentId('');
    setIsPublished(true);
    setIsNavVisible(true);
    setShowModal(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setParentId(cat.parent_id || '');
    setIsPublished(cat.is_published);
    setIsNavVisible(cat.is_nav_visible);
    setShowModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        description,
        parent_id: parentId || null,
        is_published: isPublished,
        is_nav_visible: isNavVisible,
      };

      if (editingCategory) {
        await apiRequest(`/admin/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        alert('Category updated successfully!');
      } else {
        await apiRequest('/admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        alert('Category created successfully!');
      }
      setShowModal(false);
      setEditingCategory(null);
      loadCategories();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (catId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await apiRequest(`/admin/categories/${catId}`, { method: 'DELETE' });
      loadCategories();
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
              Category Hierarchy Management
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
              Structure parent departments, subcategories, and navigation visibility
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-black text-white active:text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded shadow hover:bg-neutral-800 active:bg-neutral-950 transition"
          >
            <Plus className="w-4 h-4 text-white" /> Add Category
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-400">
            Loading categories...
          </div>
        ) : categories.length > 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
            <div className="divide-y divide-neutral-200 text-xs">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 space-y-2 hover:bg-neutral-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderTree className="w-4 h-4 text-neutral-600" />
                      <div>
                        <strong className="text-sm font-bold uppercase text-neutral-900">{cat.name}</strong>
                        <span className="text-[10px] text-neutral-400 font-mono ml-2">/categories/{cat.slug}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        cat.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {cat.is_published ? 'Published' : 'Draft'}
                      </span>
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="text-neutral-600 hover:text-black p-1"
                        title="Edit Category"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-neutral-400 hover:text-red-600 p-1"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories list */}
                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div className="pl-7 pt-2 flex flex-wrap gap-2">
                      {cat.subcategories.map((sub) => (
                        <span
                          key={sub.id}
                          className="bg-neutral-100 border border-neutral-200 text-neutral-700 px-2.5 py-1 rounded text-[11px] flex items-center gap-1.5"
                        >
                          <span>{sub.name}</span>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="text-neutral-400 hover:text-red-600 ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-dashed border-neutral-200 p-12 text-center text-xs text-neutral-400">
            No categories defined yet. Zero hardcoded categories are present. Create your first category above.
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 text-xs text-neutral-900 shadow-xl border border-neutral-200">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Category'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-neutral-500 hover:text-black font-bold">✕</button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase text-neutral-900 mb-1 tracking-wider text-[11px]">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-semibold text-neutral-900 bg-white placeholder:text-neutral-500"
                    placeholder="e.g. Tailored Outerwear"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-neutral-900 mb-1 tracking-wider text-[11px]">Parent Category (Optional)</label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-semibold text-neutral-900 bg-white"
                  >
                    <option value="">None (Top-Level Parent)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-neutral-900 mb-1 tracking-wider text-[11px]">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-semibold text-neutral-900 bg-white placeholder:text-neutral-500"
                    placeholder="Category curation details..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-900">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="accent-black"
                    />
                    <span className="font-bold uppercase text-[11px]">Publish Immediately</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-900">
                    <input
                      type="checkbox"
                      checked={isNavVisible}
                      onChange={(e) => setIsNavVisible(e.target.checked)}
                      className="accent-black"
                    />
                    <span className="font-bold uppercase text-[11px]">Show in Header Navigation</span>
                  </label>
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
                    {submitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Save Category'}
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
