import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import crypto from 'crypto';

// SHA-256 해시 함수
function sha256(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function POST(request: Request) {
  try {
    // Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 요청 헤더에서 인증 토큰 가져오기
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // 토큰으로 사용자 정보 가져오기
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError || !user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // 환경 변수 확인
    const clientId = process.env.NICEPAY_CLIENT_ID;
    const secretKey = process.env.NICEPAY_SECRET_KEY;

    if (!clientId || !secretKey) {
      return NextResponse.json({ error: '결제 설정이 올바르지 않습니다.' }, { status: 500 });
    }

    // 사용자 프로필 정보 가져오기
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('billing_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData?.billing_id) {
      return NextResponse.json(
        { error: '등록된 카드 정보가 없습니다. 먼저 카드를 등록해주세요.' },
        { status: 400 }
      );
    }

    // 요청 데이터 파싱
    const requestData = await request.json();
    const { planId } = requestData;

    if (!planId) {
      return NextResponse.json({ error: '구독 플랜을 선택해주세요.' }, { status: 400 });
    }

    // 구독 플랜 정보 가져오기
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !planData) {
      return NextResponse.json({ error: '유효하지 않은 구독 플랜입니다.' }, { status: 400 });
    }

    // 주문 ID 생성 (현재 시간 기준)
    const orderId = `SUB_${user.id.substring(0, 8)}_${Date.now()}`;

    // EDI 날짜 생성 (ISO 8601 형식)
    const ediDate = new Date().toISOString();

    // 결제 금액
    const amount = planData.price;

    // SignData 생성 - 빌키승인 API의 경우 orderId + bid + ediDate + SecretKey 형식으로 생성
    const signData = sha256(orderId + profileData.billing_id + ediDate + secretKey);

    // Basic 인증을 위한 Base64 인코딩
    const authString = `${clientId}:${secretKey}`;
    const basicAuth = Buffer.from(authString).toString('base64');

    // 요청 데이터 구성
    const nicePayRequestData = {
      orderId: orderId,
      amount: amount,
      goodsName: `사장노트 ${planData.name} 구독`,
      buyerName: user.user_metadata?.full_name || '사용자',
      buyerEmail: user.email,
      buyerTel: '', // 필요시 프로필에서 전화번호 가져오기
      ediDate: ediDate,
      signData: signData,
      returnCharSet: 'utf-8',
      cardQuota: '00', // 일시불 결제
      useShopInterest: false, // 상점분담무이자 사용여부 (현재 false만 사용 가능)
    };

    // 나이스페이 API 호출
    const response = await axios.post(
      `https://api.nicepay.co.kr/v1/subscribe/${profileData.billing_id}/payments`,
      nicePayRequestData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    const responseData = response.data;

    // 응답 확인
    if (responseData.resultCode !== '0000') {
      return NextResponse.json(
        {
          error: '결제에 실패했습니다.',
          message: responseData.resultMsg,
        },
        { status: 400 }
      );
    }

    // 구독 기간 설정
    const startDate = new Date();
    const endDate = new Date();

    if (planData.interval === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (planData.interval === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // 구독 티어 설정 (Basic 또는 Pro)
    const subscriptionTier = planData.name === 'Basic' ? 'basic' : 'premium';

    // 트랜잭션 시작
    const { error: transactionError } = await supabase.rpc('start_subscription', {
      p_user_id: user.id,
      p_plan_id: planId,
      p_bid: profileData.billing_id,
      p_tid: responseData.tid,
      p_order_id: orderId,
      p_amount: amount,
      p_period_start: startDate.toISOString(),
      p_period_end: endDate.toISOString(),
      p_card_info: {
        card_name: responseData.cardName,
        card_number: responseData.cardNo, // 마스킹된 카드번호
      },
      p_subscription_tier: subscriptionTier,
    });

    if (transactionError) {
      console.error('구독 정보 저장 오류:', transactionError);
      return NextResponse.json({ error: '구독 정보 저장에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tid: responseData.tid,
      subscriptionStart: startDate.toISOString(),
      subscriptionEnd: endDate.toISOString(),
    });
  } catch (error: unknown) {
    console.error('구독 시작 오류:', error);

    let errorMessage = '결제 처리 중 알 수 없는 오류가 발생했습니다.';
    let errorStatus = 500;

    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.resultMsg || error.message;
      errorStatus = error.response.status || 500;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: '결제 처리 중 오류가 발생했습니다.',
        message: errorMessage,
      },
      { status: errorStatus }
    );
  }
}
