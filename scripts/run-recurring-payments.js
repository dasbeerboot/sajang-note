#!/usr/bin/env node

const axios = require('axios');
const http = require('http');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

// axios 어댑터 설정
axios.defaults.httpAgent = new http.Agent({ keepAlive: true });
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true });

// 환경 변수 확인
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ihetobtbmgumwqlapsvl.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

async function runRecurringPayments() {
  try {
    console.log('정기 결제 처리 시작...');
    
    const response = await axios.get(
      `${SUPABASE_URL}/functions/v1/process-recurring-payments`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    
    console.log('정기 결제 처리 결과:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.processed) {
      console.log(`처리된 구독: ${response.data.processed}`);
    }
    
    if (response.data.failed) {
      console.log(`실패한 구독: ${response.data.failed}`);
    }
    
  } catch (error) {
    console.error('정기 결제 처리 중 오류 발생:');
    
    if (error.response) {
      console.error(`상태 코드: ${error.response.status}`);
      console.error('응답 데이터:', error.response.data);
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

runRecurringPayments(); 