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

// AES-128 암호화 함수 (ECB 모드)
function encryptAES128(text, key) {
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// AES-256 암호화 함수 (CBC 모드)
function encryptAES256(text, key, iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// SHA-256 해시 함수
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function main() {
  try {
    console.log('=== 나이스페이 빌링결제 테스트 ===');

    // 필요한 정보 입력 받기
    const clientId = await question('클라이언트 ID를 입력하세요: ');
    const secretKey = await question('시크릿키를 입력하세요: ');

    // Basic 인증을 위한 Base64 인코딩
    const authString = `${clientId}:${secretKey}`;
    const basicAuth = Buffer.from(authString).toString('base64');

    const cardNo = await question('카드번호를 입력하세요 (숫자만): ');
    const expYear = await question('유효기간(년)을 입력하세요 (YY): ');
    const expMonth = await question('유효기간(월)을 입력하세요 (MM): ');
    const idNo = await question('생년월일(YYMMDD) 또는 사업자번호를 입력하세요: ');
    const cardPw = await question('카드 비밀번호 앞 2자리를 입력하세요: ');

    // 주문 ID 생성 (현재 시간 기준)
    const orderId = 'TEST_' + Date.now();

    // 암호화 모드 선택
    const encModeChoice = await question('암호화 모드를 선택하세요 (1: AES-128, 2: AES-256): ');

    let encData;
    let encMode;
    const cardData = `cardNo=${cardNo}&expYear=${expYear}&expMonth=${expMonth}&idNo=${idNo}&cardPw=${cardPw}`;

    if (encModeChoice === '1') {
      // AES-128 (ECB 모드)
      encMode = '';
      const encKey = secretKey.substring(0, 16);
      encData = encryptAES128(cardData, encKey);
    } else {
      // AES-256 (CBC 모드)
      encMode = 'A2';
      const encKey = Buffer.from(secretKey);
      const iv = Buffer.from(secretKey.substring(0, 16));
      encData = encryptAES256(cardData, encKey, iv);
    }

    // EDI 날짜 생성 (ISO 8601 형식)
    const ediDate = new Date().toISOString();

    // SignData 생성
    const signData = sha256(orderId + ediDate + secretKey);

    // 요청 데이터 구성
    const requestData = {
      encData: encData,
      orderId: orderId,
      buyerName: '테스트 구매자',
      buyerEmail: 'test@example.com',
      buyerTel: '01012345678',
      encMode: encMode,
      ediDate: ediDate,
      signData: signData,
      returnCharSet: 'utf-8',
    };

    console.log('\n=== 요청 데이터 ===');
    console.log(JSON.stringify(requestData, null, 2));

    // API 호출
    const sendRequest = await question('\n실제로 API를 호출하시겠습니까? (y/n): ');

    if (sendRequest.toLowerCase() === 'y') {
      console.log('\n=== API 호출 정보 ===');
      console.log('URL: https://api.nicepay.co.kr/v1/subscribe/regist');
      console.log('Authorization: Basic ' + basicAuth);

      const response = await axios.post(
        'https://api.nicepay.co.kr/v1/subscribe/regist',
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
