import mixpanel from 'mixpanel-browser';

// 프로젝트 토큰 - 환경 변수에서 가져오기
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '';

// 배포 환경인지 확인
const isProd = process.env.NODE_ENV === 'production';

// 브라우저 환경인지 확인
const isBrowser = typeof window !== 'undefined';

// 사용자 식별 상태 추적을 위한 변수들
let currentIdentifiedUser: string | null = null;
let hasSetProfile: boolean = false;

// mixpanel 초기화 상태 추적
let isMixpanelInitialized = false;

// 배포 환경의 브라우저에서만 믹스패널 초기화
if (isBrowser && isProd && MIXPANEL_TOKEN) {
  try {
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: false,
      track_pageview: true,
      persistence: 'localStorage',
    });
    isMixpanelInitialized = true;
    console.info('[Analytics] Mixpanel initialized successfully');
  } catch (error) {
    console.error('[Analytics] Failed to initialize Mixpanel:', error);
    isMixpanelInitialized = false;
  }
}

// 안전한 믹스패널 호출 래퍼
const safeMixpanel = {
  identify: (id: string) => {
    if (isBrowser && isMixpanelInitialized) {
      try {
        mixpanel.identify(id);
      } catch (e) {
        console.error('[Analytics] Error in mixpanel.identify:', e);
      }
    }
  },
  track: (event: string, props?: Record<string, unknown>) => {
    if (isBrowser && isMixpanelInitialized) {
      try {
        mixpanel.track(event, props);
      } catch (e) {
        console.error(`[Analytics] Error in mixpanel.track for event ${event}:`, e);
      }
    }
  },
  people: {
    set: (props: Record<string, unknown>) => {
      if (isBrowser && isMixpanelInitialized) {
        try {
          mixpanel.people.set(props);
        } catch (e) {
          console.error('[Analytics] Error in mixpanel.people.set:', e);
        }
      }
    }
  }
};

// 사용자 식별 함수
export const identify = (userId: string) => {
  if (!userId) return;
  
  // 이미 식별된 사용자라면 스킵
  if (currentIdentifiedUser === userId) {
    return;
  }
  
  if (isProd && isBrowser) {
    safeMixpanel.identify(userId);
    // 식별 상태 업데이트
    currentIdentifiedUser = userId;
    if (isBrowser) {
      console.info(`[Analytics] Identify user: ${userId} (first time this session)`);
    }
  } else if (isBrowser) {
    console.info(`[Analytics] Identify user: ${userId}`);
    // 개발 환경에서도 상태 추적
    currentIdentifiedUser = userId;
  }
};

// 사용자 정보 설정 함수
export const setUserProfile = (properties: Record<string, unknown>) => {
  if (!properties) return;
  
  // 프로필이 이미 설정되었다면 스킵
  if (hasSetProfile && currentIdentifiedUser) {
    return;
  }
  
  if (isProd && isBrowser) {
    safeMixpanel.people.set(properties);
    // 프로필 설정 상태 업데이트
    hasSetProfile = true;
    if (isBrowser) {
      console.info('[Analytics] Set user profile (first time this session)');
    }
  } else if (isBrowser) {
    console.info('[Analytics] Set user profile:', properties);
    // 개발 환경에서도 상태 추적
    hasSetProfile = true;
  }
};

// 사용자 식별 초기화 (로그아웃용)
export const resetIdentity = () => {
  currentIdentifiedUser = null;
  hasSetProfile = false;
  
  if (isBrowser) {
    console.info('[Analytics] Reset user identity');
  }
};

// 이벤트 추적 함수
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  if (!eventName) return;
  
  if (isProd && isBrowser) {
    safeMixpanel.track(eventName, properties || {});
  } else if (isBrowser) {
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
  if (!pageName) return;
  
  if (isProd && isBrowser) {
    safeMixpanel.track(Events.PAGE_VIEW, {
      page: pageName,
      ...(properties || {}),
    });
  } else if (isBrowser) {
    console.info(`[Analytics] PageView: ${pageName}`, properties);
  }
};

// 네임드 익스포트를 기본 내보내기로 설정
const analytics = {
  identify,
  setUserProfile,
  resetIdentity,
  trackEvent,
  trackPageView,
  Events,
};

export default analytics; 