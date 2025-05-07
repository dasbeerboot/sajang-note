'use client';

import { RefObject } from 'react';
import AuthButtons from './AuthButtons';

interface LoginModalProps {
  modalId: string;
  modalRef?: RefObject<HTMLDialogElement | null>;
}

export default function LoginModal({ modalId, modalRef }: LoginModalProps) {
  return (
    <dialog id={modalId} className="modal" ref={modalRef}>
      <div className="modal-box max-w-md">
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <h3 className="font-bold text-lg mb-4 text-center">로그인이 필요합니다</h3>
        <p className="text-center mb-6">
          사장노트의 모든 기능을 이용하려면 로그인이 필요합니다.
          소셜 계정으로 간편하게 로그인해주세요.
        </p>
        
        <AuthButtons />
      </div>
      
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
} 