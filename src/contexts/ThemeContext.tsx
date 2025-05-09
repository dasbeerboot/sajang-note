'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ThemeType = 'light' | 'dark';

type ThemeContextType = {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>('light');

  // 초기 테마 설정
  useEffect(() => {
    // 로컬 스토리지에서 테마 가져오기
    const storedTheme = localStorage.getItem('theme') as ThemeType | null;
    // 시스템 기본 테마 확인
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    // 저장된 테마가 있으면 사용, 없으면 시스템 테마 사용
    const initialTheme = storedTheme || systemTheme;
    setTheme(initialTheme);
    
    // HTML 요소에 data-theme 속성 설정
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  // 테마 변경 함수
  const changeTheme = (newTheme: ThemeType) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // 테마 토글 함수
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    changeTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 