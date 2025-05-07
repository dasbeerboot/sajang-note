import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthStatus from "@/components/AuthStatus";

export const metadata: Metadata = {
  title: "사장노트 - 마케팅 콘텐츠 자동 생성",
  description: "플레이스 URL 하나로 당근, 파워링크, 쓰레드까지 모든 마케팅 콘텐츠 자동 생성",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="antialiased font-sans">
        <AuthProvider>
          <header className="text-white p-4" style={{ background: 'linear-gradient(to right, rgba(50, 56, 251, 0.8) 70%, rgba(240, 90, 100, 0.7) 100%)' }}>
            <div className="container mx-auto flex justify-between items-center">
              <Link href="/" className="text-xl font-bold">사장노트</Link>
              <div className="flex items-center gap-4">
                <AuthStatus />
                <ThemeToggle />
              </div>
            </div>
          </header>
          
          <div className="min-h-screen bg-base-100">
            {children}
          </div>
          
          <footer className="bg-base-200 py-4 text-center">
            <div className="container mx-auto">
              <p className="text-sm text-gray-500">© 2024 사장노트. 모든 권리 보유.</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
