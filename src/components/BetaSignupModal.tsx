'use client';

import { RefObject } from 'react';
import BetaSignupForm from './BetaSignupForm';

interface BetaSignupModalProps {
  modalId: string;
  modalRef?: RefObject<HTMLDialogElement | null>;
}

export default function BetaSignupModal({ modalId, modalRef }: BetaSignupModalProps) {
  const handleSubmit = (data: { name: string; phone: string; email: string; privacyAgreement: boolean }) => {
    console.log('Form submitted:', data);
    // TODO: Supabase leads 테이블 INSERT & Google Sheets 'Leads' 시트 Append
    if (modalRef?.current) {
      modalRef.current.close();
    } else {
      document.getElementById(modalId)?.classList.remove('modal-open');
    }
    alert('알림 신청이 완료되었습니다. 감사합니다!');
  };

  return (
    <dialog id={modalId} className="modal" ref={modalRef}>
      <div className="modal-box max-w-md">
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <h3 className="font-bold text-lg mb-4 text-center">🚀 열심히 개발 중이에요 🚀</h3>
        <div className='w-full flex justify-center'>
          <p className="mb-4">
            사장노트는 5월 초 정식 오픈 예정입니다. <br/>
            관심 가져주심에 감사한 마음을 담아<br/>
            아래 폼을 작성해주신 분들께는 유료버전 출시 후 
            <span className="text-primary font-bold block">3개월 무료 이용권을 보내드릴게요 💌</span>
          </p>
        </div>
        
        <BetaSignupForm onSubmit={handleSubmit} />
      </div>
      
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
} 