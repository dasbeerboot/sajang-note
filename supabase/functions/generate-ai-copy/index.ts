/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from 'https://esm.sh/@google/generative-ai@0.11.4';

// 환경 변수
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const geminiModelName = Deno.env.get('GEMINI_MODEL_NAME') || 'gemini-1.5-flash-latest';

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
  console.error('Missing one or more required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
const genAI = new GoogleGenerativeAI(geminiApiKey!);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const generationConfig: GenerationConfig = {
  temperature: 1.6,
};

interface RequestPayload {
  placeId: string;
  copyType: string;
  userPrompt?: string;
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
    const requestPayload: RequestPayload = await req.json();
    const { placeId, copyType, userPrompt } = requestPayload;

    if (!placeId || !copyType) {
      return new Response(JSON.stringify({ error: 'placeId와 copyType은 필수입니다' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. 매장 정보 가져오기
    const { data: placeData, error: placeError } = await supabaseAdmin
      .from('places')
      .select('place_name, place_address, crawled_data')
      .eq('id', placeId)
      .single();

    if (placeError) {
      return new Response(JSON.stringify({ error: '매장 정보를 가져올 수 없습니다' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // 2. 프롬프트 템플릿 가져오기
    const promptName = `${copyType}_prompt_v1`;
    const { data: promptData, error: promptError } = await supabaseAdmin
      .from('prompts')
      .select('prompt_content')
      .eq('prompt_name', promptName)
      .single();
      
    if (promptError) {
      return new Response(JSON.stringify({ error: `프롬프트를 가져올 수 없습니다: ${promptName}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 3. 매우 단순하게 프롬프트 구성
    // 프롬프트 + crawled_data + 사용자 요청사항
    let fullPrompt = promptData.prompt_content;
    
    // crawled_data 추가
    fullPrompt += "\n\n---\n제공된 데이터:\n";
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
    
    // 4. Gemini API 호출
    const model = genAI.getGenerativeModel({
      model: geminiModelName,
      safetySettings,
      generationConfig
    });
    
    try {
      const result = await model.generateContent(fullPrompt);
      const generatedText = result.response.text();
      
      return new Response(JSON.stringify({ generatedCopy: generatedText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (aiError) {
      return new Response(JSON.stringify({ 
        error: 'AI 생성 중 오류가 발생했습니다',
        errorMessage: aiError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
    
  } catch (error) {
    return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}); 