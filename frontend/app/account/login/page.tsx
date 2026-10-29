'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest, setAuthToken, setStoredUser, setAdminAuthToken, getAuthToken } from '@/lib/api';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already authenticated, redirect straight to home
    if (getAuthToken()) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let loggedInUser = null;
      let accessToken = '';
      if (isRegister) {
        const res = await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim(),
            password,
            full_name: fullName.trim(),
            phone: phone ? phone.trim() : null,
          }),
        });
        loggedInUser = res.user;
        accessToken = res.access_token;
        setAuthToken(res.access_token, res.user);
        setStoredUser(res.user);
      } else {
        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password }),
        });
        loggedInUser = res.user;
        accessToken = res.access_token;
        setAuthToken(res.access_token, res.user);
        setStoredUser(res.user);
      }

      // Role persistence
      const isSuper = loggedInUser?.roles?.includes('Super Admin');
      const isStaff = isSuper || (loggedInUser?.permissions && loggedInUser.permissions.length > 0);

      if (isStaff) {
        setAdminAuthToken(accessToken, loggedInUser);
      }

      // User requirement: After logging in they should be redirected to home
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-change'));
        window.location.href = '/';
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-neutral-100">
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="mb-4 group">
            <img
              src="/images/logo-emblem.png"
              alt="JWAS Logo"
              className="w-16 h-16 object-contain rounded-full shadow-sm group-hover:scale-105 transition-transform"
            />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-neutral-900">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-xs text-neutral-600 uppercase tracking-wider mt-1">
            {isRegister
              ? 'Join JWAS for persistent order tracking and bespoke service'
              : 'Access your order history and private settings'}
          </p>
        </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded">
            {error}
          </div>
        )}

        {isRegister && (
          <div>
            <label className="block text-neutral-700 font-semibold uppercase mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
              placeholder="e.g. Rahul Sharma"
            />
          </div>
        )}

        <div>
          <label className="block text-neutral-700 font-semibold uppercase mb-1">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
            placeholder="you@domain.com"
          />
        </div>

        <div>
          <label className="block text-neutral-700 font-semibold uppercase mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
            placeholder="••••••••"
          />
        </div>

        {isRegister && (
          <div>
            <label className="block text-neutral-700 font-semibold uppercase mb-1">Phone Number (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
              placeholder="+91 98765 43210"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 px-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition rounded disabled:bg-neutral-400 mt-2"
        >
          {loading ? 'Authenticating...' : isRegister ? 'Register' : 'Sign In'}
        </button>
      </form>

      <div className="text-center mt-6 text-xs text-neutral-500">
        {isRegister ? (
          <p>
            Already have an account?{' '}
            <button
              onClick={() => setIsRegister(false)}
              className="font-bold text-neutral-900 underline uppercase ml-1"
            >
              Sign In
            </button>
          </p>
        ) : (
          <p>
            Don&apos;t have an account?{' '}
            <button
              onClick={() => setIsRegister(true)}
              className="font-bold text-neutral-900 underline uppercase ml-1"
            >
              Create One
            </button>
          </p>
        )}
      </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs tracking-widest uppercase">Loading authentication...</div>}>
      <LoginContent />
    </Suspense>
  );
}
