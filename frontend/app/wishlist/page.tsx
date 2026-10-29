'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Trash2, ArrowRight } from 'lucide-react';
import { apiRequest, getAuthToken, resolveImageUrl } from '@/lib/api';
import ScrollReveal from '@/components/ScrollReveal';

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = () => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    apiRequest('/account/wishlist')
      .then((data) => setItems(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (productId: string) => {
    try {
      await apiRequest(`/account/wishlist/${productId}`, { method: 'POST' });
      fetchWishlist();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs uppercase tracking-widest text-neutral-400">
        Loading wishlist...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <ScrollReveal direction="down" delay={50}>
        <h1 className="text-3xl font-bold uppercase tracking-tight text-neutral-900">
          Saved Wishlist ({items.length})
        </h1>
      </ScrollReveal>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((it, idx) => (
            <ScrollReveal key={it.product_id} direction="up" delay={(idx % 4) * 80}>
              <div className="border border-neutral-200 rounded-lg p-4 flex flex-col justify-between bg-white shadow-xs hover:border-neutral-400 transition">
                <div>
                  <div className="aspect-[3/4] bg-neutral-100 rounded overflow-hidden mb-3">
                    {it.image_url ? (
                      <img
                        src={resolveImageUrl(it.image_url)}
                        alt={it.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                        JWAS
                      </div>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold uppercase text-neutral-900 line-clamp-1">
                    <Link href={`/products/${it.slug}`}>{it.name}</Link>
                  </h3>
                  <p className="text-xs font-bold text-neutral-900 mt-1">
                    ₹{Number(it.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/products/${it.slug}`}
                    className="flex-1 bg-black text-white text-center py-2 text-[10px] font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleRemove(it.product_id)}
                    className="p-2 border border-neutral-300 rounded text-neutral-500 hover:text-red-600 transition"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      ) : (
        <ScrollReveal direction="fade" delay={100}>
          <div className="py-20 text-center border border-dashed border-neutral-200 rounded-lg p-12">
            <Heart className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-800">Your wishlist is currently empty.</p>
            <p className="text-xs text-neutral-400 mt-1">Save pieces you love to keep track of their availability.</p>
            <Link
              href="/shop"
              className="mt-6 inline-flex items-center gap-1.5 bg-black text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition rounded"
            >
              Explore Catalogue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
