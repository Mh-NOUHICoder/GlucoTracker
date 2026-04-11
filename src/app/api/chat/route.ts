import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { message, history = [], lang = 'en', userName, context = [] } = await req.json();

    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;

    let systemPrompt = `You are "Doctor AI", a Caring Specialist Doctor and Metabolic Clinician assisting ${userName || "a patient"}. 
You specialize in diabetes management and glucose tracking.
Tone: Extremely empathetic, professional, reassuring, yet medically authoritative.
Respond directly and conversationally in the same language the user is speaking (${lang}). Do NOT use markdown formatting like **bold text**, asterisks, lists, or headers. Provide plain text responses structured naturally with paragraphs, suitable for a text message bubble. Keep responses reasonably concise like a chat message. Make sure the user feels deeply cared for.
`;

    if (context && context.length > 0) {
      systemPrompt += `\nRecent glucose readings context for this patient (Live Sync Active):\n`;
      context.forEach((r: any) => {
        systemPrompt += `- ${r.value} mg/dL at ${new Date(r.created_at).toLocaleString('en-US')}\n`;
      });
      systemPrompt += `\nUse this data naturally if it's relevant to their question or to offer specific insights. If they ask about their current status or recent readings, reference these.`;
    }

    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const chatHistory = history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }]
      }));

      if (chatHistory.length > 0 && chatHistory[0].role === "model") {
        chatHistory.unshift({ role: "user", parts: [{ text: "Hello Doctor." }] });
      }

      // In gemini we pass system instruct using systemInstruction property for models that support it, 
      // but to be compatible out of the box with standard flash chat initialization, we can just inject it as the first message or use systemInstruction.
      // We will use systemInstruction if the model supports it, but since 'getGenerativeModel' takes systemInstruction, we'll configure it directly.
      const chatModel = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt
      });

      const chat = chatModel.startChat({
        history: chatHistory,
      });

      const result = await chat.sendMessage(message);
      return NextResponse.json({ reply: result.response.text().trim() });
    } else if (openAiKey) {
      const openai = new OpenAI({ apiKey: openAiKey });
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map((h: any) => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
        { role: "user", content: message }
      ];

      const result = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages as any,
        max_tokens: 400
      });

      return NextResponse.json({ reply: result.choices[0]?.message?.content?.trim() || "I am here to help." });
    } else {
       const fallback = lang === "ar" ? "أنا طبيبك الذكي للمتابعة. (يتطلب إعداد المفتاح للرد الحي)" : "I am your caring Doctor AI. (API key needed for live response)";
       return NextResponse.json({ reply: fallback });
    }

  } catch (err: any) {
    console.error("Doctor AI Chat Error:", err);
    return NextResponse.json({ reply: "I apologize, but I am having trouble connecting to my clinical database right now. Please try again in a moment." }, { status: 200 });
  }
}
