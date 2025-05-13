const crypto = require('crypto');
const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 사용자 입력 함수
function question(query) {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

// SHA-256 해시 함수
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function main() {
  try {
    console.log('=== 나이스페이 빌링키 만료 테스트 ===');

    // 필요한 정보 입력 받기
    const clientId = await question('클라이언트 ID를 입력하세요: ');
    const secretKey = await question('시크릿키를 입력하세요: ');
    const bid = await question('만료할 빌링키(BID)를 입력하세요: ');

    // Basic 인증을 위한 Base64 인코딩
    const authString = `${clientId}:${secretKey}`;
    const basicAuth = Buffer.from(authString).toString('base64');

    // 주문 ID 생성 (현재 시간 기준)
    const orderId = 'EXPIRE_' + Date.now();

    // EDI 날짜 생성 (ISO 8601 형식)
    const ediDate = new Date().toISOString();

    // SignData 생성
    const signData = sha256(orderId + bid + ediDate + secretKey);

    // 요청 데이터 구성
    const requestData = {
      orderId: orderId,
      ediDate: ediDate,
      signData: signData,
      returnCharSet: 'utf-8',
    };

    console.log('\n=== 요청 데이터 ===');
    console.log(JSON.stringify(requestData, null, 2));
    console.log('\n=== 요청 URL ===');
    console.log(`https://api.nicepay.co.kr/v1/subscribe/${bid}/expire`);

    // API 호출
    const sendRequest = await question('\n실제로 API를 호출하시겠습니까? (y/n): ');

    if (sendRequest.toLowerCase() === 'y') {
      console.log('\n=== API 호출 정보 ===');
      console.log(`URL: https://api.nicepay.co.kr/v1/subscribe/${bid}/expire`);
      console.log('Authorization: Basic ' + basicAuth);

      const response = await axios.post(
        `https://api.nicepay.co.kr/v1/subscribe/${bid}/expire`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${basicAuth}`,
          },
        }
      );

      console.log('\n=== 응답 결과 ===');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      console.log('\n요청이 취소되었습니다.');
    }
  } catch (error) {
    console.error('\n오류 발생:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  } finally {
    rl.close();
  }
}

main();
