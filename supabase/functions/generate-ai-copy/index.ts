/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 환경 변수
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const geminiModelName = Deno.env.get('GEMINI_MODEL_NAME') || 'gemini-1.5-flash-latest';

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
  console.error(
    'Missing one or more required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY'
  );
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

// Gemini API를 REST로 직접 호출하는 함수
async function generateWithGemini(prompt: string) {
  console.log(`[Gemini API] 요청 시작: ${new Date().toISOString()}`);
  console.log(`[Gemini API] 프롬프트 길이: ${prompt.length} 글자`);

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelName}:generateContent?key=${geminiApiKey}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
    generationConfig: {
      temperature: 1.6,
    },
  };

  try {
    console.log(`[Gemini API] API 요청 시작: ${new Date().toISOString()}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(
      `[Gemini API] API 응답 수신: ${new Date().toISOString()}, 상태 코드: ${response.status}`
    );

    if (!response.ok) {
      // 에러 응답 상세 정보 로깅
      const errorText = await response.text();
      console.error(`[Gemini API 오류] 상태 코드: ${response.status}, 응답: ${errorText}`);
      throw new Error(`Gemini API 오류: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log(`[Gemini API] 응답 데이터 파싱 성공`);

    // 응답 구조 검증
    if (
      !responseData.candidates ||
      !responseData.candidates[0] ||
      !responseData.candidates[0].content ||
      !responseData.candidates[0].content.parts
    ) {
      console.error(
        `[Gemini API 오류] 예상치 못한 응답 형식: ${JSON.stringify(responseData).substring(0, 200)}...`
      );
      throw new Error('Gemini API 응답 형식 오류: 예상된 구조가 없습니다');
    }

    const generatedText = responseData.candidates[0].content.parts[0].text;
    console.log(`[Gemini API] 생성된 텍스트 길이: ${generatedText.length} 글자`);
    return generatedText;
  } catch (error) {
    console.error(`[Gemini API 오류] ${error.message}`);
    throw error; // 상위 함수에서 처리할 수 있도록 다시 throw
  }
}

interface RequestPayload {
  placeId: string;
  copyType: string;
  userPrompt?: string;
}

// JWT 토큰에서 사용자 ID 추출 함수
async function getUserIdFromToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[인증 오류] 인증 헤더가 없거나 형식이 잘못되었습니다');
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // JWT 토큰 검증 및 사용자 정보 가져오기
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      console.error('[인증 오류] 사용자 검증 실패:', error?.message || '사용자 정보 없음');
      return null;
    }

    return data.user.id;
  } catch (error) {
    console.error('[인증 오류] JWT 처리 중 예외 발생:', error);
    return null;
  }
}

// 구독 상태와 크레딧 확인 함수
async function checkUserPermission(
  userId: string,
  copyType: string
): Promise<{
  canGenerate: boolean;
  isActiveSubscription: boolean;
  remainingCount?: number;
  remainingCredits?: number;
  message?: string;
}> {
  try {
    // 사용자 프로필 정보 조회
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(
        'subscription_tier, subscription_status, subscription_end_date, free_trial_copy_remaining, credits'
      )
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`[DB 오류] 사용자 프로필 조회 실패: ${error.message}`);
      throw new Error('사용자 정보를 확인할 수 없습니다');
    }

    // 구독 상태 확인 - DB 함수와 동일한 로직 적용
    const now = new Date();
    const subscriptionEndDate = profile.subscription_end_date
      ? new Date(profile.subscription_end_date)
      : null;

    // 구독 상태가 active이거나, canceled이지만 아직 만료되지 않은 경우만 유효
    const isActiveSubscription =
      (profile.subscription_tier !== 'free' && profile.subscription_status === 'active') ||
      (profile.subscription_tier !== 'free' &&
        profile.subscription_status === 'canceled' &&
        subscriptionEndDate &&
        subscriptionEndDate > now);

    // 크레딧 소요량 계산
    const requiredCredits = copyType === 'blog_review_post' ? 2 : 1;

    // 구독 중인 경우 크레딧 확인
    if (isActiveSubscription) {
      // 크레딧이 부족하면 생성 불가
      if (profile.credits < requiredCredits) {
        return {
          canGenerate: false,
          isActiveSubscription: true,
          remainingCredits: profile.credits,
          message: `크레딧이 부족합니다. 필요: ${requiredCredits}, 보유: ${profile.credits}`,
        };
      }

      return {
        canGenerate: true,
        isActiveSubscription: true,
        remainingCredits: profile.credits,
      };
    }

    // 구독자가 아닌 경우 무료 체험 횟수 확인
    if (profile.free_trial_copy_remaining <= 0) {
      return {
        canGenerate: false,
        isActiveSubscription: false,
        message: '무료 체험 횟수를 모두 사용했습니다. 구독하신 후 이용하실 수 있습니다.',
      };
    }

    // 무료 체험 사용 가능
    return {
      canGenerate: true,
      isActiveSubscription: false,
      remainingCount: profile.free_trial_copy_remaining,
    };
  } catch (error) {
    console.error(`[서버 오류] 사용자 권한 확인 중 오류: ${error.message}`);
    throw error;
  }
}

