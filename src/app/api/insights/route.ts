import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { readings, lang } = await req.json();

    if (!readings || readings.length === 0) {
      return NextResponse.json({ insight: "" });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;

    if (!geminiKey && !openAiKey) {
      return NextResponse.json({ error: "No AI keys configured" }, { status: 500 });
    }

    const context = readings
      .map((r: any) => `Value: ${r.value} mg/dL, Date: ${r.created_at}`)
      .join("\n");

    const prompt = `
      You are a specialized metabolic health virtual assistant. 
      Analyze these recent glucose readings and provide a 1-2 sentence status report.
      Identify spikes or stable trends. Be encouraging.
      
      Data:
      ${context}
      
      Language: ${lang || 'en'}
      Output only the advice text in ${lang || 'en'}.
    `;

    // Priority list for insights - simplified to reduce quota drain
    const cascade = [
      { provider: "gemini", id: "gemini-2.0-flash" },
      { provider: "openai", id: "gpt-4o-mini" }
    ];

    let insight = "";
    let logs = "";

    for (const model of cascade) {
      if (model.provider === "gemini" && !geminiKey) continue;
      if (model.provider === "openai" && !openAiKey) continue;

      try {
        console.log(`Insight Cascade: Trying ${model.id}`);
        if (model.provider === "gemini") {
          const genAI = new GoogleGenerativeAI(geminiKey!);
          const res = await genAI.getGenerativeModel({ model: model.id }).generateContent(prompt);
          insight = res.response.text().trim();
        } else {
          const openai = new OpenAI({ apiKey: openAiKey! });
          const res = await openai.chat.completions.create({
            model: model.id,
            messages: [
              { role: "system", content: "You are a metabolic health assistant. Provide 1-2 sentence insights." },
              { role: "user", content: "Analyze these readings:\n" + context }
            ],
            max_tokens: 100
          });
          insight = res.choices[0]?.message?.content?.trim() || "";
        }

        if (insight) {
          console.log(`Insight Cascade SUCCESS with ${model.id}`);
          break;
        }
      } catch (err: any) {
        const isQuotaError = err.message.includes("429") || err.message.toLowerCase().includes("quota");
        console.warn(`Insight Cascade FAILED for ${model.id}:`, err.message);
        logs += ` [${model.id}: ${err.message}]`;
        
        // If it's a quota error, don't cascade further to save time and API respect
        if (isQuotaError) {
          console.error(`Quota reached for ${model.provider}. Aborting cascade.`);
          break; 
        }
      }
    }

    if (!insight) {
      // Backend heuristic fallback to avoid 500 errors in console
      const avg = readings.reduce((a: any, b: any) => a + Number(b.value), 0) / readings.length;
      if (avg > 180) insight = "Your readings are trending high. Consider reviewing your carbohydrate intake.";
      else if (avg < 70) insight = "Your levels are trending low. Please ensure you are following your snack routine.";
      else insight = "Your metabolic trends look stable. Keep up the consistent monitoring.";
      
      return NextResponse.json({ 
        insight, 
        isFallback: true,
        message: "Quota reached. Standard analysis applied." 
      });
    }

    return NextResponse.json({ insight });
  } catch (error: any) {
    console.error("Insights Fatal Error:", error);
    return NextResponse.json({ insight: "Metabolic analysis currently in standby.", isFallback: true }, { status: 200 });
  }
}
