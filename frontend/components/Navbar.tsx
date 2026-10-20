'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Heart, User, Search, Menu, X, ShieldAlert } from 'lucide-react';
import { apiRequest, getStoredUser, clearAuthToken, getAuthToken } from '@/lib/api';
import { Category, Cart } from '@/types';

export default function Navbar() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Fetch categories dynamically from database
    apiRequest<Category[]>('/categories')
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data.filter((c) => c.is_nav_visible));
        }
      })
      .catch((err) => console.error('Error fetching categories:', err));

    // Fetch cart count
    apiRequest<Cart>('/cart')
      .then((cart) => {
        if (cart) setCartCount(cart.item_count || 0);
      })
      .catch(() => {});

    // Check user login
    const stored = getStoredUser();
    setUser(stored);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (!user && !getAuthToken()) {
      alert('Please sign in or create an account to search products.');
      router.push(`/account/login?redirect=${encodeURIComponent(`/shop?search=${encodeURIComponent(query)}`)}`);
      return;
    }

    router.push(`/shop?search=${encodeURIComponent(query)}`);
  };

  const handleSearchFocus = () => {
    if (!user && !getAuthToken()) {
      router.push('/account/login?redirect=/shop');
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    router.push('/account/login');
  };

  const isStaff = user && (user.roles?.includes('Super Admin') || (user.permissions && user.permissions.length > 0));

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-100 transition-all">
      {/* Top utility banner */}
      <div className="bg-neutral-900 text-neutral-300 text-xs py-1.5 px-4 text-center tracking-widest uppercase font-medium flex justify-between items-center max-w-7xl mx-auto">
        <span>JWAS COUTURE & ESSENTIALS</span>
        <div className="flex gap-4 items-center">
          {isStaff && (
            <Link
              href="/admin"
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Staff Dashboard
            </Link>
          )}
          <span>AUTHENTIC DYNAMIC COMMERCE</span>
        </div>
      </div>

      {/* Main navigation container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Mobile menu trigger */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-700 hover:text-black focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Logo / Brand Wordmark */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-3 group transition">
              <img
                src="/images/logo-emblem.png"
                alt="JWAS Logo"
                className="w-10 h-10 object-contain rounded-full shadow-2xs group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="tracking-[0.22em] text-xl font-black uppercase text-black leading-tight">
                  JWAS
                </span>
                <span className="text-[8.5px] tracking-[0.28em] uppercase text-neutral-600 font-bold -mt-0.5">
                  Collections
                </span>
              </div>
            </Link>
          </div>

          {/* Dynamic Category Navigation Links */}
          <nav className="hidden md:flex space-x-8 items-center text-sm font-medium tracking-wider text-neutral-800 uppercase">
            <Link href="/shop" className="hover:text-black transition">
              All Collections
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="hover:text-black transition"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          {/* Actions: Search, Wishlist, Account, Cart */}
          <div className="flex items-center space-x-5">
            <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onFocus={handleSearchFocus}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-black transition w-44 focus:w-60"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2 pointer-events-none" />
            </form>

            <Link href="/wishlist" className="text-neutral-700 hover:text-black transition p-1" title="Wishlist">
              <Heart className="w-5 h-5" />
            </Link>

            {user ? (
              <div className="relative group flex items-center gap-2">
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-800 hover:text-black uppercase tracking-wider"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden sm:inline max-w-[100px] truncate">{user.full_name?.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden sm:inline text-xs text-neutral-400 hover:text-red-600 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/account/login"
                className="text-neutral-700 hover:text-black transition p-1"
                title="Account Login"
              >
                <User className="w-5 h-5" />
              </Link>
            )}

            <Link
              href="/cart"
              className="text-neutral-800 hover:text-black transition p-1 relative flex items-center"
              title="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-white px-4 pt-3 pb-6 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onFocus={handleSearchFocus}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg py-2 pl-9 pr-4 text-sm"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          </form>
          <Link
            href="/shop"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold tracking-wider uppercase text-neutral-900 py-1"
          >
            All Collections
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium tracking-wider uppercase text-neutral-700 py-1"
            >
              {cat.name}
            </Link>
          ))}
          {user && (
            <button
              onClick={handleLogout}
              className="block w-full text-left text-sm font-medium text-red-600 pt-3 border-t border-neutral-100"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