// 무료 체험 횟수 차감 함수 - AI 생성 성공 후 호출
async function decrementFreeTrialCount(userId: string): Promise<{ remainingCount: number }> {
  try {
    // DB 함수 호출하여 차감
    const { data, error } = await supabaseAdmin.rpc('decrement_free_trial_count', {
      user_id: userId,
    });

    if (error) {
      console.error(`[DB 오류] 무료 체험 횟수 차감 실패: ${error.message}`);
      throw new Error('무료 체험 횟수를 차감할 수 없습니다');
    }

    return {
      remainingCount: data.remainingCount || 0,
    };
  } catch (error) {
    console.error(`[DB 오류] 무료 체험 횟수 차감 중 오류: ${error.message}`);
    throw error;
  }
}

// 크레딧 차감 함수
async function deductCredits(
  userId: string,
  feature: string,
  amount: number
): Promise<{ success: boolean; remainingCredits?: number; message?: string }> {
  try {
    console.log(`[크레딧 차감 시작] 사용자: ${userId}, 기능: ${feature}, 금액: ${amount}`);

    // DB 함수 호출하여 크레딧 차감
    const { data, error } = await supabaseAdmin.rpc('deduct_user_credits', {
      p_user_id: userId,
      p_feature: feature,
      p_amount: amount,
    });

    console.log(
      `[크레딧 차감 DB 응답] 데이터: ${JSON.stringify(data)}, 오류: ${error ? error.message : '없음'}`
    );

    if (error) {
      console.error(`[DB 오류] 크레딧 차감 실패: ${error.message}`);
      return {
        success: false,
        message: `크레딧 차감 실패: ${error.message}`,
      };
    }

    if (data === false) {
      console.log(`[크레딧 부족] 크레딧이 부족합니다.`);
      return {
        success: false,
        message: '크레딧이 부족합니다',
      };
    }

    // 남은 크레딧 조회
    console.log(`[크레딧 차감 후] 남은 크레딧 조회 시작`);
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error(`[DB 오류] 남은 크레딧 조회 실패: ${profileError.message}`);
      return {
        success: true,
        message: '크레딧이 차감되었으나 남은 수량을 확인할 수 없습니다',
      };
    }

    console.log(`[크레딧 차감 완료] 남은 크레딧: ${profileData.credits}`);
    return {
      success: true,
      remainingCredits: profileData.credits,
    };
  } catch (error) {
    console.error(`[크레딧 차감 오류] ${error.message}`);
    console.error(error.stack);
    return {
      success: false,
      message: `크레딧 차감 중 오류 발생: ${error.message}`,
    };
  }
}

