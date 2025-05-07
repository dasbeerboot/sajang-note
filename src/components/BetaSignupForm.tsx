'use client';

import { useState } from 'react';

interface BetaSignupFormProps {
  onSubmit: (data: { name: string; phone: string; email: string; privacyAgreement: boolean }) => void;
}

export default function BetaSignupForm({ onSubmit }: BetaSignupFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    privacyAgreement: false,
  });
  
  const [formErrors, setFormErrors] = useState({
    name: '',
    phone: '',
    email: '',
    privacyAgreement: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData({
      ...formData,
      [name]: newValue,
    });
    
    // 모든 필드 유효성 검사
    validateAllFields({
      ...formData,
      [name]: newValue,
    });
  };

  const validateAllFields = (data: { name: string; phone: string; email: string; privacyAgreement: boolean }) => {
    const errors = {
      name: '',
      phone: '',
      email: '',
      privacyAgreement: '',
    };
    
    // 이름 검사
    if (!data.name.trim()) {
      errors.name = '이름을 입력해주세요';
    }
    
    // 연락처 검사
    if (!data.phone.trim()) {
      errors.phone = '연락처를 입력해주세요';
    } else if (!/^[0-9]{3}-[0-9]{3,4}-[0-9]{4}$/.test(data.phone)) {
      errors.phone = '올바른 연락처 형식이 아닙니다 (예: 010-1234-5678)';
    }
    
    // 이메일 검사
    if (!data.email.trim()) {
      errors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = '올바른 이메일 형식이 아닙니다';
    }
    
    // 개인정보 수집 동의 검사
    if (!data.privacyAgreement) {
      errors.privacyAgreement = '개인정보 수집 및 이용에 동의해주세요';
    }
    
    setFormErrors(errors);
    
    // 모든 필드가 유효한지 검사
    return !errors.name && !errors.phone && !errors.email && !errors.privacyAgreement;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 제출 전 모든 필드 유효성 검사
    const isValid = validateAllFields(formData);
    
    // 모든 필드가 유효하면 폼 제출
    if (isValid) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="border border-gray-300 p-4 rounded-lg mb-4">
        <legend className="text-sm font-medium px-2">연락처 정보</legend>
        
        <div className="form-control mb-2">
          <label className="label">
            <span className="label-text">이름</span>
          </label>
          <input 
            type="text" 
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="홍길동" 
            className={`input input-bordered w-full ${formErrors.name ? 'input-error' : ''}`}
          />
          {formErrors.name && <span className="text-error text-xs mt-1 ml-2">{formErrors.name}</span>}
        </div>
        
        <div className="form-control mb-2">
          <label className="label">
            <span className="label-text">연락처</span>
          </label>
          <input 
            type="tel" 
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="010-1234-5678" 
            className={`input input-bordered w-full ${formErrors.phone ? 'input-error' : ''}`}
          />
          {formErrors.phone && <span className="text-error text-xs mt-1 ml-2">{formErrors.phone}</span>}
        </div>
        
        <div className="form-control mb-2">
          <label className="label">
            <span className="label-text">이메일</span>
          </label>
          <input 
            type="email" 
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="example@email.com" 
            className={`input input-bordered w-full ${formErrors.email ? 'input-error' : ''}`}
          />
          {formErrors.email && <span className="text-error text-xs mt-1 ml-2">{formErrors.email}</span>}
        </div>
        
        <div className="form-control mt-4">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              name="privacyAgreement"
              checked={formData.privacyAgreement}
              onChange={handleInputChange}
              className={`checkbox checkbox-primary checkbox-xs ${formErrors.privacyAgreement ? 'checkbox-error' : ''}`} 
            />
            <label className="label cursor-pointer ml-2">
              <span className="label-tex text-xs">개인정보 수집 및 이용에 동의합니다</span>
            </label>
          </div>
          {formErrors.privacyAgreement && <span className="text-error text-xs mt-1 ml-6">{formErrors.privacyAgreement}</span>}
        </div>
      </fieldset>
      
      <div className="modal-action">
        <button type="submit" className="btn btn-primary w-full">알림 신청하기</button>
      </div>
    </form>
  );
} 