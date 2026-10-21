'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { apiRequest, resolveImageUrl } from '@/lib/api';
import { Product, Category } from '@/types';
import ProductCard from '@/components/ProductCard';

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [cmsData, setCmsData] = useState<any>({ sections: [], banners: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiRequest<Category[]>('/categories'),
      apiRequest<Product[]>('/products?featured=true&limit=8'),
      apiRequest('/cms/homepage'),
    ]).then(([catRes, prodRes, cmsRes]) => {
      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value)) {
        setCategories(catRes.value);
      }
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) {
        setFeaturedProducts(prodRes.value);
      }
      if (cmsRes.status === 'fulfilled') {
        setCmsData(cmsRes.value || { sections: [], banners: [] });
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      {cmsData.banners && cmsData.banners.length > 0 ? (
        <div className="relative bg-neutral-900 text-white min-h-[550px] flex items-center justify-center overflow-hidden">
          <img
            src={resolveImageUrl(cmsData.banners[0].image_url)}
            alt={cmsData.banners[0].title}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          <div className="relative z-10 text-center max-w-3xl px-4 space-y-6">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">
              {cmsData.banners[0].title}
            </h1>
            {cmsData.banners[0].destination_url && (
              <div>
                <Link
                  href={cmsData.banners[0].destination_url}
                  className="inline-flex items-center gap-2 bg-white text-black px-8 py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition"
                >
                  {cmsData.banners[0].button_text || 'Explore Now'} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <section className="relative bg-neutral-900 text-white py-24 md:py-36 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400 mb-4">
            Curated Clothing & Lifestyle
          </span>
          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tight max-w-4xl text-neutral-100">
            JWAS COUTURE
          </h1>
          <p className="mt-6 text-sm md:text-base text-neutral-400 max-w-xl font-light leading-relaxed">
            Contemporary silhouettes, tailored precision, and refined luxury essentials. Engineered for distinction.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition"
            >
              Explore Catalogue <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Dynamic Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-baseline mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 uppercase">
              Curated Categories
            </h2>
            <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
              Explore by silhouette and craft
            </p>
          </div>
          <Link href="/shop" className="text-xs font-semibold uppercase tracking-wider text-neutral-900 hover:underline">
            View All
          </Link>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group relative aspect-square overflow-hidden bg-neutral-100 rounded-sm flex flex-col justify-end p-6"
              >
                {cat.image_url ? (
                  <img
                    src={resolveImageUrl(cat.image_url)}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center text-xs tracking-widest text-neutral-400 uppercase">
                    JWAS
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="relative z-10">
                  <h3 className="text-white font-bold uppercase tracking-wider text-base">
                    {cat.name}
                  </h3>
                  <span className="text-neutral-300 text-xs flex items-center gap-1 mt-1 group-hover:underline">
                    Shop Collection <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-neutral-200 border-dashed rounded-lg p-12 text-center text-neutral-500 text-sm">
            No published categories available at this time.
          </div>
        )}
      </section>

      {/* Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-baseline mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 uppercase">
              Featured Creations
            </h2>
            <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
              Hand-selected signature pieces
            </p>
          </div>
          <Link href="/shop" className="text-xs font-semibold uppercase tracking-wider text-neutral-900 hover:underline">
            All Products
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="border border-neutral-200 border-dashed rounded-lg p-12 text-center text-neutral-500 text-sm">
            No featured products configured yet. Explore our complete catalogue in the shop.
          </div>
        )}
      </section>

      {/* Value Pillars */}
      <section className="border-t border-b border-neutral-100 bg-neutral-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center space-y-2">
            <Sparkles className="w-6 h-6 text-neutral-800" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900">Artisanal Tailoring</h4>
            <p className="text-xs text-neutral-500 max-w-xs">Engineered with authentic materials and precision tailoring standards.</p>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <ShieldCheck className="w-6 h-6 text-neutral-800" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900">Authentic Stock Assurance</h4>
            <p className="text-xs text-neutral-500 max-w-xs">Every order commits reserved inventory directly on the production ledger.</p>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <Truck className="w-6 h-6 text-neutral-800" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900">Tracked Express Delivery</h4>
            <p className="text-xs text-neutral-500 max-w-xs">Full state-machine lifecycle tracking with real courier integrations.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
