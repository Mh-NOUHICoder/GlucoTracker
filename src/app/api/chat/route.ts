import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  console.log("Chat API: POST Request received");
  let lang = 'en';
  try {
    const body = await req.json();
    lang = body.lang || 'en';
    const { message, history = [], userName, context = [], modelId, provider } = body;

    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;

    let systemPrompt = `You are "Doctor AI", a Senior Metabolic Specialist and Diabetes Clinician. 
You are assisting ${userName || "a patient"} with metabolic monitoring.

ROLE PRINCIPLES:
1. AUTHORITY & EMPATHY: Speak as a highly experienced specialist. Be warm but medically precise.
2. CONCISENESS: Provide short, focused answers. Do not repeat greeting patterns unless it's the first message.
3. FORMATTING: Use plain text only. STRICTLY NO MARKDOWN (no bold, no italics, no lists with symbols). Separate paragraphs with double line breaks.
4. METABOLIC CONTEXT: Use the provided glucose data to offer specific, clinical-sounding insights.
5. LANGUAGE: Respond in ${lang}.

Current Clinical Context for this patient:
Current Time: ${new Date().toLocaleString('en-US')}
`;

    if (context && context.length > 0) {
      systemPrompt += `\nRecent Glucose History (Last 12 readings):\n`;
      context.forEach((r: any) => {
        systemPrompt += `- ${r.value} mg/dL at ${new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n`;
      });
      systemPrompt += `\nAnalyze these trends if the user asks about their status. Note any sudden spikes or lows.`;
    } else {
      systemPrompt += `\nNote: No recent glucose data is available for this session. Suggest the user upload a reading if they want specific advice.`;
    }

    const currentModelId = modelId || (provider === "openai" ? "gpt-4o-mini" : "gemini-2.0-flash");

    const executeOpenAI = async (modelName: string) => {
      if (!openAiKey) throw new Error("OpenAI Key Missing");
      const openai = new OpenAI({ apiKey: openAiKey });
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-10).map((h: any) => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
        { role: "user", content: message }
      ];
      const result = await openai.chat.completions.create({
        model: modelName,
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 500
      });
      return result.choices[0]?.message?.content?.trim() || "I am processing your clinical data.";
    };

    const executeGemini = async (modelName: string) => {
      if (!geminiKey) throw new Error("Gemini Key Missing");
      const genAI = new GoogleGenerativeAI(geminiKey);
      
      const chatHistory = history.slice(-10).map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }]
      }));

      if (chatHistory.length > 0 && chatHistory[0].role === "model") {
        chatHistory.unshift({ role: "user", parts: [{ text: "Hello Doctor." }] });
      }

      const chatModel = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemPrompt
      });

      const chat = chatModel.startChat({ history: chatHistory });
      const result = await chat.sendMessage(message);
      return result.response.text().trim();
    };

    let reply = "";
    try {
      if (provider === "openai" || (!provider && openAiKey && !geminiKey)) {
        try {
          reply = await executeOpenAI(currentModelId);
        } catch (err: any) {
          console.error("OpenAI Execution Error:", err);
          // If Quota reached or Timeout, try Gemini
          if (geminiKey) reply = await executeGemini("gemini-2.0-flash");
          else throw err;
        }
      } else {
        try {
          reply = await executeGemini(currentModelId);
        } catch (err: any) {
          console.error("Gemini Execution Error:", err);
          // Check for Quota Exceeded (429)
          if (err.message?.includes("429") || err.status === 429) {
             if (openAiKey) {
               console.log("Gemini Quota Reached. Falling back to OpenAI.");
               reply = await executeOpenAI("gpt-4o-mini");
             } else {
               const quotaMsg = lang === "ar" 
                 ? "عذراً، لقد استنفدت حصة الاستخدام المجانية للذكاء الاصطناعي حالياً. يرجى المحاولة مرة أخرى بعد قليل أو استخدام مفتاح API مختلف."
                 : "I apologize, but my AI core has reached its current processing quota. Please wait a moment before trying again as I recover my clinical focus.";
               return NextResponse.json({ reply: quotaMsg });
             }
          } else if (openAiKey) {
            reply = await executeOpenAI("gpt-4o-mini");
          } else {
            throw err;
          }
        }
      }

      return NextResponse.json({ reply });

    } catch (finalErr: any) {
       console.error("Doctor AI Chat Critical Fallback Error:", finalErr);
       throw finalErr;
    }

  } catch (err: any) {
    console.error("Doctor AI Chat Critical Error:", err);
    
    let errorMessage = lang === "ar" 
      ? "أعتذر منك، أواجه صعوبة في معالجة طلبك حالياً. يرجى التأكد من اتصال قاعدة البيانات ومفاتيح الـ API."
      : "I apologize, I am having trouble processing your request. Please ensure database connectivity and API keys are valid.";
    
    if (err.message?.includes("429") || err.status === 429) {
      errorMessage = lang === "ar"
        ? "عذراً، النظام الطبي مزدحم حالياً (تم تجاوز الحصة). يرجى الانتظار قليلاً والمحاولة مرة أخرى."
        : "The clinical AI system is currently overloaded (Quota Exceeded). Please allow a moment for the system to refresh.";
    }

    return NextResponse.json({ 
      reply: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    }, { status: 200 });
  }
}
