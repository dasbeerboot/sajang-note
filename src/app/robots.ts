import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sajang-note.vercel.app';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',         // API 경로 차단
        '/auth/',        // 인증 관련 경로 차단
        '/subscription/checkout/', // 결제 페이지 차단
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
} 