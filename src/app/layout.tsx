import './globals.css';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthModalProvider } from '@/contexts/AuthModalContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoginModal from '@/components/LoginModal';
import KakaoChannelChatWrapper from '@/components/KakaoChannelChatWrapper';

// Pretendard 폰트 로드
const pretendard = localFont({
  src: [
    {
      path: '../fonts/Pretendard-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/Pretendard-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/Pretendard-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../fonts/Pretendard-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-pretendard',
});

export const metadata: Metadata = {
  title: '사장노트 - AI 마케팅 도우미',
  description: '네이버, 당근마켓, 인스타, 쓰레드 등 자영업 사장님을 위한 AI 마케팅 도우미',
  icons: {
    icon: '/favicon.ico',
  },
  keywords: '네이버, 블로그, 인스타그램, 당근마켓, 메타, 쓰레드, 광고, 홍보, 마케팅 자동화 솔루션',
  metadataBase: new URL('https://sajang-note.vercel.app'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://sajang-note.vercel.app',
    title: '사장노트 - 자영업자를 위한 AI 마케팅 도우미',
    description: '네이버, 당근마켓, 인스타, 쓰레드 등 자영업 사장님을 위한 AI 마케팅 도우미',
    siteName: '사장노트',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '사장노트 - AI 마케팅 도우미',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '사장노트 - AI 마케팅 도우미',
    description: '네이버, 당근마켓, 인스타, 쓰레드 등 자영업 사장님을 위한 AI 마케팅 도우미',
    images: ['/og-image.png'],
    creator: '@juwon_chun',
  },
  verification: {
    google: 'Sc6WWxs7gLwc0WmXUgXwmdW1VPDmwTcwTQSGuHHY_GY',
    other: {
      'naver-site-verification': '1cea7a491ce0f21d3e280c36fb0b62fa938f2456',
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning >
      <body className={pretendard.className}>
        <ToastProvider>
          <ThemeProvider>
            <AuthProvider>
              <AuthModalProvider>
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-grow">{children}</main>
                  <Footer />
                  <LoginModal modalId="global_login_modal" />
                  
                  {/* 카카오톡 채널 채팅 버튼 */}
                  <KakaoChannelChatWrapper />
                </div>
              </AuthModalProvider>
            </AuthProvider>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
