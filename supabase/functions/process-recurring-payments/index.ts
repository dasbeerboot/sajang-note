import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NicePayResponse {
  success: boolean;
  resultCode?: string;
  resultMsg?: string;
  orderId?: string;
  errorMsg?: string;
  [key: string]: any;
}

interface SubscriptionData {
  subscription_id: string;
  user_id: string;
  profile_id: string;
  billing_id: string;
  plan_id: string;
  plan_interval: string;
  plan_price: number;
  current_period_end: string;
}

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 인증 확인
    const authHeader = req.headers.get('authorization');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: '인증 헤더가 없거나 올바르지 않습니다' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // JWT 토큰 검증은 Supabase가 자동으로 처리하므로 여기서는 헤더 형식만 확인합니다
    
    // Supabase 클라이언트 생성
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // 나이스페이 API 키 설정
    const NICE_PAY_CLIENT_ID = Deno.env.get('NICEPAY_CLIENT_ID') || '';
    const NICE_PAY_SECRET_KEY = Deno.env.get('NICEPAY_SECRET_KEY') || '';
    
    // 결제가 필요한 구독 목록 조회
    const { data: subscriptions, error } = await supabase.rpc('process_recurring_payments');
    
    if (error) throw error;
    
    const results = {
      processed: 0,
      failed: 0,
      details: [] as Array<{
        subscription_id: string;
        status: string;
        message: string;
      }>
    };
    
    // 각 구독에 대해 결제 처리
    for (const sub of subscriptions as SubscriptionData[]) {
      try {
        // 나이스페이 API 호출하여 결제 처리
        const orderId = `RECURRING_${sub.subscription_id}_${Date.now()}`;
        const paymentResult = await processRecurringPayment({
          clientId: NICE_PAY_CLIENT_ID,
          secretKey: NICE_PAY_SECRET_KEY,
          billingKey: sub.billing_id,
          orderId: orderId,
          amount: sub.plan_price,
          goodsName: `사장노트 ${sub.plan_interval === 'monthly' ? '월간' : '연간'} 구독`,
          customerName: sub.user_id
        });
        
        if (paymentResult.success) {
          // 결제 성공 시 구독 기간 연장
          const interval = sub.plan_interval === 'monthly' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000;
          const newPeriodEnd = new Date(new Date(sub.current_period_end).getTime() + interval);
          
          // 구독 정보 업데이트
          await supabase
            .from('subscriptions')
            .update({
              current_period_start: sub.current_period_end,
              current_period_end: newPeriodEnd.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.subscription_id);
          
          // 프로필 정보 업데이트
          await supabase
            .from('profiles')
            .update({
              subscription_end_date: newPeriodEnd.toISOString()
            })
            .eq('id', sub.profile_id);
          
          // 결제 내역 추가
          await supabase.from('payment_history').insert({
            subscription_id: sub.subscription_id,
            user_id: sub.user_id,
            order_id: paymentResult.orderId,
            amount: sub.plan_price,
            status: 'paid',
            payment_method: 'card',
            payment_details: paymentResult
          });
          
          results.processed++;
          results.details.push({
            subscription_id: sub.subscription_id,
            status: 'success',
            message: '결제 성공'
          });
        } else {
          // 결제 실패 시 기록
          await supabase.from('payment_history').insert({
            subscription_id: sub.subscription_id,
            user_id: sub.user_id,
            order_id: paymentResult.orderId || `FAILED_${Date.now()}`,
            amount: sub.plan_price,
            status: 'failed',
            payment_method: 'card',
            payment_details: paymentResult
          });
          
          results.failed++;
          results.details.push({
            subscription_id: sub.subscription_id,
            status: 'failed',
            message: paymentResult.errorMsg || '결제 실패'
          });
        }
      } catch (err: any) {
        results.failed++;
        results.details.push({
          subscription_id: sub.subscription_id,
          status: 'error',
          message: err.message || '알 수 없는 오류'
        });
      }
    }
    
    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || '알 수 없는 오류' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// sha256 해시 함수 구현
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // ArrayBuffer를 16진수 문자열로 변환
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 나이스페이 결제 처리 함수
async function processRecurringPayment({
  clientId,
  secretKey,
  billingKey,
  orderId,
  amount,
  goodsName,
  customerName
}: {
  clientId: string;
  secretKey: string;
  billingKey: string;
  orderId: string;
  amount: number;
  goodsName: string;
  customerName: string;
}): Promise<NicePayResponse> {
  try {
    // 나이스페이 API 엔드포인트 (빌키승인 API)
    const apiUrl = `https://api.nicepay.co.kr/v1/subscribe/${billingKey}/payments`;
    
    // EDI 날짜 생성 (ISO 8601 형식)
    const ediDate = new Date().toISOString();
    
    // SignData 생성 - 빌키승인 API의 경우 orderId + bid + ediDate + SecretKey 형식으로 생성
    const signData = await sha256(orderId + billingKey + ediDate + secretKey);
    
    // 인증 정보 확인
    console.log('인증 정보 확인 (일부만 표시):', {
      clientId: clientId ? clientId.substring(0, 4) + '...' : '없음',
      secretKey: secretKey ? secretKey.substring(0, 4) + '...' : '없음',
      length: {
        clientId: clientId?.length || 0,
        secretKey: secretKey?.length || 0
      }
    });
    
    // 인증 헤더 생성 (Deno에서 Base64 인코딩)
    const authString = `${clientId}:${secretKey}`;
    const base64Encoded = btoa(authString);
    const authHeader = `Basic ${base64Encoded}`;
    
    // 요청 데이터 준비
    const requestData = {
      orderId: orderId,
      amount: amount,
      goodsName: goodsName,
      buyerName: customerName,
      cardQuota: '00', // 일시불 결제
      useShopInterest: false, // 상점분담무이자 사용여부 (현재 false만 사용 가능)
      ediDate: ediDate,
      signData: signData,
      returnCharSet: 'utf-8'
    };
    
    console.log('API 요청 정보:', { 
      apiUrl: apiUrl.replace(billingKey, billingKey.substring(0, 4) + '...'), // 보안을 위해 일부만 로깅
      orderId, 
      amount
    });
    
    // fetch API를 사용한 요청
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(requestData)
    });
    
    // 응답 상태 로깅
    console.log('API 응답 상태:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 오류 응답:', errorText);
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('API 응답 결과:', result.resultCode, result.resultMsg);
    
    return {
      success: result.resultCode === '0000',
      orderId: orderId,
      resultCode: result.resultCode,
      resultMsg: result.resultMsg,
      ...result
    };
  } catch (error: any) {
    console.error('나이스페이 API 호출 중 오류:', error);
    return {
      success: false,
      orderId: orderId,
      errorMsg: error.message || '알 수 없는 오류'
    };
  }
} 