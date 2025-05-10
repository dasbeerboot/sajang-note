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
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    
    if (getUserError || !user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 환경 변수 확인
    const clientId = process.env.NICEPAY_CLIENT_ID;
    const secretKey = process.env.NICEPAY_SECRET_KEY;
    
    if (!clientId || !secretKey) {
      return NextResponse.json({ error: '결제 설정이 올바르지 않습니다.' }, { status: 500 });
    }
    
    // 요청 데이터 파싱
    const requestData = await request.json();
    const { billing_id } = requestData;
    
    if (!billing_id) {
      return NextResponse.json({ error: '빌링키 정보가 필요합니다.' }, { status: 400 });
    }
    
    // 사용자가 해당 빌링키의 소유자인지 확인
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('billing_id')
      .eq('id', user.id)
      .eq('billing_id', billing_id)
      .single();
      
    if (profileError || !profileData) {
      return NextResponse.json({ error: '유효하지 않은 빌링키입니다.' }, { status: 403 });
    }
    
    // 주문 ID 생성 (현재 시간 기준)
    const orderId = `CANCEL_${user.id.substring(0, 8)}_${Date.now()}`;
    
    // EDI 날짜 생성 (ISO 8601 형식)
    const ediDate = new Date().toISOString();
    
    // SignData 생성
    const signData = sha256(orderId + billing_id + ediDate + secretKey);
    
    // Basic 인증을 위한 Base64 인코딩
    const authString = `${clientId}:${secretKey}`;
    const basicAuth = Buffer.from(authString).toString('base64');
    
    // 요청 데이터 구성
    const nicePayRequestData = {
      orderId: orderId,
      ediDate: ediDate,
      signData: signData,
      returnCharSet: 'utf-8'
    };
    
    // 나이스페이 API 호출 - 빌링키 만료 처리
    const response = await axios.post(
      `https://api.nicepay.co.kr/v1/subscribe/${billing_id}/expire`, 
      nicePayRequestData, 
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`
        }
      }
    );
    
    const responseData = response.data;
    
    // 응답 확인
    if (responseData.resultCode !== '0000') {
      return NextResponse.json({ 
        error: '빌링키 만료에 실패했습니다.', 
        message: responseData.resultMsg 
      }, { status: 400 });
    }
    
    // 구독 상태 업데이트
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'canceled',
        billing_id: null
      })
      .eq('id', user.id);
      
    if (updateError) {
      console.error('구독 상태 업데이트 오류:', updateError);
      return NextResponse.json({ error: '구독 상태 업데이트에 실패했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: '구독이 성공적으로 취소되었습니다.'
    });
    
  } catch (error: any) {
    console.error('구독 취소 오류:', error);
    
    // API 오류 응답 처리
    if (error.response) {
      return NextResponse.json({ 
        error: '구독 취소 처리 중 오류가 발생했습니다.',
        message: error.response.data?.resultMsg || error.message
      }, { status: error.response.status || 500 });
    }
    
    return NextResponse.json({ 
      error: '구독 취소 처리 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 