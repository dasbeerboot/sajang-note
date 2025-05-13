import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; 
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from 'https://esm.sh/@google/generative-ai@0.11.4'; // GenerationConfig 추가

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
const genAI = new GoogleGenerativeAI(geminiApiKey!); 

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Gemini 모델 생성 시 적용할 Generation Config
const generationConfig: GenerationConfig = { // 타입 명시
  responseMimeType: "application/json",
  // temperature: 0.7, // 필요시 추가
  // maxOutputTokens: 8192, // 필요시 추가 (모델별 최대값 확인)
};

async function updatePlaceError(placePkId: string, errorMessage: string, step: string) {
  console.error(`[AI Analysis Error - Step: ${step}] place_pk_id: ${placePkId}, Error: ${errorMessage}`);
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('places')
      .update({ status: 'failed', error_message: `AI 분석 중 오류 (${step}): ${errorMessage}`.substring(0, 255) })
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
    return new Response(JSON.stringify({ error: 'AI Analysis function is not configured correctly.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 503, 
    });
  }

  let placePkIdForErrorHandling: string | null = null; 

  try {
    const { place_pk_id, firecrawl_markdown, firecrawl_metadata } = await req.json();
    placePkIdForErrorHandling = place_pk_id; 
    console.log(`[AI Analysis Start] Received request for place_pk_id: ${place_pk_id}`);

    if (!place_pk_id || !firecrawl_markdown || !firecrawl_metadata) {
      console.error('[AI Analysis Input Error] Missing place_pk_id, firecrawl_markdown, or firecrawl_metadata.');
      return new Response(JSON.stringify({ error: 'Missing required data in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`[AI Analysis] Fetching prompt for place_pk_id: ${place_pk_id}`);
    const { data: promptData, error: promptError } = await supabaseAdmin
      .from('prompts')
      .select('prompt_content')
      .eq('prompt_name', 'place_data_extraction_default')
      .single();

    if (promptError || !promptData?.prompt_content) {
      await updatePlaceError(place_pk_id, promptError?.message || 'Default prompt not found.', 'fetch_prompt');
      return new Response(JSON.stringify({ error: 'Failed to fetch extraction prompt.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    const systemPrompt = promptData.prompt_content;
    console.log(`[AI Analysis] Prompt fetched successfully for place_pk_id: ${place_pk_id}`);

    console.log(`[AI Analysis] Initializing Gemini model: ${geminiModelName} for place_pk_id: ${place_pk_id}`);
    const model = genAI.getGenerativeModel({ 
      model: geminiModelName, 
      safetySettings,
      generationConfig // generationConfig를 모델 초기화 시 전달
    });

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
    try {
      console.log(`[AI Analysis] Generating content with Gemini for place_pk_id: ${place_pk_id}`);
      const result = await model.generateContent(inputText);
      const response = result.response;
      let responseTextForErrorLogging = "";
      
      try {
        responseTextForErrorLogging = response.text(); 
      } catch (textError: any) {
        console.error(`[AI Analysis Gemini Error] Failed to get text from Gemini response for place_pk_id: ${place_pk_id}`, textError);
        await updatePlaceError(place_pk_id, `Gemini response.text() error: ${textError.message}`, 'gemini_response_text_error');
        return new Response(JSON.stringify({ error: 'AI model response processing failed.', details: textError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      
      console.log(`[AI Analysis] Gemini API raw response text (first 500 chars) for place_pk_id ${place_pk_id}:`, responseTextForErrorLogging.substring(0, 500) + "...");
      
      let jsonStringToParse = responseTextForErrorLogging.trim();
      // JSON 블록 추출 시도 (```json ... ``` 패턴)
      const jsonMatch = jsonStringToParse.match(/^```json\n([\s\S]*?)\n```$/);

      if (jsonMatch && jsonMatch[1]) {
        jsonStringToParse = jsonMatch[1].trim(); 
        console.log(`[AI Analysis] Extracted JSON string (from code block) for place_pk_id: ${place_pk_id}. Length: ${jsonStringToParse.length}`);
      } else {
        // 코드 블록이 아닌 경우 다른 패턴 시도
        // { ... } 패턴 찾기 (전체 응답이 JSON 객체인 경우)
        const objectMatch = jsonStringToParse.match(/(\{[\s\S]*\})/);
        if (objectMatch && objectMatch[1]) {
          jsonStringToParse = objectMatch[1].trim();
          console.log(`[AI Analysis] Extracted JSON object pattern for place_pk_id: ${place_pk_id}. Length: ${jsonStringToParse.length}`);
        } else {
          console.log(`[AI Analysis] Assuming direct JSON string (no recognized pattern found) for place_pk_id: ${place_pk_id}. Length: ${jsonStringToParse.length}`);
        }
      }
      
      // JSON 파싱 전처리 - 일반적인 JSON 오류 패턴 수정
      try {
        // 1. 이스케이프되지 않은 백슬래시를 이중 백슬래시로 변환 (JSON에서는 백슬래시가 이스케이프 문자로 사용됨)
        // 단, 이미 이스케이프된 문자(\n, \t, \", \\)는 건너뜀
        jsonStringToParse = jsonStringToParse.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
        
        // 2. 따옴표 안에 있는 대괄호 처리 (이미 따옴표로 묶인 문자열 내부의 대괄호는 이스케이프 필요 없음)
        // 정규식으로 문자열 내부를 정확히 처리하기는 복잡하므로, JSON.parse 오류가 발생하면 다른 방법 시도
        
        extractedJson = JSON.parse(jsonStringToParse);
        console.log(`[AI Analysis] JSON parsed successfully for place_pk_id: ${place_pk_id}.`);
      } catch (parseError: any) {
        console.error(`[AI Analysis JSON Parse Error] First attempt failed: ${parseError.message}`);
        
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
            
          console.log(`[AI Analysis] Attempting to parse fixed JSON: First 200 chars: ${fixedJsonString.substring(0, 200)}...`);
          extractedJson = JSON.parse(fixedJsonString);
          console.log(`[AI Analysis] JSON parsed successfully after fixing for place_pk_id: ${place_pk_id}.`);
        } catch (secondParseError: any) {
          // 두 번째 시도도 실패하면 더 강력한 방법: 문자열 파싱을 직접 수행
          try {
            console.log(`[AI Analysis] Second attempt failed: ${secondParseError.message}. Trying more aggressive fix...`);
            
            // 모든 백슬래시 앞에 백슬래시 추가 (이미 이스케이프된 것 포함)
            const aggressivelyFixedString = jsonStringToParse.replace(/\\/g, '\\\\')
              // 그런 다음 이중 이스케이프된 문자를 다시 단일로 복원
              .replace(/\\\\\"/g, '\\"')
              .replace(/\\\\\//g, '\\/')
              .replace(/\\\\n/g, '\\n')
              .replace(/\\\\t/g, '\\t')
              .replace(/\\\\r/g, '\\r')
              .replace(/\\\\\\\\/g, '\\\\');
              
            extractedJson = JSON.parse(aggressivelyFixedString);
            console.log(`[AI Analysis] JSON parsed successfully after aggressive fixing for place_pk_id: ${place_pk_id}.`);
          } catch (thirdParseError: any) {
            // 세번째 시도도 실패하면 특수 문자 더 강력하게 처리 + 문제 구간 직접 수정
            try {
              console.log(`[AI Analysis] Third attempt failed: ${thirdParseError.message}. Trying with special character sanitization...`);
              
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
              superFixedString = superFixedString.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
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
                
                console.log(`[AI Analysis] Problematic segment around position ${problematicPosition}: "${problematicSegment}"`);
                
                // 오류 근처에 있는 일반적인 JSON 구문 오류 패턴 수정
                // 배열 관련 오류인 경우 ([, ] 누락 또는 불필요한 쉼표)
                if (parseError.message.includes("array")) {
                  // 배열 요소 사이에 쉼표 누락인 경우 (}, {)
                  superFixedString = superFixedString.replace(/\}\s*\{/g, "},{");
                  // 배열 마지막에 불필요한 쉼표 있는 경우 (,])
                  superFixedString = superFixedString.replace(/,\s*\]/g, "]");
                  // 닫는 대괄호 누락 패턴 처리
                  const openBrackets = (superFixedString.match(/\[/g) || []).length;
                  const closeBrackets = (superFixedString.match(/\]/g) || []).length;
                  if (openBrackets > closeBrackets) {
                    superFixedString = superFixedString + "]".repeat(openBrackets - closeBrackets);
                  }
                }
              }
              
              // 마지막 JSON 수정 시도
              console.log(`[AI Analysis] Trying to parse super-fixed JSON: First 200 chars: ${superFixedString.substring(0, 200)}...`);
              extractedJson = JSON.parse(superFixedString);
              console.log(`[AI Analysis] JSON parsed successfully after super fixing for place_pk_id: ${place_pk_id}.`);
            } catch (finalParseError: any) {
              // 모든 시도 실패 시 원래 방식으로 오류 보고
              const errorPositionMatch = parseError.message.match(/position (\d+)/);
              const errorPosition = errorPositionMatch ? parseInt(errorPositionMatch[1], 10) : -1;
              let contextAroundError = "";
              if (errorPosition !== -1) {
                const start = Math.max(0, errorPosition - 30);
                const end = Math.min(jsonStringToParse.length, errorPosition + 30);
                contextAroundError = jsonStringToParse.substring(start, end);
              }

              console.error(`[AI Analysis JSON Parse Error] All parse attempts failed for place_pk_id: ${place_pk_id}.`);
              console.error(`[AI Analysis JSON Parse Error] Message: ${parseError.message}`);
              console.error(`[AI Analysis JSON Parse Error] Context around position ${errorPosition}: "...${contextAroundError}..."`);
              
              await updatePlaceError(place_pk_id, `JSON Parse Error: ${parseError.message} | Context: ${contextAroundError.replace(/"/g, "'")}`, 'json_parse_error');
              return new Response(JSON.stringify({ 
                error: 'AI model output parsing failed.', 
                details: parseError.message, 
                context: contextAroundError,
                rawOutputStart: jsonStringToParse.substring(0,200) 
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              });
            }
          }
        }
      }

    } catch (e: any) {
      console.error(`[AI Analysis Gemini Error] Failed to call Gemini API or parse JSON for place_pk_id: ${place_pk_id}`, e);
      let errorDetails = e.message || 'Gemini API call or JSON parsing failed.';
      if (e.response && typeof e.response.text === 'function') { 
         try {
           const errorText = await e.response.text();
           console.error('[AI Analysis Gemini Error] API Response Text:', errorText);
           errorDetails += ` Details: ${errorText}`;
         } catch (parseError) {
            console.error('[AI Analysis Gemini Error] Could not parse error response text.');
         }
      } else if (e.message) {
        console.error('[AI Analysis Gemini Error] Error message:', e.message);
      }
      // 원본 responseText도 오류 메시지에 포함 (디버깅용)
      if (typeof responseTextForErrorLogging !== 'undefined') {
        errorDetails += ` | Raw Response (first 200 chars): ${responseTextForErrorLogging.substring(0,200)}`;
      }
      
      await updatePlaceError(place_pk_id, errorDetails, 'gemini_api_call');
      return new Response(JSON.stringify({ error: 'AI model processing failed.', details: errorDetails }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!extractedJson?.basic_info?.place_address || !extractedJson?.basic_info?.place_name) {
      const errorMessage = `Extracted JSON missing place_address or place_name. Address: ${extractedJson?.basic_info?.place_address}, Name: ${extractedJson?.basic_info?.place_name}`;
      console.error(`[AI Analysis Validation Error] ${errorMessage} for place_pk_id: ${place_pk_id}`);
      await updatePlaceError(place_pk_id, errorMessage, 'validate_json');
      return new Response(JSON.stringify({ error: 'AI model output validation failed: Missing required fields.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log(`[AI Analysis] JSON validated for place_pk_id: ${place_pk_id}.`);

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
    console.log(`[AI Analysis] Updating places table for place_pk_id: ${place_pk_id}`);

    const { error: updateError, data: updateResult } = await supabaseAdmin
      .from('places')
      .update(updatePayload)
      .eq('id', place_pk_id)
      .select('id, status')
      .single();

    if (updateError) {
      await updatePlaceError(place_pk_id, updateError.message, 'update_db');
      return new Response(JSON.stringify({ error: 'Failed to update place data in DB.', details: updateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 확인: 업데이트가 실제로 이루어졌는지 검증
    if (!updateResult) {
      const errorMessage = 'DB update returned no result, possible update failure';
      console.error(`[AI Analysis DB Error] ${errorMessage} for place_pk_id: ${place_pk_id}`);
      await updatePlaceError(place_pk_id, errorMessage, 'update_db_verification');
      return new Response(JSON.stringify({ error: 'Failed to verify place data update.', details: errorMessage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 추가 검증: 상태가 'completed'로 변경되었는지 확인
    if (updateResult.status !== 'completed') {
      const errorMessage = `DB update status mismatch: expected 'completed', got '${updateResult.status}'`;
      console.error(`[AI Analysis DB Error] ${errorMessage} for place_pk_id: ${place_pk_id}`);
      await updatePlaceError(place_pk_id, errorMessage, 'update_db_status_mismatch');
      return new Response(JSON.stringify({ error: 'Failed to update place status correctly.', details: errorMessage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`[AI Analysis Success] Successfully processed and updated place_pk_id: ${place_pk_id}`);
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Place data processed and updated successfully.',
      place_id: place_pk_id,
      update_result: {
        id: updateResult.id,
        status: updateResult.status
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[AI Analysis Top Level Error]', error);
    if (placePkIdForErrorHandling) { // placePkIdForErrorHandling이 null이 아닐 때만 DB 업데이트 시도
      await updatePlaceError(placePkIdForErrorHandling, error.message || 'Unexpected error in AI function', 'top_level_catch');
    }
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});