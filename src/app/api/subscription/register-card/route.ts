import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import axios from 'axios';

// AES-256 암호화 함수 (CBC 모드)
function encryptAES256(text: string, key: Buffer, iv: Buffer) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

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
    const { cardNo, expYear, expMonth, idNo, cardPw } = requestData;
    
    // 필수 필드 검증
    if (!cardNo || !expYear || !expMonth || !idNo || !cardPw) {
      return NextResponse.json({ error: '모든 카드 정보를 입력해주세요.' }, { status: 400 });
    }
    
    // 주문 ID 생성 (현재 시간 기준)
    const orderId = `ORD_${user.id.substring(0, 8)}_${Date.now()}`;
    
    // 카드 데이터 생성 및 암호화
    const cardData = `cardNo=${cardNo}&expYear=${expYear}&expMonth=${expMonth}&idNo=${idNo}&cardPw=${cardPw}`;
    
    // AES-256 (CBC 모드) 암호화
    const encMode = 'A2';
    const encKey = Buffer.from(secretKey);
    const iv = Buffer.from(secretKey.substring(0, 16));
    const encData = encryptAES256(cardData, encKey, iv);
    
    // EDI 날짜 생성 (ISO 8601 형식)
    const ediDate = new Date().toISOString();
    
    // SignData 생성
    const signData = sha256(orderId + ediDate + secretKey);
    
    // Basic 인증을 위한 Base64 인코딩
    const authString = `${clientId}:${secretKey}`;
    const basicAuth = Buffer.from(authString).toString('base64');
    
    // 요청 데이터 구성
    const nicePayRequestData = {
      encData: encData,
      orderId: orderId,
      buyerName: user.user_metadata?.full_name || '사용자',
      buyerEmail: user.email,
      buyerTel: '', // 필요시 프로필에서 전화번호 가져오기
      encMode: encMode,
      ediDate: ediDate,
      signData: signData,
      returnCharSet: 'utf-8'
    };
    
    // 나이스페이 API 호출
    const response = await axios.post('https://api.nicepay.co.kr/v1/subscribe/regist', nicePayRequestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      }
    });
    
    const responseData = response.data;
    
    // 응답 확인
    if (responseData.resultCode !== '0000') {
      return NextResponse.json({ 
        error: '카드 등록에 실패했습니다.', 
        message: responseData.resultMsg 
      }, { status: 400 });
    }
    
    // 빌키(BID) 저장
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        billing_id: responseData.bid,
        card_info: {
          card_name: responseData.cardName,
          card_number: responseData.cardNo // 마스킹된 카드번호
        }
      })
      .eq('id', user.id);
      
    if (updateError) {
      console.error('빌키 저장 오류:', updateError);
      return NextResponse.json({ error: '빌키 저장에 실패했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      bid: responseData.bid,
      cardName: responseData.cardName,
      cardNo: responseData.cardNo // 마스킹된 카드번호
    });
    
  } catch (error: any) {
    console.error('카드 등록 오류:', error);
    
    // API 오류 응답 처리
    if (error.response) {
      return NextResponse.json({ 
        error: '카드 등록 처리 중 오류가 발생했습니다.',
        message: error.response.data?.resultMsg || error.message
      }, { status: error.response.status || 500 });
    }
    
    return NextResponse.json({ 
      error: '카드 등록 처리 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 