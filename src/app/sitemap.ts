import { createClient } from '@supabase/supabase-js';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sajang-note.vercel.app';
  
  // Supabase 클라이언트 생성
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // 정적 경로 설정
  const staticRoutes = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  // 동적 경로를 위한 데이터베이스 조회
  try {
    // 공개된 페이지가 있다면 추가
    // 주의: 여기에서는 일반적으로 공개된 페이지만 포함해야 합니다
    // const { data: publicPages } = await supabase
    //   .from('public_pages')
    //   .select('slug, updated_at')
    //   .eq('is_published', true);
    
    // const dynamicRoutes = publicPages?.map((page) => ({
    //   url: `${baseUrl}/${page.slug}`,
    //   lastModified: new Date(page.updated_at),
    //   changeFrequency: 'weekly' as const,
    //   priority: 0.7,
    // })) || [];
    
    // 주석 해제 후 실제 공개된 페이지 데이터 쿼리로 대체
    
    // return [...staticRoutes, ...dynamicRoutes];
  } catch (error) {
    console.error('사이트맵 생성 중 오류 발생:', error);
  }

  return staticRoutes;
} 