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
  description: '당근마켓, 네이버 플레이스, 쓰레드 등 자영업자를 위한 AI 마케팅 도우미',
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
