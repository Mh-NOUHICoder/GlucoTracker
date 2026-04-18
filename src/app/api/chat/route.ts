import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; // Allow longer execution times on Vercel

export async function POST(req: Request) {
  console.log("Chat API: POST Request received");
  let lang = 'en';
  try {
    const body = await req.json();
    lang = body.lang || 'en';
    const { message, history = [], userName, context = [], modelId, provider } = body;

    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
    const groqKey = process.env.Groq_API_KEY || process.env.GROQ_API_KEY;

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
        const dateStr = new Date(r.created_at).toLocaleDateString('en-US');
        const timeStr = new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        systemPrompt += `- ${r.value} mg/dL on ${dateStr} at ${timeStr}\n`;
      });
      systemPrompt += `\nAnalyze these trends if the user asks about their status. Note any sudden spikes or lows.`;
    } else {
      systemPrompt += `\nNote: No recent glucose data is available for this session. Suggest the user upload a reading if they want specific advice.`;
    }

    const currentModelId = modelId || (provider === "openai" ? "gpt-4o-mini" : provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-2.0-flash");

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

    const executeGroq = async (modelName: string) => {
      if (!groqKey) throw new Error("Groq Key Missing");
      const openai = new OpenAI({ 
        apiKey: groqKey,
        baseURL: "https://api.groq.com/openai/v1"
      });
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
    
    const tryGeminiFallback = async (originalErr: any) => {
      if (geminiKey) {
        console.log("Attempting Gemini fallback...");
        try {
          return await executeGemini("gemini-2.0-flash");
        } catch (fallbackErr) {
          console.log("Gemini fallback also failed.");
        }
      }
      throw originalErr;
    };

    const tryOpenAIFallback = async (originalErr: any) => {
      if (openAiKey) {
         console.log("Attempting OpenAI fallback...");
         try {
           return await executeOpenAI("gpt-4o-mini");
         } catch (fallbackErr) {
           console.log("OpenAI fallback also failed.");
           // If OpenAI fallback fails, we want to know if it was a quota error.
           // Throwing fallbackErr preserves the 429 status for the final catch.
           throw fallbackErr;
         }
      }
      throw originalErr;
    };

    const tryGroqFallback = async (originalErr: any) => {
      if (groqKey) {
         console.log("Attempting Groq fallback...");
         try {
           return await executeGroq("llama-3.3-70b-versatile");
         } catch (fallbackErr) {
           console.log("Groq fallback also failed.");
           throw fallbackErr;
         }
      }
      throw originalErr;
    };

    if (provider === "groq") {
      try {
        reply = await executeGroq(currentModelId);
      } catch (err: any) {
        reply = await tryGeminiFallback(err);
      }
    } else if (provider === "openai" || (!provider && openAiKey && !geminiKey)) {
      try {
        reply = await executeOpenAI(currentModelId);
      } catch (err: any) {
        reply = await tryGroqFallback(err);
      }
    } else {
      try {
        reply = await executeGemini(currentModelId);
      } catch (err: any) {
        // Only fallback to Groq or OpenAI if it's a quota issue or generic error
        try {
          reply = await tryGroqFallback(err);
        } catch (fallbackErr) {
          reply = await tryOpenAIFallback(fallbackErr);
        }
      }
    }

    return NextResponse.json({ reply });

  } catch (err: any) {
    // Determine if it is a quota issue
    const isQuotaError = 
      err?.status === 429 || 
      err?.code === 'insufficient_quota' || 
      err?.message?.includes("429") || 
      err?.message?.includes("quota");

    if (isQuotaError) {
      console.warn("Doctor AI Chat Quota Exceeded (429). Returning graceful fallback message.");
    } else {
      console.error("Doctor AI Chat Error:", err?.message || "Unknown Error");
    }
    
    let errorMessage = lang === "ar" 
      ? "أعتذر منك، أواجه صعوبة في معالجة طلبك حالياً."
      : "I apologize, I am having trouble processing your request.";
    
    if (isQuotaError) {
      errorMessage = lang === "ar"
        ? "عذراً، النظام الطبي مزدحم حالياً (تم تجاوز الحصة). يرجى الانتظار قليلاً والمحاولة مرة أخرى."
        : "The clinical AI system is currently overloaded (Quota Exceeded). Please allow a moment for the system to refresh.";
    }

    return NextResponse.json({ 
      reply: errorMessage,
      error: process.env.NODE_ENV === 'development' ? (err?.message || "API Error") : undefined 
    }, { status: 200 });
  }
}
