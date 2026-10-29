import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JWAS — Luxury E-Commerce',
    short_name: 'JWAS',
    description: 'Exclusive dynamic luxury fashion, heritage silk sarees, and high-end lifestyle collections.',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#022e53',
    theme_color: '#022e53',
    categories: ['shopping', 'lifestyle', 'fashion'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Shop Collection',
        short_name: 'Shop',
        description: 'Browse our full product catalogue',
        url: '/shop',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Shopping Bag',
        short_name: 'Bag',
        description: 'View items in your bag',
        url: '/cart',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Saved Wishlist',
        short_name: 'Wishlist',
        description: 'View saved items',
        url: '/wishlist',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
