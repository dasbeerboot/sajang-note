import mixpanel from 'mixpanel-browser';

// 프로젝트 토큰 - 환경 변수에서 가져오기
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '';

// 배포 환경인지 확인
const isProd = process.env.NODE_ENV === 'production';

// 배포 환경에서만 믹스패널 초기화
if (isProd && MIXPANEL_TOKEN) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: false,
    track_pageview: true,
    persistence: 'localStorage',
  });
}

// 사용자 식별 함수
export const identify = (userId: string) => {
  if (isProd) {
    mixpanel.identify(userId);
  }
};

// 사용자 정보 설정 함수
export const setUserProfile = (properties: Record<string, unknown>) => {
  if (isProd) {
    mixpanel.people.set(properties);
  }
};

// 이벤트 추적 함수
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  if (isProd) {
    mixpanel.track(eventName, properties);
  } else {
    // 개발 환경에서는 콘솔에 로그만 출력
    console.info(`[Analytics] ${eventName}`, properties);
  }
};

// 주요 이벤트 이름 상수 정의
export const Events = {
  // 인증 관련 이벤트
  SIGN_UP: 'SignUp',
  SIGN_IN: 'SignIn',
  SIGN_OUT: 'SignOut',
  
  // 매장 관련 이벤트
  ADD_PLACE: 'AddPlace',
  VIEW_PLACE: 'ViewPlace',
  DELETE_PLACE: 'DeletePlace',
  
  // AI 카피 관련 이벤트
  GENERATE_COPY: 'GenerateCopy',
  SAVE_COPY: 'SaveCopy',
  VIEW_COPY: 'ViewCopy',
  
  // 구독 관련 이벤트
  VIEW_SUBSCRIPTION_PAGE: 'ViewSubscriptionPage',
  START_SUBSCRIPTION: 'StartSubscription',
  COMPLETE_SUBSCRIPTION: 'CompleteSubscription',
  UPGRADE_SUBSCRIPTION: 'UpgradeSubscription',
  CANCEL_SUBSCRIPTION: 'CancelSubscription',
  
  // 크레딧 관련 이벤트
  DEDUCT_CREDITS: 'DeductCredits',
  PURCHASE_CREDITS: 'PurchaseCredits',
  
  // 기타 이벤트
  PAGE_VIEW: 'PageView',
  SEARCH: 'Search',
  ERROR: 'Error',
};

// 페이지 뷰 추적 함수
export const trackPageView = (pageName: string, properties?: Record<string, unknown>) => {
  if (isProd) {
    mixpanel.track(Events.PAGE_VIEW, {
      page: pageName,
      ...(properties || {}),
    });
  } else {
    console.info(`[Analytics] PageView: ${pageName}`, properties);
  }
};

// 네임드 익스포트를 기본 내보내기로 설정
const analytics = {
  identify,
  setUserProfile,
  trackEvent,
  trackPageView,
  Events,
};

export default analytics; 