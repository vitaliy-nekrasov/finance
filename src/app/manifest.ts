import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Семейные финансы',
    short_name: 'Финансы',
    display: 'standalone',
    background_color: '#07070d',
    theme_color: '#07070d',
    start_url: '/',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
