import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "사장노트 - 네이버 플레이스 1분 진단",
  description: "네이버 플레이스 순위, 1분 진단. 키워드 5개·경쟁사 5곳까지 무료 분석",
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
        <header className="bg-gradient-to-r from-primary from-50% to-secondary to-100% text-white p-3">
        {/* <header className="bg-primary text-white p-4"> */}
          <div className="container mx-auto flex justify-between items-center">
            <div className="text-xl font-bold">사장노트</div>
            <ThemeToggle />
          </div>
        </header>
        
        <div className="min-h-screen bg-base-100">
          {children}
        </div>
        
        <footer className="bg-base-200 py-4 text-center">
          <div className="container mx-auto">
            <p className="text-sm text-gray-500">© 2025 프로젝트 원제로. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
