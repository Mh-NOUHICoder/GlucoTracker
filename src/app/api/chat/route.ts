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

    let systemPrompt = `You are "Doctor AI", a Caring Specialist Doctor and Metabolic Clinician assisting ${userName || "a patient"}. 
You specialize in diabetes management and glucose tracking.
Tone: Extremely empathetic, professional, reassuring, yet medically authoritative.
Important constraints:
- Be extremely precise and to the point.
- Keep your answers short. Strictly avoid long-winded answers unless explicitly asked.
- Respond directly and conversationally in the same language the user is speaking (${lang}). Do NOT use markdown formatting like **bold text**, asterisks, lists, or headers. Provide plain text responses structured naturally with paragraphs, suitable for a text message bubble. Make sure the user feels deeply cared for.

Current Date and Time: ${new Date().toLocaleString('en-US')}. Use this current time to provide better and clear context when analyzing the user's data values.
`;

    if (context && context.length > 0) {
      systemPrompt += `\nRecent glucose readings context for this patient (Live Sync Active):\n`;
      context.forEach((r: any) => {
        systemPrompt += `- ${r.value} mg/dL at ${new Date(r.created_at).toLocaleString('en-US')}\n`;
      });
      systemPrompt += `\nUse this data naturally if it's relevant to their question or to offer specific insights. If they ask about their current status or recent readings, reference these.`;
    }

    const useGemini = provider === "gemini" ? geminiKey : (provider === "openai" ? false : geminiKey);
    const useOpenAI = provider === "openai" ? openAiKey : (provider === "gemini" ? false : openAiKey);

    const executeOpenAI = async (modelName: string) => {
      const openai = new OpenAI({ apiKey: openAiKey });
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map((h: any) => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
        { role: "user", content: message }
      ];
      const result = await openai.chat.completions.create({
        model: modelName,
        messages: messages as any,
        max_tokens: 400
      });
      return result.choices[0]?.message?.content?.trim() || "I am here to help.";
    };

    const executeGemini = async (modelName: string) => {
      const genAI = new GoogleGenerativeAI(geminiKey || "");
      const chatHistory = history.map((h: any) => ({
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

    if (useGemini && geminiKey) {
      try {
        const reply = await executeGemini(modelId || "gemini-2.0-flash");
        return NextResponse.json({ reply });
      } catch (err: any) {
        console.error(`[Doctor AI] Gemini Error:`, err);
        if (openAiKey) {
           console.log(`[Doctor AI] Attempting OpenAI Fallback...`);
           try {
             const reply = await executeOpenAI("gpt-4o-mini");
             return NextResponse.json({ reply });
           } catch (openAiErr: any) {
             console.error(`[Doctor AI] OpenAI Fallback failed:`, openAiErr);
             throw new Error("Both AI providers failed.");
           }
        }
        throw err;
      }
    } else if (useOpenAI && openAiKey) {
      try {
        const reply = await executeOpenAI(modelId || "gpt-4o-mini");
        return NextResponse.json({ reply });
      } catch (err: any) {
        console.error(`[Doctor AI] OpenAI Error:`, err);
        if (geminiKey) {
           console.log(`[Doctor AI] Attempting Gemini Fallback...`);
           try {
             const reply = await executeGemini("gemini-2.0-flash");
             return NextResponse.json({ reply });
           } catch (geminiErr: any) {
             console.error(`[Doctor AI] Gemini Fallback failed:`, geminiErr);
             throw new Error("Both AI providers failed.");
           }
        }
        throw err;
      }
    } else {
       const fallback = lang === "ar" 
         ? "أنا طبيبك الذكي للمتابعة. يرجى التأكد من إعداد مفاتيح التشغيل (API Keys) في إعدادات النظام للرد المباشر." 
         : "I am your caring Doctor AI. Please ensure API keys are configured in the system environment for live responses.";
       return NextResponse.json({ reply: fallback });
    }

  } catch (err: any) {
    console.error("Doctor AI Chat Critical Error:", err);
    // Return a more descriptive error if possible, or a cleaner fallback
    const errorMessage = lang === "ar" 
      ? "أعتذر منك، أواجه صعوبة في معالجة طلبك حالياً. قد يكون هناك ضغط على النظام أو مشكلة في الاتصال بمزود الخدمة. يرجى المحاولة مرة أخرى بعد قليل."
      : "I apologize, but I am having trouble processing your request right now. There might be a temporary service outage or connection issue. Please try again in a moment.";
    
    return NextResponse.json({ 
      reply: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    }, { status: 200 });
  }
}
