'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest, resolveImageUrl } from '@/lib/api';
import { Category, Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import ScrollReveal from '@/components/ScrollReveal';

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
      {/* Category Header with Scroll Animation */}
      <ScrollReveal direction="down" delay={50}>
        <div className="relative overflow-hidden rounded-xl bg-neutral-900 border border-neutral-200/40 text-white min-h-[220px] sm:min-h-[280px] flex flex-col justify-end p-6 sm:p-10 mb-8 shadow-md">
          {category.image_url ? (
            <img
              src={resolveImageUrl(category.image_url)}
              alt={category.name}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-45 scale-102 transition-transform duration-1000"
            />
          ) : (
            <div className="absolute inset-0 bg-neutral-950 opacity-90" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />
          <div className="relative z-10 max-w-2xl">
            <span className="text-[10px] font-bold tracking-[0.25em] text-neutral-300 uppercase">
              Curated Collection
            </span>
            <h1 className="text-3xl sm:text-5xl font-light uppercase tracking-tight text-white mt-1">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-sm text-neutral-200 mt-2 font-light leading-relaxed">
                {category.description}
              </p>
            )}

            {/* Subcategories */}
            {category.subcategories && category.subcategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-5">
                {category.subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/categories/${sub.slug}`}
                    className="text-xs font-semibold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 backdrop-blur-xs transition"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollReveal>

      {/* Products Grid with Scroll Animations */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((p, idx) => (
            <ScrollReveal key={p.id} direction="up" delay={(idx % 4) * 80}>
              <ProductCard product={p} />
            </ScrollReveal>
          ))}
        </div>
      ) : (
        <ScrollReveal direction="fade" delay={100}>
          <div className="py-24 text-center border border-dashed border-neutral-200 rounded-lg p-12">
            <p className="text-sm font-medium text-neutral-700">No products are available yet in this category.</p>
            <p className="text-xs text-neutral-400 mt-2">
              Pieces for this collection are presently being prepared.
            </p>
          </div>
        </ScrollReveal>
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
