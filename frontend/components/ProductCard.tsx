'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Product } from '@/types';
import { apiRequest, getAuthToken, resolveImageUrl } from '@/lib/api';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [inWishlist, setInWishlist] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  const rawMainImage = product.images.find((img) => img.is_main)?.image_url || product.images[0]?.image_url;
  const mainImage = rawMainImage ? resolveImageUrl(rawMainImage) : '';
  
  // Compute total available stock across variants
  const totalStock = product.variants.reduce((acc, v) => acc + (v.available_stock || 0), 0);
  const isOutOfStock = totalStock <= 0;

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!getAuthToken()) {
      alert('Please log in to add items to your wishlist.');
      return;
    }
    setLoadingWishlist(true);
    try {
      const res = await apiRequest(`/account/wishlist/${product.id}`, { method: 'POST' });
      setInWishlist(res.in_wishlist);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingWishlist(false);
    }
  };

  return (
    <div className="group relative flex flex-col">
      {/* Product Image Frame */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 rounded-sm">
        {mainImage ? (
          <img
            src={mainImage}
            alt={product.name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600';
            }}
            className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs tracking-widest text-neutral-400 uppercase bg-neutral-100">
            JWAS Studio
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.is_new_arrival && (
            <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase">
              New
            </span>
          )}
          {product.is_best_seller && (
            <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase">
              Bestseller
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-neutral-800/90 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 tracking-wider uppercase">
              Sold Out
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWishlistToggle}
          disabled={loadingWishlist}
          aria-label="Add to wishlist"
          className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm text-neutral-700 hover:text-black hover:bg-white transition"
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      </div>

      {/* Product Information */}
      <div className="mt-3 flex flex-col justify-between flex-1">
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-neutral-400 uppercase">
            SKU: {product.sku}
          </span>
          <h3 className="text-sm font-medium text-neutral-900 group-hover:text-black mt-0.5 line-clamp-1">
            <Link href={`/products/${product.slug}`}>
              <span aria-hidden="true" className="absolute inset-0 z-0" />
              {product.name}
            </Link>
          </h3>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-sm font-semibold text-neutral-900">
            ₹{Number(product.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          {product.original_price && Number(product.original_price) > Number(product.selling_price) && (
            <p className="text-xs text-neutral-400 line-through">
              ₹{Number(product.original_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
