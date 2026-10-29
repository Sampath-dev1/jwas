'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronUp } from 'lucide-react';
import { apiRequest, resolveImageUrl } from '@/lib/api';
import { Product, Category } from '@/types';
import ProductCard from '@/components/ProductCard';
import ScrollReveal from '@/components/ScrollReveal';

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [cmsData, setCmsData] = useState<any>({ sections: [], banners: [] });
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    // Top scroll progress & back-to-top listener
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
      setShowScrollTop(window.scrollY > 350);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Fetch dynamic database store data
    // Query both featured and general products to guarantee real items display
    Promise.allSettled([
      apiRequest<Category[]>('/categories'),
      apiRequest<Product[]>('/products?limit=16'),
      apiRequest('/cms/homepage'),
    ]).then(([catRes, prodRes, cmsRes]) => {
      let prods: Product[] = [];
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) {
        prods = prodRes.value;
        // Prioritize featured if any exists, otherwise show all active products
        const featured = prods.filter((p) => p.is_featured);
        setFeaturedProducts(featured.length > 0 ? featured : prods);
      }
      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value)) {
        setCategories(catRes.value);
      }
      if (cmsRes.status === 'fulfilled') {
        setCmsData(cmsRes.value || { sections: [], banners: [] });
      }
      setLoading(false);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeBanner = cmsData.banners && cmsData.banners.length > 0 ? cmsData.banners[0] : null;

  // Resolve category preview image: use cat.image_url or derive from its first product
  const getCategoryImageUrl = (cat: Category): string => {
    if (cat.image_url) return resolveImageUrl(cat.image_url);
    const prod = featuredProducts.find(
      (p) => p.category_id === cat.id || (p as any).category_slug === cat.slug
    );
    if (prod && prod.images && prod.images.length > 0) {
      const main = prod.images.find((img) => img.is_main) || prod.images[0];
      if (main?.image_url) return resolveImageUrl(main.image_url);
    }
    return '';
  };

  // Resolve dynamic hero background from top product or custom banner
  const heroFallbackImage = featuredProducts[0]?.images?.[0]?.image_url
    ? resolveImageUrl(featuredProducts[0].images[0].image_url)
    : '/uploads/ee8c73265b594d10b1327f37a153b45a.jpeg';

  return (
    <div className="relative space-y-24 pb-28">
      {/* Luxury Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 h-[2.5px] bg-gradient-to-r from-neutral-900 via-amber-600 to-neutral-900 z-50 transition-all duration-150 ease-out pointer-events-none"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Hero Section */}
      {activeBanner ? (
        <section className="relative bg-gradient-to-b from-[#021834] via-[#040C1A] to-neutral-950 text-white min-h-[85vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden pt-10 pb-28">
          {/* Subtle Luxury Ambient Lighting */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/10 via-[#0a3560]/35 to-amber-400/5 rounded-full blur-3xl opacity-70" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-40 pointer-events-none" />

          <div className="relative z-10 text-center max-w-4xl px-4 sm:px-6 space-y-6">
            <ScrollReveal direction="down" delay={100}>
              <div className="flex flex-col items-center justify-center space-y-4">
                {/* Brand Logo with Golden Halo */}
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-amber-400/30 via-yellow-300/20 to-amber-500/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-700 pointer-events-none" />
                  <img
                    src="/images/logo.png"
                    alt="JWAS - Journey With A Style"
                    className="relative w-40 sm:w-52 md:w-60 h-auto object-contain rounded-3xl shadow-2xl border border-amber-400/35 hover:scale-[1.03] transition-all duration-700 ease-out"
                  />
                </div>

                {activeBanner.title ? (
                  <div className="space-y-1.5 text-center">
                    {activeBanner.subtitle && (
                      <span className="inline-block px-4 py-1 rounded-full text-[10px] md:text-xs font-semibold tracking-[0.3em] uppercase text-amber-300 bg-amber-950/60 border border-amber-500/30 backdrop-blur-md">
                        {activeBanner.subtitle}
                      </span>
                    )}
                    <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-[#FFF5D0] via-[#E5B744] to-[#9E6F18] drop-shadow-[0_4px_20px_rgba(229,183,68,0.5)]">
                      {activeBanner.title}
                    </h1>
                  </div>
                ) : null}
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={300}>
              <div className="pt-2">
                <Link
                  href={activeBanner.destination_url || '/shop'}
                  className="group inline-flex items-center gap-3 bg-white text-black px-9 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-100 transition-all duration-300 shadow-2xl hover:scale-[1.02]"
                >
                  {activeBanner.button_text || 'Explore Collection'}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 duration-300" />
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* Interactive Scroll to Discover Indicator */}
          <a
            href="#collections"
            aria-label="Scroll to collections"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/60 hover:text-white transition group z-10"
          >
            <span className="text-[9px] uppercase tracking-[0.3em] font-medium text-neutral-400 group-hover:text-white transition">
              Scroll to Explore
            </span>
            <div className="w-4 h-7 rounded-full border border-white/30 flex items-start justify-center p-1">
              <div className="w-1 h-1.5 bg-amber-400 rounded-full animate-gentle-bounce" />
            </div>
          </a>
        </section>
      ) : (
        /* Dynamic Store Hero without Background Image */
        <section className="relative bg-gradient-to-b from-[#021834] via-[#040C1A] to-neutral-950 text-white min-h-[85vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden pt-10 pb-28">
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/10 via-[#0a3560]/35 to-amber-400/5 rounded-full blur-3xl opacity-70" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-40 pointer-events-none" />

          <div className="relative z-10 text-center max-w-4xl px-4 sm:px-6 space-y-6">
            <ScrollReveal direction="down" delay={100}>
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-amber-400/30 via-yellow-300/20 to-amber-500/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-700 pointer-events-none" />
                  <img
                    src="/images/logo.png"
                    alt="JWAS - Journey With A Style"
                    className="relative w-36 sm:w-48 md:w-56 h-auto object-contain rounded-3xl shadow-2xl border border-amber-400/35 hover:scale-[1.03] transition-all duration-700 ease-out"
                  />
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={300}>
              <div className="pt-2">
                <Link
                  href="/shop"
                  className="group inline-flex items-center gap-3 bg-white text-black px-9 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-100 transition-all duration-300 shadow-2xl hover:scale-[1.02]"
                >
                  Explore All Products <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 duration-300" />
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* Interactive Scroll to Discover Indicator */}
          <a
            href="#collections"
            aria-label="Scroll to collections"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/60 hover:text-white transition group z-10"
          >
            <span className="text-[9px] uppercase tracking-[0.3em] font-medium text-neutral-400 group-hover:text-white transition">
              Scroll to Explore
            </span>
            <div className="w-4 h-7 rounded-full border border-white/30 flex items-start justify-center p-1">
              <div className="w-1 h-1.5 bg-amber-400 rounded-full animate-gentle-bounce" />
            </div>
          </a>
        </section>
      )}

      {/* Curated Categories Grid with Scroll Animations */}
      <section id="collections" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ScrollReveal direction="up" delay={100}>
          <div className="flex justify-between items-baseline mb-10 border-b border-neutral-100 pb-4">
            <div>
              <span className="text-[10px] font-bold tracking-[0.25em] text-neutral-400 uppercase">
                Curated Architecture
              </span>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight text-neutral-900 uppercase mt-1">
                Curated Categories
              </h2>
            </div>
            <Link
              href="/shop"
              className="group text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5 hover:text-neutral-600 transition"
            >
              View All <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-sm skeleton-shimmer" />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat, idx) => {
              const catImg = getCategoryImageUrl(cat);
              return (
                <ScrollReveal key={cat.id} direction="up" delay={idx * 100}>
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="group relative aspect-square overflow-hidden bg-neutral-900 rounded-sm flex flex-col justify-end p-6 border border-neutral-200/50 shadow-xs hover:shadow-xl transition-all duration-500"
                  >
                    {catImg ? (
                      <img
                        src={catImg}
                        alt={cat.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center text-xs tracking-widest text-neutral-400 uppercase">
                        JWAS Atelier
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-500 group-hover:opacity-90" />
                    <div className="relative z-10">
                      <h3 className="text-white font-medium uppercase tracking-wider text-base md:text-lg">
                        {cat.name}
                      </h3>
                      <span className="text-neutral-300 text-xs flex items-center gap-1.5 mt-1.5 tracking-wider uppercase font-medium group-hover:text-white transition">
                        Shop Collection <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1 duration-300" />
                      </span>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        ) : (
          <div className="border border-neutral-200 border-dashed rounded-lg p-12 text-center text-neutral-500 text-sm">
            Discover our complete product catalogue in the main shop.
          </div>
        )}
      </section>

      {/* Featured & Latest Products Section with Scroll Animations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal direction="up" delay={100}>
          <div className="flex justify-between items-baseline mb-10 border-b border-neutral-100 pb-4">
            <div>
              <span className="text-[10px] font-bold tracking-[0.25em] text-neutral-400 uppercase">
                Signature Pieces
              </span>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight text-neutral-900 uppercase mt-1">
                Featured Creations
              </h2>
            </div>
            <Link
              href="/shop"
              className="group text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5 hover:text-neutral-600 transition"
            >
              All Products ({featuredProducts.length}) <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-sm skeleton-shimmer" />
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {featuredProducts.map((p, idx) => (
              <ScrollReveal key={p.id} direction="up" delay={(idx % 4) * 80}>
                <ProductCard product={p} />
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="border border-neutral-200 border-dashed rounded-lg p-12 text-center text-neutral-500 text-sm">
            Discover our full catalogue in the shop.
          </div>
        )}
      </section>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-8 right-8 z-40 p-3 rounded-full bg-neutral-900 text-white shadow-2xl hover:bg-neutral-800 transition-all duration-300 hover:scale-110 border border-neutral-700/50 backdrop-blur-sm"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
