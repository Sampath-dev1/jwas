'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { Category, Product } from '@/types';
import ProductCard from '@/components/ProductCard';

function CategoryDetailContent() {
  const params = useParams();
  const slug = params.slug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    Promise.allSettled([
      apiRequest<Category>(`/categories/${slug}`),
      apiRequest<Product[]>(`/products?category=${slug}`),
    ]).then(([catRes, prodRes]) => {
      if (catRes.status === 'fulfilled') {
        setCategory(catRes.value);
      }
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) {
        setProducts(prodRes.value);
      }
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24 text-center text-xs uppercase tracking-widest text-neutral-400">
        Loading category...
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold uppercase text-neutral-900">Category Not Found</h1>
        <p className="text-xs text-neutral-500 mt-2">The requested collection does not exist or has been unpublished.</p>
        <Link href="/shop" className="mt-6 inline-block text-xs uppercase tracking-widest font-bold underline">
          Return to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Category Header */}
      <div className="border-b border-neutral-200 pb-8">
        <h1 className="text-3xl font-bold uppercase tracking-tight text-neutral-900">
          {category.name}
        </h1>
        {category.description && (
          <p className="text-sm text-neutral-600 mt-2 max-w-2xl font-light">
            {category.description}
          </p>
        )}

        {/* Subcategories */}
        {category.subcategories && category.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {category.subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/categories/${sub.slug}`}
                className="text-xs font-semibold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-neutral-200 hover:border-black transition"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center border border-dashed border-neutral-200 rounded-lg p-12">
          <p className="text-sm font-medium text-neutral-700">No products are available yet in this category.</p>
          <p className="text-xs text-neutral-400 mt-2">
            Pieces for this collection are presently being prepared.
          </p>
        </div>
      )}
    </div>
  );
}

export default function CategoryDetailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs tracking-widest uppercase">Loading category...</div>}>
      <CategoryDetailContent />
    </Suspense>
  );
}
