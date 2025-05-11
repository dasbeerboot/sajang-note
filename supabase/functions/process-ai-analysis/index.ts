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
const geminiModelName = Deno.env.get('GEMINI_MODEL_NAME') || 'gemini-1.5-flash-latest'; 

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
  let responseTextForErrorLogging: string = ""; // responseText를 더 넓은 스코프에서 접근 가능하게 함

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
      const jsonMatch = jsonStringToParse.match(/^```json\n([\s\S]*?)\n```$/);

      if (jsonMatch && jsonMatch[1]) {
        jsonStringToParse = jsonMatch[1].trim(); 
        console.log(`[AI Analysis] Extracted JSON string (from code block) for place_pk_id: ${place_pk_id}. Length: ${jsonStringToParse.length}`);
      } else {
        console.log(`[AI Analysis] Assuming direct JSON string (no code block found) for place_pk_id: ${place_pk_id}. Length: ${jsonStringToParse.length}`);
      }
      
      try {
        extractedJson = JSON.parse(jsonStringToParse);
        console.log(`[AI Analysis] JSON parsed successfully for place_pk_id: ${place_pk_id}.`);
      } catch (parseError: any) {
        const errorPositionMatch = parseError.message.match(/position (\d+)/);
        const errorPosition = errorPositionMatch ? parseInt(errorPositionMatch[1], 10) : -1;
        let contextAroundError = "";
        if (errorPosition !== -1) {
          const start = Math.max(0, errorPosition - 30);
          const end = Math.min(jsonStringToParse.length, errorPosition + 30);
          contextAroundError = jsonStringToParse.substring(start, end);
        }

        console.error(`[AI Analysis JSON Parse Error] Failed to parse JSON string for place_pk_id: ${place_pk_id}.`);
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

    } catch (e: any) { // model.generateContent() 또는 response.text() 오류
      console.error(`[AI Analysis Gemini Error] Failed to call Gemini API or process its response for place_pk_id: ${place_pk_id}`, e);
      let errorDetails = e.message || 'Gemini API call or response processing failed.';
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
      if (responseTextForErrorLogging) { 
        errorDetails += ` | Raw Response (first 200 chars): ${responseTextForErrorLogging.substring(0,200)}`;
      }
      
      await updatePlaceError(place_pk_id, errorDetails, 'gemini_api_call_or_response_error');
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

    const { error: updateError } = await supabaseAdmin
      .from('places')
      .update(updatePayload)
      .eq('id', place_pk_id);

    if (updateError) {
      await updatePlaceError(place_pk_id, updateError.message, 'update_db');
      return new Response(JSON.stringify({ error: 'Failed to update place data in DB.', details: updateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`[AI Analysis Success] Successfully processed and updated place_pk_id: ${place_pk_id}`);
    return new Response(JSON.stringify({ success: true, message: 'Place data processed and updated successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[AI Analysis Top Level Error]', error);
    if (placePkIdForErrorHandling) { 
      await updatePlaceError(placePkIdForErrorHandling, error.message || 'Unexpected error in AI function', 'top_level_catch');
    }
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});