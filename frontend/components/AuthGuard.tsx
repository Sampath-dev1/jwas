'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/api';

function AuthGuardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = getAuthToken();
    const isUserAuthed = Boolean(token);
    setAuthed(isUserAuthed);

    if (!isUserAuthed && pathname !== '/account/login') {
      router.replace('/account/login');
    }
  }, [pathname, router]);

  // When on the login route, immediately display the login screen without any wrappers
  if (pathname === '/account/login') {
    return <>{children}</>;
  }

  // On all other routes, do NOT render child layout/tools until confirmed authenticated
  if (!mounted || !authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthGuardInner>{children}</AuthGuardInner>
    </Suspense>
  );
}
