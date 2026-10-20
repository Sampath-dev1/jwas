'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, SlidersHorizontal, Search } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { Product, Category } from '@/types';
import ProductCard from '@/components/ProductCard';

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const currentCategory = searchParams.get('category') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const isNewArrival = searchParams.get('new_arrival') === 'true';
  const isBestSeller = searchParams.get('best_seller') === 'true';

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [sortOption, setSortOption] = useState(currentSort);

  useEffect(() => {
    apiRequest<Category[]>('/categories')
      .then((data) => setCategories(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentCategory) params.set('category', currentCategory);
    if (currentSearch) params.set('search', currentSearch);
    if (currentSort) params.set('sort', currentSort);
    if (isNewArrival) params.set('new_arrival', 'true');
    if (isBestSeller) params.set('best_seller', 'true');

    apiRequest<Product[]>(`/products?${params.toString()}`)
      .then((data) => setProducts(data || []))
      .catch((err) => {
        console.error('Error fetching products:', err);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [currentCategory, currentSearch, currentSort, isNewArrival, isBestSeller]);

  const updateFilters = (newCat?: string, newSort?: string, newSearch?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newCat !== undefined) {
      if (newCat) params.set('category', newCat);
      else params.delete('category');
    }
    if (newSort !== undefined) params.set('sort', newSort);
    if (newSearch !== undefined) {
      if (newSearch) params.set('search', newSearch);
      else params.delete('search');
    }
    router.push(`/shop?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Title & Filter Bar */}
      <div className="border-b border-neutral-200 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-neutral-900">
            {currentCategory
              ? categories.find((c) => c.slug === currentCategory)?.name || 'Collection'
              : isNewArrival
              ? 'New Arrivals'
              : isBestSeller
              ? 'Best Sellers'
              : 'All Collections'}
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            {products.length} {products.length === 1 ? 'Creation Available' : 'Creations Available'}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <select
            value={currentCategory}
            onChange={(e) => updateFilters(e.target.value, undefined, undefined)}
            className="text-xs font-medium border border-neutral-300 rounded px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:border-black"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={currentSort}
            onChange={(e) => {
              setSortOption(e.target.value);
              updateFilters(undefined, e.target.value, undefined);
            }}
            className="text-xs font-medium border border-neutral-300 rounded px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:border-black"
          >
            <option value="newest">Sort by: Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Product Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-24 text-center text-xs uppercase tracking-widest text-neutral-400 animate-pulse">
          Retrieving live product catalogue...
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center border border-dashed border-neutral-200 rounded-lg p-12">
          <p className="text-sm font-medium text-neutral-700">
            {currentSearch ? 'No products found.' : 'No products are available yet.'}
          </p>
          <p className="text-xs text-neutral-400 mt-2 max-w-sm mx-auto">
            {currentSearch
              ? `No items match the search term "${currentSearch}".`
              : 'Our catalogue is updated continuously as new pieces are curated and published.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs tracking-widest uppercase">Loading catalogue...</div>}>
      <ShopContent />
    </Suspense>
  );
}
