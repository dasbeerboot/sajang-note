'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose?: () => void;
}

export default function Toast({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // 토스트 타입에 따른 스타일 클래스
  const getTypeStyle = () => {
    switch (type) {
      case 'success':
        return 'bg-[#dcfce7] text-[#166534]';
      case 'error':
        return 'bg-[#fee2e2] text-[#b91c1c]';
      case 'info':
        return 'bg-[#e0f2fe] text-[#0369a1]';
      case 'warning':
        return 'bg-[#fef3c7] text-[#92400e]';
      default:
        return 'bg-[#dcfce7] text-[#166534]';
    }
  };

  if (!visible) return null;

  return (
    <div className={`px-6 py-3 rounded-lg text-sm shadow-lg mb-2 ${getTypeStyle()} animate-fadeIn pointer-events-auto`}>
      <span>{message}</span>
    </div>
  );
} 