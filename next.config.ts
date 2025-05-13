import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        // 기존 HTTPS 설정
        protocol: 'https',
        hostname: 'k.kakaocdn.net',
        port: '',
        pathname: '/**',
      },
      // === 추가 시작 ===
      {
        protocol: 'http', // HTTP 프로토콜
        hostname: 'k.kakaocdn.net', // 동일 호스트
        port: '',
        pathname: '/**',
      },
      // === 추가 끝 ===
      {
        protocol: 'https',
        hostname: 'search.pstatic.net',
        port: '',
        pathname: '/common/**',
      },
      {
        protocol: 'https',
        hostname: 'ldb-phinf.pstatic.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pup-review-phinf.pstatic.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'daisyui.com',
        port: '',
        pathname: '/images/stock/**',
      },
    ],
  },
};

export default nextConfig;
