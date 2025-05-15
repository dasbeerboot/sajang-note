'use client';

import dynamic from 'next/dynamic';

// 카카오톡 채널 채팅 컴포넌트를 클라이언트 사이드에서만 동적으로 로드
const KakaoChannelChat = dynamic(
  () => import('@/components/KakaoChannelChat'),
  { ssr: false }
);

export default function KakaoChannelChatWrapper() {
  return (
    <KakaoChannelChat 
      channelPublicId="_xkhKBn"
      title="consult"
      size="small"
      color="yellow"
      shape="pc"
    />
  );
} 