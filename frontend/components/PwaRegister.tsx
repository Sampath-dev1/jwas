'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, X, Share, PlusSquare, CheckCircle2, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Service Worker Registration (immediate if page already loaded)
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          console.log('JWAS PWA Service Worker active:', reg.scope);
        } catch (err) {
          console.warn('JWAS PWA Service Worker registration warning:', err);
        }
      }
    };

    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
    }

    // 2. Comprehensive Installed Status Detection
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      setShowInstallBanner(false);
      localStorage.setItem('jwas_pwa_installed', 'true');
      return;
    }

    const storedInstalled = localStorage.getItem('jwas_pwa_installed');
    if (storedInstalled === 'true') {
      setIsInstalled(true);
      setShowInstallBanner(false);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isAppleDevice);

    // 3. Modern Chrome Android Related Apps Query
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any)
        .getInstalledRelatedApps()
        .then((apps: any[]) => {
          if (apps && apps.length > 0) {
            setIsInstalled(true);
            setShowInstallBanner(false);
            localStorage.setItem('jwas_pwa_installed', 'true');
            return;
          }
        })
        .catch(() => {});
    }

    // 4. Capture native browser install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // If not installed, trigger banner prompt
      const alreadyInstalled = localStorage.getItem('jwas_pwa_installed') === 'true';
      if (!alreadyInstalled) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setShowInstructions(false);
      setDeferredPrompt(null);
      localStorage.setItem('jwas_pwa_installed', 'true');
      console.log('JWAS PWA successfully installed on device.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Fallback timer: Guarantees prompt appears on mobile devices
    // (Crucial for iOS Safari & browsers where beforeinstallprompt does not fire automatically)
    const timer = setTimeout(() => {
      const alreadyInstalled =
        localStorage.getItem('jwas_pwa_installed') === 'true' ||
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

      const dismissedInSession = sessionStorage.getItem('jwas_pwa_dismissed') === 'true';

      if (!alreadyInstalled && !dismissedInSession) {
        setShowInstallBanner(true);
      }
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('load', registerServiceWorker);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          localStorage.setItem('jwas_pwa_installed', 'true');
          setIsInstalled(true);
          setShowInstallBanner(false);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      } finally {
        setDeferredPrompt(null);
      }
    } else {
      // If browser doesn't offer direct prompt (iOS Safari or Chrome manual install)
      setShowInstructions(true);
    }
  };

  const markAsInstalled = () => {
    localStorage.setItem('jwas_pwa_installed', 'true');
    setIsInstalled(true);
    setShowInstallBanner(false);
    setShowInstructions(false);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('jwas_pwa_dismissed', 'true');
  };

  const pathname = usePathname();

  // If already installed, NEVER show notification prompt anywhere
  if (isInstalled) {
    return null;
  }

  // Only suppress inside dedicated administrative operations portal
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* Main PWA Install Prompt Banner */}
      {showInstallBanner && (
        <aside
          aria-label="PWA install banner"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#021834]/95 text-white p-4 rounded-2xl shadow-2xl border border-amber-400/30 backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-[#042852] to-[#011428] p-1 flex-shrink-0 border border-amber-400/30 flex items-center justify-center shadow-md">
              <img
                src="/icons/icon-192x192.png"
                alt="JWAS App Icon"
                className="w-10 h-10 object-contain rounded-lg"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black tracking-wider uppercase text-amber-300 truncate">
                  Install JWAS App
                </h4>
                <span className="text-[9px] bg-amber-400/20 text-amber-200 border border-amber-400/30 px-1.5 py-0.5 rounded uppercase font-semibold">
                  Official
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 line-clamp-1 mt-0.5">
                Install to home screen for faster shopping & persistent 1-time login.
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1.5 text-neutral-400 hover:text-white transition rounded-full hover:bg-white/10"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 pt-2.5 border-t border-white/10">
            <button
              onClick={handleInstallClick}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-neutral-950 hover:brightness-110 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg active:scale-95"
            >
              <Download className="w-4 h-4" /> Install App
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition rounded-xl hover:bg-white/5"
            >
              Not now
            </button>
          </div>
        </aside>
      )}

      {/* Interactive Mobile Installation Guide Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#021834] border border-amber-400/30 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white transition rounded-full hover:bg-white/10"
              aria-label="Close guide"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
                  Add JWAS to Home Screen
                </h3>
                <p className="text-xs text-neutral-400">Easy 2-step installation</p>
              </div>
            </div>

            {isIos ? (
              <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10 text-xs">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-neutral-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-neutral-200 leading-relaxed">
                    Tap the <strong className="text-amber-300 inline-flex items-center gap-1 font-bold">Share <Share className="w-3.5 h-3.5 inline text-amber-300" /></strong> button at the bottom of Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-neutral-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-neutral-200 leading-relaxed">
                    Scroll down and select <strong className="text-amber-300 inline-flex items-center gap-1 font-bold">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline text-amber-300" /></strong>, then tap <strong className="text-white font-bold">Add</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10 text-xs">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-neutral-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-neutral-200 leading-relaxed">
                    Tap the browser menu <strong className="text-amber-300 font-bold">(⋮ three dots)</strong> in the top-right corner.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-neutral-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-neutral-200 leading-relaxed">
                    Tap <strong className="text-amber-300 font-bold">Install app</strong> or <strong className="text-amber-300 font-bold">Add to Home screen</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={markAsInstalled}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 font-black uppercase tracking-wider text-xs py-2.5 px-4 rounded-xl shadow-lg hover:brightness-110 transition"
              >
                <CheckCircle2 className="w-4 h-4" /> I&apos;ve Installed It
              </button>
              <button
                onClick={() => setShowInstructions(false)}
                className="py-2.5 px-4 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
