import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
          <Header />
          
          <div className="min-h-screen bg-base-100">
            {children}
        </div>
          
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
