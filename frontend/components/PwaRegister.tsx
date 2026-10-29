'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('JWAS PWA Service Worker registered:', reg.scope);
          })
          .catch((err) => {
            console.warn('JWAS PWA Service Worker registration error:', err);
          });
      });
    }

    // 2. Check if already running in standalone PWA mode
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
        return;
      }
    }

    // 3. Listen for browser install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Check if user dismissed previously in this session
      const dismissed = sessionStorage.getItem('jwas_pwa_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      console.log('JWAS PWA was successfully installed.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowInstallBanner(false);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('jwas_pwa_dismissed', 'true');
  };

  if (!showInstallBanner || isInstalled) {
    return null;
  }

  return (
    <aside
      aria-label="PWA install banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#022e53] text-white p-4 rounded-xl shadow-2xl border border-white/20 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-lg bg-[#012442] p-1 flex-shrink-0 border border-white/10 flex items-center justify-center overflow-hidden">
          <img
            src="/icons/icon-192x192.png"
            alt="JWAS App Icon"
            className="w-full h-full object-contain rounded-md"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black tracking-wider uppercase truncate">Install JWAS App</h4>
          <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5">
            Add to home screen for faster browsing & offline luxury experience.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 text-white/60 hover:text-white transition rounded"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/10">
        <button
          onClick={handleInstallClick}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-[#022e53] hover:bg-neutral-100 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> Install App
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-2 text-white/70 hover:text-white text-xs font-semibold uppercase tracking-wider transition"
        >
          Not now
        </button>
      </div>
    </aside>
  );
}
