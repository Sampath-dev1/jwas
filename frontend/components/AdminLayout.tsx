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
  ShieldAlert
} from 'lucide-react';
import { getStoredUser, clearAuthToken, getAuthToken, apiRequest } from '@/lib/api';

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

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/account/login?redirect=' + pathname);
      return;
    }

    // Verify token with backend
    apiRequest('/auth/me')
      .then((me) => {
        const isSuper = me.roles?.includes('Super Admin');
        const hasStaff = isSuper || (me.permissions && me.permissions.length > 0);
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
    clearAuthToken();
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
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-neutral-900 text-neutral-300 flex flex-col justify-between flex-shrink-0">
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
      <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
