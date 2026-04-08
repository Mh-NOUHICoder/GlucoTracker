import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  const models: { id: string, provider: string, name: string }[] = [];

  // Fetch OpenAI models
  const openAiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const openai = new OpenAI({ apiKey: openAiKey });
      const response = await openai.models.list();
      
      response.data.forEach((m) => {
        // filter useful ones visually
        if (m.id.startsWith("gpt-") || m.id.includes("vision")) {
           models.push({ id: m.id, provider: "openai", name: m.id });
        }
      });
    } catch {
      console.error("Failed to list OpenAI models");
    }
  }

  // Fetch Gemini Models
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      if (res.ok) {
        const data = await res.json();
        const geminiModels = data.models || [];
        geminiModels.forEach((m: { supportedGenerationMethods: string[], name: string, displayName?: string }) => {
          if (m.supportedGenerationMethods.includes("generateContent")) {
             models.push({ 
               id: m.name.replace("models/", ""), 
               provider: "gemini", 
               name: m.displayName || m.name 
             });
          }
        });
      }
    } catch {
      console.error("Failed to list Gemini models");
    }
  }

  return NextResponse.json({ models });
}
