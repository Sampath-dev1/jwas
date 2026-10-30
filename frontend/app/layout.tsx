import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PwaRegister from "@/components/PwaRegister";
import AuthGuard from "@/components/AuthGuard";

export const viewport: Viewport = {
  themeColor: "#022e53",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "JWAS | Luxury Clothing & Lifestyle Essentials",
  description: "Official JWAS online storefront. Engineered tailoring, premium fabrics, and real-time inventory management.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JWAS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-white text-neutral-900 antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AuthGuard>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthGuard>
        <PwaRegister />
      </body>
    </html>
  );
}
