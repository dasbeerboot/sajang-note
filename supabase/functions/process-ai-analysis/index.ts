import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase 클라이언트 초기화 (환경 변수 사용)
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables.');
}
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

// Gemini API 클라이언트 초기화 (환경 변수 사용)
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const geminiModelName = Deno.env.get('GEMINI_MODEL_NAME') || 'gemini-2.0-flash';

if (!geminiApiKey) {
  console.warn('GEMINI_API_KEY is not set. AI analysis will be disabled.');
}

// Gemini API를 REST로 직접 호출하는 함수
async function callGeminiApi(prompt: string) {
  console.log(`[Gemini API] 요청 시작: ${new Date().toISOString()}`);
  console.log(`[Gemini API] 프롬프트 길이: ${prompt.length} 글자`);

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelName}:generateContent?key=${geminiApiKey}`;

  // responseMimeType을 application/json으로 설정하여 JSON 형식의 응답을 받음
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
      responseMimeType: 'application/json',
      // 다른 생성 설정은 필요에 따라 추가
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

async function updatePlaceError(placePkId: string, errorMessage: string, step: string) {
  console.error(
    `[AI Analysis Error - Step: ${step}] place_pk_id: ${placePkId}, Error: ${errorMessage}`
  );
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('places')
      .update({
        status: 'failed',
        error_message: `AI 분석 중 오류 (${step}): ${errorMessage}`.substring(0, 255),
      })
      .eq('id', placePkId);
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

  if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
    console.error('Essential environment variables are missing for AI Analysis function.');
    return new Response(
      JSON.stringify({ error: 'AI Analysis function is not configured correctly.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503,
      }
    );
  }

  let placePkIdForErrorHandling: string | null = null;

  try {
    const requestStart = new Date();
    console.log(`[AI Analysis 시작] ${requestStart.toISOString()}`);

    const { place_pk_id, firecrawl_markdown, firecrawl_metadata } = await req.json();
    placePkIdForErrorHandling = place_pk_id;
    console.log(`[AI Analysis] 요청 받음 - place_pk_id: ${place_pk_id}`);

    if (!place_pk_id || !firecrawl_markdown || !firecrawl_metadata) {
      console.error(
        '[AI Analysis 입력 오류] place_pk_id, firecrawl_markdown, firecrawl_metadata 중 누락된 값이 있습니다.'
      );
      return new Response(JSON.stringify({ error: 'Missing required data in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`[AI Analysis] 프롬프트 조회 중 - place_pk_id: ${place_pk_id}`);
    const { data: promptData, error: promptError } = await supabaseAdmin
      .from('prompts')
      .select('prompt_content')
      .eq('prompt_name', 'place_data_extraction_default')
      .single();

    if (promptError || !promptData?.prompt_content) {
      await updatePlaceError(
        place_pk_id,
        promptError?.message || 'Default prompt not found.',
        'fetch_prompt'
      );
      return new Response(JSON.stringify({ error: 'Failed to fetch extraction prompt.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    const systemPrompt = promptData.prompt_content;
    console.log(`[AI Analysis] 프롬프트 조회 성공 - place_pk_id: ${place_pk_id}`);

    const inputText = `
      ${systemPrompt}

      --- 크롤링된 Markdown 시작 ---
      ${firecrawl_markdown}
      --- 크롤링된 Markdown 끝 ---

      --- 크롤링된 Metadata 시작 ---
      ${JSON.stringify(firecrawl_metadata, null, 2)}
      --- 크롤링된 Metadata 끝 ---
    `;

    let extractedJson: any;
    let responseTextForErrorLogging = '';

    try {
      console.log(`[AI Analysis] Gemini API 호출 시작 - place_pk_id: ${place_pk_id}`);
      responseTextForErrorLogging = await callGeminiApi(inputText);
      console.log(`[AI Analysis] Gemini API 응답 수신 - place_pk_id: ${place_pk_id}`);
      console.log(
        `[AI Analysis] 원본 응답 텍스트 (처음 500자): ${responseTextForErrorLogging.substring(0, 500)}...`
      );

      let jsonStringToParse = responseTextForErrorLogging.trim();
      // JSON 블록 추출 시도 (```json ... ``` 패턴)
      const jsonMatch = jsonStringToParse.match(/^```json\n([\s\S]*?)\n```$/);

      if (jsonMatch && jsonMatch[1]) {
        jsonStringToParse = jsonMatch[1].trim();
        console.log(
          `[AI Analysis] JSON 문자열 추출 (코드 블록에서) - place_pk_id: ${place_pk_id}. 길이: ${jsonStringToParse.length}`
        );
      } else {
        // 코드 블록이 아닌 경우 다른 패턴 시도
        // { ... } 패턴 찾기 (전체 응답이 JSON 객체인 경우)
        const objectMatch = jsonStringToParse.match(/(\{[\s\S]*\})/);
        if (objectMatch && objectMatch[1]) {
          jsonStringToParse = objectMatch[1].trim();
          console.log(
            `[AI Analysis] JSON 객체 패턴 추출 - place_pk_id: ${place_pk_id}. 길이: ${jsonStringToParse.length}`
          );
        } else {
          console.log(
            `[AI Analysis] 패턴 없는 직접 JSON 문자열로 가정 - place_pk_id: ${place_pk_id}. 길이: ${jsonStringToParse.length}`
          );
        }
      }

      // JSON 파싱 전처리 - 일반적인 JSON 오류 패턴 수정
      try {
        // 1. 이스케이프되지 않은 백슬래시를 이중 백슬래시로 변환 (JSON에서는 백슬래시가 이스케이프 문자로 사용됨)
        // 단, 이미 이스케이프된 문자(\n, \t, \", \\)는 건너뜀
        jsonStringToParse = jsonStringToParse.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

        // 2. 따옴표 안에 있는 대괄호 처리 (이미 따옴표로 묶인 문자열 내부의 대괄호는 이스케이프 필요 없음)
        // 정규식으로 문자열 내부를 정확히 처리하기는 복잡하므로, JSON.parse 오류가 발생하면 다른 방법 시도

        extractedJson = JSON.parse(jsonStringToParse);
        console.log(`[AI Analysis] JSON 파싱 성공 - place_pk_id: ${place_pk_id}.`);
      } catch (parseError: any) {
        console.error(`[AI Analysis JSON 파싱 오류] 첫 번째 시도 실패: ${parseError.message}`);

        try {
          // 첫 시도 실패 시 대체 방법: JSON5나 다른 방법으로 더 엄격하지 않은 파싱 시도
          // 여기서는 간단한 임시 방법으로 일반적인 오류 패턴을 수정

          // 1. "문자열" 내부에 있는 따옴표를 이스케이프
          const fixedJsonString = jsonStringToParse
            // 백슬래시가 아닌 \로 시작하는 경우를 모두 \\로 변경
            .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1\\\\$2')
            // 문자열 내 대괄호에 대한 간단한 처리
            .replace(/\[(?=\w)/g, '\\[')
            .replace(/(?<=\w)\]/g, '\\]');

          console.log(
            `[AI Analysis] 수정된 JSON 파싱 시도: 처음 200자: ${fixedJsonString.substring(0, 200)}...`
          );
          extractedJson = JSON.parse(fixedJsonString);
          console.log(`[AI Analysis] 수정 후 JSON 파싱 성공 - place_pk_id: ${place_pk_id}.`);
        } catch (secondParseError: any) {
          // 두 번째 시도도 실패하면 더 강력한 방법: 문자열 파싱을 직접 수행
          try {
            console.log(
              `[AI Analysis] 두 번째 시도 실패: ${secondParseError.message}. 더 강력한 수정 시도...`
            );

            // 모든 백슬래시 앞에 백슬래시 추가 (이미 이스케이프된 것 포함)
            const aggressivelyFixedString = jsonStringToParse
              .replace(/\\/g, '\\\\')
              // 그런 다음 이중 이스케이프된 문자를 다시 단일로 복원
              .replace(/\\\\\"/g, '\\"')
              .replace(/\\\\\//g, '\\/')
              .replace(/\\\\n/g, '\\n')
              .replace(/\\\\t/g, '\\t')
              .replace(/\\\\r/g, '\\r')
              .replace(/\\\\\\\\/g, '\\\\');

            extractedJson = JSON.parse(aggressivelyFixedString);
            console.log(
              `[AI Analysis] 강력한 수정 후 JSON 파싱 성공 - place_pk_id: ${place_pk_id}.`
            );
          } catch (thirdParseError: any) {
            // 세번째 시도도 실패하면 특수 문자 더 강력하게 처리 + 문제 구간 직접 수정
            try {
              console.log(
                `[AI Analysis] 세 번째 시도 실패: ${thirdParseError.message}. 특수 문자 처리로 시도...`
              );

              // 오류 위치 정보 추출 (가능한 경우)
              let problematicPosition = -1;
              const errorPositionMatch = parseError.message.match(/position (\d+)/);
              if (errorPositionMatch) {
                problematicPosition = parseInt(errorPositionMatch[1], 10);
              }

              // JSON에 포함된 모든 문자열 값을 찾아 특수 문자 처리
              let superFixedString = jsonStringToParse;

              // 1. 문자열 내에서 발생하는 모든 특수 문자 처리
              // 정규식으로 모든 문자열 부분 찾기 (큰따옴표로 둘러싸인 부분)
              superFixedString = superFixedString.replace(/"(?:[^"\\]|\\.)*"/g, match => {
                // 문자열 내부의 모든 특수 문자를 이스케이프 처리
                return match
                  .replace(/\[/g, '\\[')
                  .replace(/\]/g, '\\]')
                  .replace(/\{/g, '\\{')
                  .replace(/\}/g, '\\}')
                  .replace(/\(/g, '\\(')
                  .replace(/\)/g, '\\)')
                  .replace(/\:/g, '\\:')
                  .replace(/\,/g, '\\,');
              });

              // 2. 문제가 되는 위치 주변의 문자열 강제 수정 (오류 위치를 알고 있는 경우)
              if (problematicPosition > 0) {
                // 오류 위치 주변 50자 추출 (오류의 앞뒤 컨텍스트)
                const start = Math.max(0, problematicPosition - 25);
                const end = Math.min(superFixedString.length, problematicPosition + 25);
                const problematicSegment = superFixedString.substring(start, end);

                console.log(
                  `[AI Analysis] 오류 위치 ${problematicPosition} 주변 문제 구간: "${problematicSegment}"`
                );

                // 오류 근처에 있는 일반적인 JSON 구문 오류 패턴 수정
                // 배열 관련 오류인 경우 ([, ] 누락 또는 불필요한 쉼표)
                if (parseError.message.includes('array')) {
                  // 배열 요소 사이에 쉼표 누락인 경우 (}, {)
                  superFixedString = superFixedString.replace(/\}\s*\{/g, '},{');
                  // 배열 마지막에 불필요한 쉼표 있는 경우 (,])
                  superFixedString = superFixedString.replace(/,\s*\]/g, ']');
                  // 닫는 대괄호 누락 패턴 처리
                  const openBrackets = (superFixedString.match(/\[/g) || []).length;
                  const closeBrackets = (superFixedString.match(/\]/g) || []).length;
                  if (openBrackets > closeBrackets) {
                    superFixedString = superFixedString + ']'.repeat(openBrackets - closeBrackets);
                  }
                }
              }

              // 마지막 JSON 수정 시도
              console.log(
                `[AI Analysis] 최종 수정된 JSON 파싱 시도: 처음 200자: ${superFixedString.substring(0, 200)}...`
              );
              extractedJson = JSON.parse(superFixedString);
              console.log(
                `[AI Analysis] 최종 수정 후 JSON 파싱 성공 - place_pk_id: ${place_pk_id}.`
              );
            } catch (finalParseError: any) {
              // 모든 시도 실패 시 원래 방식으로 오류 보고
              const errorPositionMatch = parseError.message.match(/position (\d+)/);
              const errorPosition = errorPositionMatch ? parseInt(errorPositionMatch[1], 10) : -1;
              let contextAroundError = '';
              if (errorPosition !== -1) {
                const start = Math.max(0, errorPosition - 30);
                const end = Math.min(jsonStringToParse.length, errorPosition + 30);
                contextAroundError = jsonStringToParse.substring(start, end);
              }

              console.error(
                `[AI Analysis JSON 파싱 오류] 모든 파싱 시도 실패 - place_pk_id: ${place_pk_id}.`
              );
              console.error(`[AI Analysis JSON 파싱 오류] 메시지: ${parseError.message}`);
              console.error(
                `[AI Analysis JSON 파싱 오류] 오류 위치 ${errorPosition} 주변 컨텍스트: "...${contextAroundError}..."`
              );

              await updatePlaceError(
                place_pk_id,
                `JSON Parse Error: ${parseError.message} | Context: ${contextAroundError.replace(/"/g, "'")}`,
                'json_parse_error'
              );
              return new Response(
                JSON.stringify({
                  error: 'AI model output parsing failed.',
                  details: parseError.message,
                  context: contextAroundError,
                  rawOutputStart: jsonStringToParse.substring(0, 200),
                }),
                {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 500,
                }
              );
            }
          }
        }
      }
    } catch (e: any) {
      console.error(
        `[AI Analysis Gemini 오류] Gemini API 호출 또는 JSON 파싱 실패 - place_pk_id: ${place_pk_id}`,
        e
      );
      let errorDetails = e.message || 'Gemini API call or JSON parsing failed.';

      // 원본 responseText도 오류 메시지에 포함 (디버깅용)
      if (responseTextForErrorLogging) {
        errorDetails += ` | Raw Response (first 200 chars): ${responseTextForErrorLogging.substring(0, 200)}`;
      }

      await updatePlaceError(place_pk_id, errorDetails, 'gemini_api_call');
      return new Response(
        JSON.stringify({ error: 'AI model processing failed.', details: errorDetails }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    if (!extractedJson?.basic_info?.place_address || !extractedJson?.basic_info?.place_name) {
      const errorMessage = `Extracted JSON missing place_address or place_name. Address: ${extractedJson?.basic_info?.place_address}, Name: ${extractedJson?.basic_info?.place_name}`;
      console.error(`[AI Analysis 유효성 검사 오류] ${errorMessage} - place_pk_id: ${place_pk_id}`);
      await updatePlaceError(place_pk_id, errorMessage, 'validate_json');
      return new Response(
        JSON.stringify({ error: 'AI model output validation failed: Missing required fields.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    console.log(`[AI Analysis] JSON 유효성 검사 통과 - place_pk_id: ${place_pk_id}.`);

    const nowForDb = new Date().toISOString();
    const updatePayload = {
      crawled_data: extractedJson,
      place_name: extractedJson.basic_info.place_name,
      place_address: extractedJson.basic_info.place_address,
      status: 'completed',
      error_message: null,
      last_crawled_at: nowForDb,
      updated_at: nowForDb,
      content_last_changed_at: nowForDb,
    };
    console.log(`[AI Analysis] places 테이블 업데이트 - place_pk_id: ${place_pk_id}`);

    const { error: updateError, data: updateResult } = await supabaseAdmin
      .from('places')
      .update(updatePayload)
      .eq('id', place_pk_id)
      .select('id, status')
      .single();

    if (updateError) {
      await updatePlaceError(place_pk_id, updateError.message, 'update_db');
      return new Response(
        JSON.stringify({
          error: 'Failed to update place data in DB.',
          details: updateError.message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 확인: 업데이트가 실제로 이루어졌는지 검증
    if (!updateResult) {
      const errorMessage = 'DB update returned no result, possible update failure';
      console.error(`[AI Analysis DB 오류] ${errorMessage} - place_pk_id: ${place_pk_id}`);
      await updatePlaceError(place_pk_id, errorMessage, 'update_db_verification');
      return new Response(
        JSON.stringify({ error: 'Failed to verify place data update.', details: errorMessage }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 추가 검증: 상태가 'completed'로 변경되었는지 확인
    if (updateResult.status !== 'completed') {
      const errorMessage = `DB update status mismatch: expected 'completed', got '${updateResult.status}'`;
      console.error(`[AI Analysis DB 오류] ${errorMessage} - place_pk_id: ${place_pk_id}`);
      await updatePlaceError(place_pk_id, errorMessage, 'update_db_status_mismatch');
      return new Response(
        JSON.stringify({
          error: 'Failed to update place status correctly.',
          details: errorMessage,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const requestEnd = new Date();
    const processingTime = (requestEnd.getTime() - requestStart.getTime()) / 1000;
    console.log(
      `[AI Analysis 성공] 처리 완료 - place_pk_id: ${place_pk_id}, 처리 시간: ${processingTime}초`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Place data processed and updated successfully.',
        place_id: place_pk_id,
        update_result: {
          id: updateResult.id,
          status: updateResult.status,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[AI Analysis 최상위 오류]', error);
    if (placePkIdForErrorHandling) {
      // placePkIdForErrorHandling이 null이 아닐 때만 DB 업데이트 시도
      await updatePlaceError(
        placePkIdForErrorHandling,
        error.message || 'Unexpected error in AI function',
        'top_level_catch'
      );
    }
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
