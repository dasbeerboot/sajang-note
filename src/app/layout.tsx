import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

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
    google: 'google-site-verification-code', // 실제 Google 사이트 인증 코드로 대체해야 합니다
    other: {
      'naver-site-verification': 'naver-site-verification-code', // 실제 Naver 사이트 인증 코드로 대체해야 합니다
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <ToastProvider>
          <ThemeProvider>
            <AuthProvider>
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
            </AuthProvider>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
