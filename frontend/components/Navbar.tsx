'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingBag, Heart, User, Search, Menu, X, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiRequest, getStoredUser, clearAuthToken, getAuthToken, isStaffOrAdmin } from '@/lib/api';
import { Category, Cart } from '@/types';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    setMounted(true);
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

    // Check user login and subscribe to auth changes
    const syncUser = () => {
      setUser(getStoredUser());
    };
    syncUser();

    window.addEventListener('storage', syncUser);
    window.addEventListener('auth-change', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('auth-change', syncUser);
    };
  }, [pathname]);

  // Prevent background scrolling when mobile sliding drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Check category strip scroll boundaries
  const checkScroll = () => {
    if (navScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (navScrollRef.current) {
      const offset = direction === 'left' ? -260 : 260;
      navScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 320);
    }
  };

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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
      window.location.href = '/account/login';
    } else {
      router.push('/account/login');
    }
  };

  const isStaff = isStaffOrAdmin(user);

  // Hide Navbar on login route and on admin pages
  if (pathname === '/account/login' || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 transition-all shadow-xs">
        {/* Tier 1: Main Top Header (Brand, Search & Quick Actions) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 sm:h-20 gap-3 sm:gap-6">
            {/* Left: Mobile Toggle & Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center md:hidden gap-1.5">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-neutral-700 hover:text-black rounded-lg focus:outline-none hover:bg-neutral-100 transition"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
                {mounted && isStaff && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded shadow-2xs transition"
                  >
                    <ShieldAlert className="w-3 h-3 text-amber-700" />
                    <span>Admin</span>
                  </Link>
                )}
              </div>

              {/* Logo / Brand Wordmark */}
              <Link href="/" className="flex items-center gap-3 group transition flex-shrink-0">
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

            {/* Center: Search Bar with Clean Framing (Desktop / Tablet) */}
            <div className="hidden md:flex flex-1 max-w-lg mx-2 lg:mx-6">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <input
                  type="text"
                  placeholder="Search collections, sarees, kurthis, dress materials..."
                  value={searchQuery}
                  onFocus={handleSearchFocus}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50/90 hover:bg-white border border-neutral-200 hover:border-neutral-300 rounded-full py-2 pl-10 pr-4 text-xs font-medium text-neutral-900 focus:outline-none focus:border-black focus:bg-white transition-all shadow-2xs placeholder:text-neutral-500"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-2.5 pointer-events-none" />
              </form>
            </div>

            {/* Right: Actions (Wishlist, User Account, Shopping Bag) */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link
                href="/wishlist"
                className="text-neutral-700 hover:text-black transition p-2 rounded-full hover:bg-neutral-100"
                title="Wishlist"
              >
                <Heart className="w-5 h-5" />
              </Link>

              {mounted && user ? (
                <div className="relative group flex items-center gap-2">
                  {isStaff && (
                    <Link
                      href="/admin"
                      className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1 rounded-md shadow-2xs transition"
                      title="Enter Admin Control Center"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                      <span>Admin Portal</span>
                    </Link>
                  )}
                  <Link
                    href="/account"
                    className="flex items-center gap-1.5 text-xs font-medium text-neutral-800 hover:text-black uppercase tracking-wider p-2 rounded-full hover:bg-neutral-100"
                  >
                    <User className="w-5 h-5" />
                    <span className="hidden lg:inline max-w-[100px] truncate">{user.full_name?.split(' ')[0]}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="hidden lg:inline text-xs text-neutral-400 hover:text-red-600 transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/account/login"
                  className="text-neutral-700 hover:text-black transition p-2 rounded-full hover:bg-neutral-100"
                  title="Account Login"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}

              <Link
                href="/cart"
                className="text-neutral-800 hover:text-black transition p-2 rounded-full hover:bg-neutral-100 relative flex items-center"
                title="Shopping Bag"
              >
                <ShoppingBag className="w-5 h-5" />
                {mounted && cartCount > 0 && (
                  <span className="absolute 0 top-0.5 right-0.5 bg-black text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Tier 2: Framed Category Sub-Nav Strip (Never wrap, spacious, horizontally scrollable) */}
        <div className="border-t border-neutral-100 bg-neutral-50/70 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative flex items-center py-2">
            {/* Desktop Left Scroll Chevron */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollCategories('left')}
                className="hidden md:flex absolute left-1 sm:left-2 z-10 w-7 h-7 items-center justify-center rounded-full bg-white/95 border border-neutral-200 text-neutral-700 shadow-md hover:bg-black hover:text-white transition"
                aria-label="Scroll categories left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Horizontally scrollable framed categories */}
            <nav
              ref={navScrollRef}
              onScroll={checkScroll}
              aria-label="Product categories"
              className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full px-1"
            >
              {/* All Collections Framed Pill */}
              <Link
                href="/shop"
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase transition shadow-2xs shrink-0 ${
                  pathname === '/shop'
                    ? 'bg-[#021834] text-white border border-[#021834] shadow-xs'
                    : 'bg-white border border-neutral-200/90 text-neutral-800 hover:border-black hover:text-black hover:bg-neutral-100'
                }`}
              >
                All Collections
              </Link>

              {/* Framed Category Pills */}
              {categories.map((cat) => {
                const isActive = pathname === `/categories/${cat.slug}`;
                return (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold tracking-wider uppercase transition shadow-2xs shrink-0 ${
                      isActive
                        ? 'bg-[#021834] text-white border border-[#021834] shadow-xs'
                        : 'bg-white border border-neutral-200/90 text-neutral-700 hover:border-black hover:text-black hover:bg-neutral-100'
                    }`}
                  >
                    {cat.name}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Right Scroll Chevron */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollCategories('right')}
                className="hidden md:flex absolute right-1 sm:right-2 z-10 w-7 h-7 items-center justify-center rounded-full bg-white/95 border border-neutral-200 text-neutral-700 shadow-md hover:bg-black hover:text-white transition"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Off-Canvas Sliding Drawer Menu (Rendered outside header to prevent backdrop-blur stacking issues) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 z-[101]"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sliding drawer panel */}
          <aside
            style={{ backgroundColor: '#ffffff', opacity: 1 }}
            className="fixed inset-y-0 left-0 w-80 max-w-[86vw] bg-white text-neutral-900 shadow-2xl z-[102] flex flex-col justify-between p-6 transform transition-transform duration-300 ease-in-out overflow-y-auto"
          >
            <div>
              {/* Drawer header */}
              <div className="flex items-center justify-between pb-5 border-b border-neutral-100">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3"
                >
                  <img
                    src="/images/logo-emblem.png"
                    alt="JWAS Logo"
                    className="w-10 h-10 object-contain rounded-full shadow-2xs"
                  />
                  <div className="flex flex-col">
                    <span className="tracking-[0.2em] text-lg font-black uppercase text-black leading-tight">
                      JWAS
                    </span>
                    <span className="text-[8px] tracking-[0.25em] uppercase text-neutral-500 font-bold -mt-0.5">
                      Collections
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-black rounded"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="relative mt-5 mb-6">
                <input
                  type="text"
                  placeholder="Search collections..."
                  value={searchQuery}
                  onFocus={handleSearchFocus}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg py-2.5 pl-10 pr-4 text-xs font-medium text-neutral-900 focus:outline-none focus:border-black placeholder:text-neutral-500"
                />
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3 pointer-events-none" />
              </form>

              {/* Navigation Links */}
              <nav className="space-y-1 text-xs uppercase font-bold tracking-wider max-h-[calc(100vh-320px)] overflow-y-auto">
                <Link
                  href="/shop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded hover:bg-neutral-100 text-neutral-900 transition"
                >
                  All Collections
                </Link>
                <Link
                  href="/shop?new_arrival=true"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded hover:bg-neutral-100 text-neutral-900 transition"
                >
                  New Arrivals
                </Link>
                <Link
                  href="/shop?best_seller=true"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded hover:bg-neutral-100 text-neutral-900 transition"
                >
                  Best Sellers
                </Link>

                {categories.length > 0 && (
                  <div className="pt-3 pb-1">
                    <p className="px-3 text-[10px] text-neutral-400 tracking-widest font-semibold">Categories</p>
                  </div>
                )}
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded hover:bg-neutral-100 text-neutral-700 transition normal-case font-medium text-xs"
                  >
                    {cat.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-neutral-200 space-y-3 text-xs">
              {mounted && isStaff && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold py-2.5 rounded-lg uppercase tracking-wider text-xs shadow-xs transition"
                >
                  <ShieldAlert className="w-4 h-4" /> Admin Operations Console
                </Link>
              )}
              {mounted && user ? (
                <div className="space-y-2">
                  <div className="px-1 text-[11px] text-neutral-600">
                    <p className="font-bold text-neutral-900">{user.full_name}</p>
                    <p className="font-mono text-neutral-500 truncate">{user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 bg-black text-white text-center py-2 rounded font-bold uppercase tracking-wider"
                    >
                      Account
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="px-3 py-2 border border-neutral-300 text-red-600 rounded font-semibold hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/account/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-black text-white text-center py-2.5 rounded font-bold uppercase tracking-wider block"
                >
                  Sign In / Register
                </Link>
              )}

              <div className="flex justify-between items-center text-neutral-600 pt-2 border-t border-neutral-100">
                <Link
                  href="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-1.5 hover:text-black font-semibold"
                >
                  <Heart className="w-4 h-4" /> Wishlist
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-1.5 hover:text-black font-semibold"
                >
                  <ShoppingBag className="w-4 h-4" /> Bag ({cartCount})
                </Link>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
