'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useRef, RefObject, useEffect } from 'react';

interface AuthModalContextType {
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  authModalRef: RefObject<HTMLDialogElement | null>; // LoginModal에 연결할 ref
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // 실제 모달 open 상태와는 별개로, 열려는 의도를 나타낼 수 있음
  const authModalRef = useRef<HTMLDialogElement | null>(null);

  const openAuthModal = useCallback(() => {
    console.log('[AuthModalContext] openAuthModal called');
    authModalRef.current?.showModal();
    setIsAuthModalOpen(true); // 상태 동기화
  }, []);

  const closeAuthModal = useCallback(() => {
    console.log('[AuthModalContext] closeAuthModal called');
    authModalRef.current?.close();
    setIsAuthModalOpen(false); // 상태 동기화
  }, []);

  // dialog 요소의 'close' 이벤트를 감지하여 isAuthModalOpen 상태를 동기화합니다.
  useEffect(() => {
    const modalElement = authModalRef.current;
    const handleDialogCloseEvent = () => {
      console.log('[AuthModalContext] Dialog close event detected');
      setIsAuthModalOpen(false);
    };

    if (modalElement) {
      modalElement.addEventListener('close', handleDialogCloseEvent);
    }

    return () => {
      if (modalElement) {
        modalElement.removeEventListener('close', handleDialogCloseEvent);
      }
    };
  }, [authModalRef]); // authModalRef가 변경될 때마다 (실제로는 거의 없음) effect 재실행


  const value = {
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    authModalRef // LoginModal에서 이 ref를 사용하도록 전달
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
} 