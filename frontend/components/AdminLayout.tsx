'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Shirt,
  FolderTree,
  Boxes,
  ShoppingBag,
  Users,
  Tag,
  Palette,
  Shield,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { getStoredUser, clearAdminAuthToken, getAdminAuthToken, apiRequest, isStaffOrAdmin } from '@/lib/api';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, perm: 'reports.read' },
  { label: 'Products', href: '/admin/products', icon: Shirt, perm: 'products.read' },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree, perm: 'categories.read' },
  { label: 'Inventory', href: '/admin/inventory', icon: Boxes, perm: 'inventory.read' },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag, perm: 'orders.read' },
  { label: 'Customers', href: '/admin/customers', icon: Users, perm: 'customers.read' },
  { label: 'Promotions', href: '/admin/promotions', icon: Tag, perm: 'promotions.manage' },
  { label: 'Homepage CMS', href: '/admin/cms', icon: Palette, perm: 'promotions.manage' },
  { label: 'Staff & Roles', href: '/admin/staff', icon: Shield, perm: 'staff.manage' },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, perm: 'reports.read' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, perm: 'settings.manage' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile admin drawer is open
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

  useEffect(() => {
    const token = getAdminAuthToken();
    if (!token) {
      router.push('/account/login?redirect=' + pathname);
      return;
    }

    // Verify token with backend
    apiRequest('/auth/me')
      .then((me) => {
        const isSuper = me.roles?.includes('Super Admin');
        const hasStaff = isStaffOrAdmin(me);
        if (!hasStaff) {
          alert('Access denied. Administrator privileges are required.');
          router.push('/account');
        } else {
          setUser(me);
          setChecking(false);
        }
      })
      .catch(() => {
        router.push('/account/login?redirect=' + pathname);
      });
  }, [pathname, router]);

  const handleLogout = () => {
    clearAdminAuthToken();
    router.push('/account/login');
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-xs tracking-widest text-neutral-400 uppercase">
        Validating staff authorization...
      </div>
    );
  }

  const isSuper = user?.roles?.includes('Super Admin');
  const userPerms = new Set(user?.permissions || []);

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (isSuper) return true;
    return userPerms.has(item.perm);
  });

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col md:flex-row">
      {/* Mobile Top App Bar */}
      <header className="md:hidden sticky top-0 z-30 bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 -ml-1.5 text-neutral-300 hover:text-white focus:outline-none rounded"
            aria-label="Open administrative navigation drawer"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/admin" className="flex items-center gap-2.5">
            <img
              src="/images/logo-emblem.png"
              alt="JWAS Logo"
              className="w-7 h-7 object-contain rounded-full shadow-xs"
            />
            <span className="text-base font-black tracking-widest text-white uppercase">JWAS</span>
          </Link>
        </div>
        <span className="bg-amber-400/10 text-amber-400 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
          {isSuper ? 'Super Admin' : user.roles?.[0] || 'Staff'}
        </span>
      </header>

      {/* Mobile Off-Canvas Sliding Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300 z-[101]"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Slide-out drawer panel */}
          <aside
            style={{ backgroundColor: '#0a0a0a', opacity: 1 }}
            className="fixed inset-y-0 left-0 w-72 max-w-[82vw] bg-neutral-950 text-neutral-300 flex flex-col justify-between shadow-2xl z-[102] overflow-y-auto transform transition-transform duration-300 ease-in-out"
          >
            <div>
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/images/logo-emblem.png"
                    alt="JWAS Logo"
                    className="w-8 h-8 object-contain rounded-full shadow-xs"
                  />
                  <div>
                    <span className="text-sm font-black tracking-widest text-white uppercase leading-tight">JWAS</span>
                    <p className="text-[9px] text-amber-400 font-semibold uppercase tracking-wider">Control Center</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded"
                  aria-label="Close navigation drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="p-3 space-y-1 text-xs max-h-[calc(100vh-180px)] overflow-y-auto">
                {visibleNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded transition ${
                        isActive
                          ? 'bg-white text-black font-bold'
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-neutral-800 text-xs space-y-3 bg-neutral-950">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-neutral-300 hover:text-white py-1 font-semibold"
              >
                <ExternalLink className="w-4 h-4 text-amber-400" /> View Live Storefront
              </Link>
              <div className="text-[11px] text-neutral-300">
                <p className="font-semibold text-white">{user.full_name}</p>
                <p className="font-mono text-neutral-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 py-1 font-semibold"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Permanent Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-neutral-900 text-neutral-300 flex-col justify-between flex-shrink-0">
        <div>
          <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <img
                src="/images/logo-emblem.png"
                alt="JWAS Logo"
                className="w-10 h-10 object-contain rounded-full shadow-xs"
              />
              <div>
                <span className="text-xl font-black tracking-[0.25em] text-white uppercase leading-tight">JWAS</span>
                <p className="text-[9px] text-amber-400 font-semibold uppercase tracking-wider mt-0.5">Control Center</p>
              </div>
            </Link>
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              {isSuper ? 'Super Admin' : user.roles?.[0] || 'Staff'}
            </span>
          </div>

          <nav className="p-4 space-y-1 text-xs">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded transition ${
                    isActive
                      ? 'bg-white text-black font-bold'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-800 text-xs space-y-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-neutral-300 hover:text-white py-1 font-semibold transition"
          >
            <ExternalLink className="w-4 h-4 text-amber-400" /> View Live Storefront
          </Link>
          <div className="text-[11px] text-neutral-300">
            <p className="font-semibold text-white">{user.full_name}</p>
            <p className="font-mono text-neutral-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 py-1 font-semibold"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Administrative Viewport */}
      <main className="flex-1 p-4 md:p-10 overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}
