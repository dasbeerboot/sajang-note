'use client';

import { useEffect, useRef } from 'react';

// Kakao SDK 타입 정의
interface KakaoChannelButtonOptions {
  container: HTMLElement;
  channelPublicId: string;
  size?: 'small' | 'large';
  color?: 'yellow' | 'mono';
  shape?: 'pc' | 'mobile';
  title?: string;
  [key: string]: unknown;
}

interface KakaoSDK {
  Channel: {
    createChatButton: (options: KakaoChannelButtonOptions) => void;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

declare global {
  interface Window {
    Kakao?: KakaoSDK;
    kakaoAsyncInit?: () => void;
  }
}

interface KakaoChannelChatProps {
  channelPublicId: string;
  size?: 'small' | 'large';
  color?: 'yellow' | 'mono';
  shape?: 'pc' | 'mobile';
  title?: string;
  className?: string;
}

export default function KakaoChannelChat({
  channelPublicId = '_xkhKBn',
  size = 'small',
  color = 'yellow',
  shape = 'pc',
  title = 'consult',
  className = '',
}: KakaoChannelChatProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef<boolean>(false);
  const buttonCreated = useRef<boolean>(false);
  const buttonId = `kakao-channel-chat-button-${channelPublicId}`;
  
  useEffect(() => {
    // 이미 버튼이 생성되었는지 확인
    if (document.getElementById(buttonId)) {
      buttonCreated.current = true;
      return; // 이미 버튼이 존재하면 중복 생성하지 않음
    }
    
    // 스크립트가 이미 로드되었는지 확인
    if (document.getElementById('kakao-js-sdk')) {
      scriptLoaded.current = true;
    }

    // 카카오 SDK 초기화 함수
    window.kakaoAsyncInit = function() {
      if (window.Kakao && containerRef.current && !buttonCreated.current) {
        // 버튼 생성 전 컨테이너에 ID 부여
        containerRef.current.id = buttonId;
        
        window.Kakao.Channel.createChatButton({
          container: containerRef.current,
          channelPublicId,
          size,
          color,
          shape,
          title
        });
        
        buttonCreated.current = true;
      }
    };

    // 스크립트가 아직 로드되지 않았다면 로드
    if (!scriptLoaded.current) {
      const script = document.createElement('script');
      script.id = 'kakao-js-sdk';
      script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.channel.min.js';
      script.integrity = 'sha384-8oNFBbAHWVovcMLgR+mLbxqwoucixezSAzniBcjnEoumhfIbMIg4DrVsoiPEtlnt';
      script.crossOrigin = 'anonymous';
      script.async = true;
      
      script.onload = () => {
        scriptLoaded.current = true;
        // 스크립트 로드 후 초기화 함수 실행
        if (window.kakaoAsyncInit) {
          window.kakaoAsyncInit();
        }
      };
      
      document.body.appendChild(script);
    } else if (window.Kakao && containerRef.current && !buttonCreated.current) {
      // 이미 스크립트가 로드되었다면 버튼 생성
      // 버튼 생성 전 컨테이너에 ID 부여
      containerRef.current.id = buttonId;
      
      window.Kakao.Channel.createChatButton({
        container: containerRef.current,
        channelPublicId,
        size,
        color,
        shape,
        title
      });
      
      buttonCreated.current = true;
    }
    
    return () => {
      // 컴포넌트 언마운트 시 초기화 함수 제거
      window.kakaoAsyncInit = undefined;
    };
  }, [channelPublicId, size, color, shape, title, buttonId]);

  return (
    <div 
      ref={containerRef}
      className={`fixed bottom-6 right-6 z-50 ${className}`}
      data-channel-public-id={channelPublicId}
      data-title={title}
      data-size={size}
      data-color={color}
      data-shape={shape}
      data-support-multiple-densities="true"
    ></div>
  );
} 