'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-neutral-950 text-neutral-400 text-sm border-t border-neutral-900 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand block */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <img
                src="/images/logo-emblem.png"
                alt="JWAS Logo"
                className="w-12 h-12 object-contain rounded-full shadow-md"
              />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-[0.25em] text-white uppercase leading-tight">JWAS</span>
                <span className="text-[9px] tracking-[0.25em] uppercase text-neutral-400 font-bold">Collections</span>
              </div>
            </Link>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-xs">
              Journey with a style. Contemporary tailoring and luxury essentials engineered with uncompromising precision.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-widest text-neutral-200 uppercase">Collections</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/shop" className="hover:text-white transition">All Products</Link></li>
              <li><Link href="/shop?new_arrival=true" className="hover:text-white transition">New Arrivals</Link></li>
              <li><Link href="/shop?best_seller=true" className="hover:text-white transition">Best Sellers</Link></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-widest text-neutral-200 uppercase">Customer Service</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/account" className="hover:text-white transition">Track Order</Link></li>
              <li><Link href="/cart" className="hover:text-white transition">Shopping Bag</Link></li>
              <li><Link href="/wishlist" className="hover:text-white transition">Wishlist</Link></li>
            </ul>
          </div>

          {/* Policies & Integrity */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-widest text-neutral-200 uppercase">Platform Integrity</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Every product, inventory count, and transaction is verified and backed directly by our real-time database architecture.
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-900 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-neutral-600 gap-4">
          <p>© 2026 JWAS E-Commerce Platform. All rights reserved.</p>
          <div className="flex space-x-6">
            <span>Production Grade Architecture</span>
            <span>PostgreSQL & FastAPI</span>
            <span>Next.js Frontend</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