// AI 생성 결과 저장 함수
async function saveGeneratedCopy(
  userId: string,
  placeId: string,
  copyType: string,
  userPrompt: string | undefined,
  generatedContent: string
): Promise<{ success: boolean; message?: string }> {
  try {
    console.log(`[저장 시도] 카피 저장 시작: 사용자=${userId}, 장소=${placeId}, 타입=${copyType}`);

    const { error } = await supabaseAdmin.from('ai_generated_copies').upsert(
      {
        place_id: placeId,
        user_id: userId,
        copy_type: copyType,
        user_prompt: userPrompt || null,
        generated_content: generatedContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'place_id,copy_type',
      }
    );

    if (error) {
      console.error(`[저장 오류] AI 카피 저장 실패: ${error.message}`);
      return {
        success: false,
        message: `저장 실패: ${error.message}`,
      };
    }

    console.log(`[저장 성공] AI 카피가 DB에 저장됨: ${copyType}`);
    return {
      success: true,
    };
  } catch (error) {
    console.error(`[저장 오류] 예외 발생: ${error.message}`);
    return {
      success: false,
      message: `저장 중 오류 발생: ${error.message}`,
    };
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestStart = new Date();
    console.log(`[생성 요청 시작] ${requestStart.toISOString()}`);

    // 사용자 인증 확인
    const authHeader = req.headers.get('Authorization');
    const userId = await getUserIdFromToken(authHeader);

    if (!userId) {
      return new Response(JSON.stringify({ error: '인증되지 않은 요청입니다' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const requestPayload: RequestPayload = await req.json();
    const { placeId, copyType, userPrompt } = requestPayload;

    console.log(
      `[요청 데이터] userId: ${userId}, placeId: ${placeId}, copyType: ${copyType}, userPrompt 존재: ${Boolean(userPrompt)}`
    );

    if (!placeId || !copyType) {
      console.error('[오류] placeId 또는 copyType 누락');
      return new Response(JSON.stringify({ error: 'placeId와 copyType은 필수입니다' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 매장에 대한 접근 권한 확인
    const { data: placeOwnership, error: ownershipError } = await supabaseAdmin
      .from('places')
      .select('user_id')
      .eq('id', placeId)
      .single();

    if (ownershipError) {
      console.error(`[DB 오류] 매장 소유권 확인 실패: ${ownershipError.message}`);
      return new Response(
        JSON.stringify({
          error: '매장 정보를 확인할 수 없습니다',
          details: ownershipError.message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    if (placeOwnership.user_id !== userId) {
      console.error(
        `[권한 오류] 매장 접근 권한 없음. 요청: ${userId}, 소유자: ${placeOwnership.user_id}`
      );
      return new Response(JSON.stringify({ error: '이 매장에 대한 접근 권한이 없습니다' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // 구독 상태 및 크레딧 확인
    let permissionCheck;
    let isActiveSubscription = false;
    let remainingCount;
    let remainingCredits;

    try {
      permissionCheck = await checkUserPermission(userId, copyType);

      if (!permissionCheck.canGenerate) {
        return new Response(
          JSON.stringify({
            error: permissionCheck.message || '카피를 생성할 수 없습니다',
            errorCode: permissionCheck.isActiveSubscription
              ? 'INSUFFICIENT_CREDITS'
              : 'FREE_TRIAL_LIMIT_EXCEEDED',
            remainingCredits: permissionCheck.remainingCredits,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }

      isActiveSubscription = permissionCheck.isActiveSubscription;
      remainingCount = permissionCheck.remainingCount;
      remainingCredits = permissionCheck.remainingCredits;
    } catch (permissionError) {
      console.error(`[권한 오류] 사용자 권한 확인 실패: ${permissionError.message}`);
      return new Response(
        JSON.stringify({
          error: '권한 확인 중 오류가 발생했습니다',
          details: permissionError.message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 1. 매장 정보 가져오기
    console.log(`[DB 조회] 매장 정보 조회 시작: ${placeId}`);
    const { data: placeData, error: placeError } = await supabaseAdmin
      .from('places')
      .select('place_name, place_address, crawled_data')
      .eq('id', placeId)
      .single();

    if (placeError) {
      console.error(`[DB 오류] 매장 정보 조회 실패: ${placeError.message}`);
      return new Response(
        JSON.stringify({ error: '매장 정보를 가져올 수 없습니다', details: placeError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    console.log(`[DB 조회] 매장 정보 조회 성공: ${placeData.place_name}`);

    // 2. 프롬프트 템플릿 가져오기
    const promptName = `${copyType}_prompt_v1`;
    console.log(`[DB 조회] 프롬프트 템플릿 조회 시작: ${promptName}`);
    const { data: promptData, error: promptError } = await supabaseAdmin
      .from('prompts')
      .select('prompt_content')
      .eq('prompt_name', promptName)
      .single();

    if (promptError) {
      console.error(`[DB 오류] 프롬프트 템플릿 조회 실패: ${promptError.message}`);
      return new Response(
        JSON.stringify({
          error: `프롬프트를 가져올 수 없습니다: ${promptName}`,
          details: promptError.message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    console.log(
      `[DB 조회] 프롬프트 템플릿 조회 성공, 길이: ${promptData.prompt_content.length} 글자`
    );

    // 3. 프롬프트 구성
    let fullPrompt = promptData.prompt_content;

    // crawled_data 추가
    fullPrompt += '\n\n---\n제공된 데이터:\n';
    fullPrompt += `업체명: ${placeData.place_name || ''}\n`;
    fullPrompt += `위치: ${placeData.place_address || ''}\n`;

    // crawled_data가 있으면 문자열로 추가
    if (placeData.crawled_data) {
      fullPrompt += `크롤링 데이터: ${JSON.stringify(placeData.crawled_data, null, 2)}\n`;
    }

    // 사용자 요청사항 추가
    if (userPrompt && userPrompt.trim()) {
      fullPrompt += `\n사용자 요청사항: ${userPrompt}\n`;
    }

    console.log(`[프롬프트 준비 완료] 최종 프롬프트 길이: ${fullPrompt.length} 글자`);

    // 4. Gemini API 직접 호출
    try {
      console.log(`[Gemini API 호출] 시작`);
      const generatedText = await generateWithGemini(fullPrompt);
      console.log(`[Gemini API 호출] 성공, 응답 길이: ${generatedText.length} 글자`);

      const requestEnd = new Date();
      const processingTime = (requestEnd.getTime() - requestStart.getTime()) / 1000;
      console.log(`[생성 요청 완료] 처리 시간: ${processingTime}초`);

      // 1. 먼저 AI 생성 결과 저장 시도
      const saveResult = await saveGeneratedCopy(
        userId,
        placeId,
        copyType,
        userPrompt,
        generatedText
      );
      console.log(
        `[저장 결과] ${saveResult.success ? '성공' : '실패'}: ${saveResult.message || ''}`
      );

      // 2. 저장이 성공한 경우에만 크레딧 차감 또는 무료 체험 차감
      if (saveResult.success) {
        if (isActiveSubscription) {
          console.log(`[크레딧 처리] 구독 사용자(${userId})의 크레딧 차감 시도`);
          // 크레딧 차감량 결정 (블로그는 2크레딧, 나머지는 1크레딧)
          const creditAmount = copyType === 'blog_review_post' ? 2 : 1;
          console.log(`[크레딧 차감] 카피 타입: ${copyType}, 차감 금액: ${creditAmount}`);

          const deductResult = await deductCredits(userId, copyType, creditAmount);

          if (!deductResult.success) {
            console.error(`[크레딧 차감 실패] ${deductResult.message}`);
            // 차감 실패해도 결과는 반환
          } else {
            console.log(
              `[크레딧 차감 성공] ${creditAmount} 크레딧 차감됨. 남은 크레딧: ${deductResult.remainingCredits}`
            );
            remainingCredits = deductResult.remainingCredits;
          }
        } else {
          console.log(`[무료 체험 처리] 무료 사용자(${userId})의 체험 횟수 차감`);
          // 무료 체험 횟수 차감
          try {
            const decrementResult = await decrementFreeTrialCount(userId);
            remainingCount = decrementResult.remainingCount;
            console.log(`[무료 체험] 횟수 차감 완료, 남은 횟수: ${remainingCount}`);
          } catch (decrementError) {
            console.error(`[무료 체험] 횟수 차감 실패: ${decrementError.message}`);
            // 차감에 실패해도 생성된 결과는 반환
          }
        }
      } else {
        console.log(`[저장 실패] 크레딧이 차감되지 않습니다.`);
      }

      return new Response(
        JSON.stringify({
          generatedCopy: generatedText,
          remainingCount,
          remainingCredits,
          saved: saveResult.success,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (aiError) {
      console.error(`[AI 생성 오류] ${aiError.message}`);
      return new Response(
        JSON.stringify({
          error: '일시적인 AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          errorDetails: aiError.message, // 개발자용 상세 오류
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error(`[서버 오류] 예상치 못한 오류 발생: ${error.message}`);
    console.error(error.stack);
    return new Response(
      JSON.stringify({
        error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        errorDetails: error.message, // 개발자용 상세 오류
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
