import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { readings, lang } = await req.json();

    if (!readings || readings.length === 0) {
      return NextResponse.json({ insight: "" });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;

    // Enhanced Fallback Heuristics (Localized & Prioritizing Latest Extremes)
    const getFallbackInsight = (data: any[], l: string) => {
      const values = data.map(r => Number(r.value));
      const latest = values[0];
      const prev = values[1] || latest;
      const diff = latest - prev;
      
      const isArabic = l === 'ar';
      const isFrench = l === 'fr';

      // 1. Extreme Latest (Immediate Priority)
      if (latest > 250) {
        if (isArabic) return `القراءة الأخيرة مرتفعة جداً (${latest}). يرجى التأكد من شرب الماء والاتصال بطبيبك إذا لزم الأمر.`;
        if (isFrench) return `Dernière lecture très élevée (${latest}). Pensez à vous hydrater et contactez votre médecin si nécessaire.`;
        return `Latest reading is very high (${latest}). Ensure hydration and contact your doctor if necessary.`;
      }
      if (latest < 60) {
        if (isArabic) return `تنبيه: قراءتك الأخيرة منخفضة جداً (${latest}). تناول مصدراً سريعاً للسكر فوراً.`;
        if (isFrench) return `Alerte: votre dernière lecture est très basse (${latest}). Consommez du sucre rapidement.`;
        return `Alert: your latest reading is very low (${latest}). Consume fast-acting sugar immediately.`;
      }

      // 2. Rapid Trends
      if (diff > 40) {
         if (isArabic) return `نلاحظ ارتفاعاً حاداً ومفاجئاً في مستواك (+${Math.round(diff)}). راقب الأعراض بدقة.`;
         if (isFrench) return `Nous remarquons une hausse brutale de votre glycémie (+${Math.round(diff)}). Surveillez vos symptômes.`;
         return `We notice a sharp, sudden rise in your glucose (+${Math.round(diff)}). Monitor symptoms closely.`;
      }
      if (diff < -40) {
        if (isArabic) return `انخفاض سريع جداً في مستواك (${Math.round(diff)}). تأكد من استقرار حالتك.`;
        if (isFrench) return `Baisse très rapide de votre glycémie (${Math.round(diff)}). Assurez-vous d'être stable.`;
        return `Very rapid drop in your levels (${Math.round(diff)}). Ensure you are feeling stable.`;
      }

      // 3. Overall Average
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg > 180) {
        if (isArabic) return "قراءاتك العامة تميل للارتفاع. قد تحتاج لمراجعة روتينك الغذائي.";
        if (isFrench) return "Vos lectures globales sont élevées. Une revue de votre routine pourrait être utile.";
        return "Your overall readings are trending high. A review of your routine might be helpful.";
      }
      
      if (avg < 70) {
        if (isArabic) return "تميل مستوياتك للانخفاض بشكل متكرر. ناقش هذا مع فريقك الطبي.";
        if (isFrench) return "Vos niveaux tendent à être bas fréquemment. Discutez-en avec votre médecin.";
        return "Your levels tend to stay low frequently. Discuss this pattern with your medical team.";
      }

      // 4. Standard Stable
      if (isArabic) return `إدارة جيدة. قراءتك الأخيرة (${latest}) ضمن الاتجاهات المستقرة حالياً.`;
      if (isFrench) return `Bonne gestion. Votre lecture de (${latest}) est dans la continuité de votre stabilité.`;
      return `Good management. Your latest reading (${latest}) continues your current stable trend.`;
    };

    if (!geminiKey && !openAiKey) {
      return NextResponse.json({ insight: getFallbackInsight(readings, lang), isFallback: true });
    }

    const context = readings
      .map((r: { value: number | string; created_at: string }) => `Value: ${r.value} mg/dL, Date: ${r.created_at}`)
      .join("\n");

    const prompt = `
      You are a specialized metabolic health assistant. 
      Analyze these readings and provide ONE unique, personalized insight.
      IMPORTANT: Explicitly mention the latest value (${readings[0].value} mg/dL) in your message.
      If the reading is high (e.g. 262), acknowledge it and suggest a specific action.
      
      Data:
      ${context}
      
      Language: ${lang || 'en'}
      Output only the insight in ${lang || 'en'}. No intro.
    `;

    const cascade = [
      { provider: "gemini", id: "gemini-2.0-flash" },
      { provider: "openai", id: "gpt-4o-mini" }
    ];

    let insight = "";

    for (const model of cascade) {
      if (model.provider === "gemini" && !geminiKey) continue;
      if (model.provider === "openai" && !openAiKey) continue;

      try {
        if (model.provider === "gemini") {
          const genAI = new GoogleGenerativeAI(geminiKey!);
          const res = await genAI.getGenerativeModel({ model: model.id }).generateContent(prompt);
          insight = res.response.text().trim();
        } else {
          const openai = new OpenAI({ apiKey: openAiKey! });
          const res = await openai.chat.completions.create({
            model: model.id,
            messages: [
              { role: "system", content: "You are a metabolic health assistant. Mention the latest value exactly." },
              { role: "user", content: "Latest: " + readings[0].value + "\nContext:\n" + context }
            ],
            max_tokens: 100
          });
          insight = res.choices[0]?.message?.content?.trim() || "";
        }

        if (insight && insight.length > 5) break; 
      } catch (err) {
        console.warn(`Insight Cascade FAILED`);
      }
    }

    if (!insight) {
      return NextResponse.json({ 
        insight: getFallbackInsight(readings, lang), 
        isFallback: true 
      });
    }

    return NextResponse.json({ insight });
  } catch (error: unknown) {
    return NextResponse.json({ insight: "Metabolic analysis currently in standby.", isFallback: true }, { status: 200 });
  }
}
