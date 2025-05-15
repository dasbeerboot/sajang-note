/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    domains: ['k.kakaocdn.net'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'k.kakaocdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'k.kakaocdn.net',
        port: '',
        pathname: '/**',
      },
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
  // App Router 사용 시 Pages Router 관련 설정
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // _document 관련 에러 방지
  typescript: {
    // !! WARN !!
    // Next.js가 내부적으로 사용하는 _document 페이지 요청 문제를 무시합니다.
    ignoreBuildErrors: false, // 필요한 경우에만 true로 설정
  },
};

module.exports = nextConfig; 