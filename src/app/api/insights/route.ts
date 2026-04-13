import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { readings, lang, modelId, provider } = await req.json();

    if (!readings || readings.length === 0) {
      return NextResponse.json({ insight: "" });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;

    // Enhanced Fallback Heuristics (Localized & Prioritizing Latest Extremes)
    const getFallbackInsight = (data: { value: number | string }[], l: string) => {
      const values = data.map(r => Number(r.value));
      const latest = values[0];
      const prev = values[1] || latest;
      const diff = latest - prev;
      
      const isArabic = l === 'ar';
      const isFrench = l === 'fr';

      // 1. Extreme Latest (Immediate Priority)
      if (latest > 250) {
        if (isArabic) return `بصفتي أخصائي السكري المتابع لك، قراءتك الأخيرة مرتفعة جداً (${latest}). يرجى شرب الماء، التحقق من الكيتونات، والتواصل معي فوراً إذا لزم الأمر.`;
        if (isFrench) return `En tant que clinicien, je m'inquiète de cette glycémie très élevée (${latest}). Hydratez-vous bien et contactez mon cabinet si cela persiste.`;
        return `As your diabetes specialist, I'm concerned by this high reading (${latest}). Please hydrate, check ketones, and contact our clinic if needed.`;
      }
      if (latest < 60) {
        if (isArabic) return `تحذير طبي: مستواك منخفض جداً حالياً (${latest}). تناول 15 جراماً من السكر السريع فوراً وأعد الفحص بعد 15 دقيقة.`;
        if (isFrench) return `Urgence médicale: votre taux est critique (${latest}). Prenez 15g de sucre rapide immédiatement et re-testez dans 15 min.`;
        return `Medical Alert: Your level is critically low (${latest}). Consume 15g of fast-acting carbs immediately and re-test in 15 minutes.`;
      }

      // 2. Rapid Trends
      if (diff > 40) {
         if (isArabic) return `التحليل السريري يظهر ارتفاعاً حاداً مفاجئاً (+${Math.round(diff)}). تأكد من جرعة الأنسولين أو النشاط البدني الأخير.`;
         if (isFrench) return `L'analyse clinique indique une montée subite (+${Math.round(diff)}). Vérifiez votre dernière dose ou repas.`;
         return `Clinical observation: I see a sudden, sharp rise in your levels (+${Math.round(diff)}). Please review your recent insulin or carb intake.`;
      }
      if (diff < -40) {
        if (isArabic) return `هناك انخفاض سريع جداً في مستوياتك (${Math.round(diff)}). كطبيبك، أنصحك بالتأكد من استقرارك وتجنب النشاط الشاق الآن.`;
        if (isFrench) return `Votre glycémie chute très rapidement (${Math.round(diff)}). Assurez-vous d'être stable avant toute activité.`;
        return `I've noted a very rapid drop in your levels (${Math.round(diff)}). Please verify your stability immediately and avoid heavy activity.`;
      }

      // 3. Overall Average
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg > 180) {
        if (isArabic) return "معدل قراءاتك يميل للارتفاع المستمر. نحتاج لمراجعة خطتك العلاجية والغذائية في موعدنا القادم.";
        if (isFrench) return "Votre moyenne glycémique est trop élevée. Nous devrons ajuster votre protocole lors de notre prochaine consultation.";
        return "Your overall glycemic average is trending high. We may need to adjust your protocol during our next consultation.";
      }
      
      if (avg < 70) {
        if (isArabic) return "ألاحظ ميلاً لتكرار انخفاض السكر. يرجى توثيق ما يسبق هذه الحالات لمناقشتها طبياً.";
        if (isFrench) return "Je remarque des hypoglycémies fréquentes. Notez vos activités pour que nous puissions en discuter.";
        return "I'm noticing frequent low patterns. Please document your pre-event activities so we can review them clinically.";
      }

      // 4. Standard Stable
      if (isArabic) return `قراءتك الأخيرة (${latest}) تعكس استقراراً جيداً. استمر في اتباع خطتنا العلاجية الحالية بدقة.`;
      if (isFrench) return `Excellent contrôle. Votre lecture de (${latest}) confirme la stabilité de votre gestion métabolique.`;
      return `Excellent management. Your recent reading of (${latest}) confirms the stability of your current metabolic protocol.`;
    };

    if (!geminiKey && !openAiKey) {
      return NextResponse.json({ insight: getFallbackInsight(readings, lang), isFallback: true });
    }

    const context = readings
      .map((r: { value: number | string; created_at: string }) => {
        const d = new Date(r.created_at);
        const timeOfDay = d.getHours() >= 5 && d.getHours() < 11 ? "Morning (Fasting/Breakfast)" : 
                          d.getHours() >= 11 && d.getHours() < 16 ? "Afternoon (Lunch)" :
                          d.getHours() >= 16 && d.getHours() < 22 ? "Evening (Dinner)" : "Night (Fasting/Sleep)";
        return `Value: ${r.value} mg/dL, Time: ${d.toLocaleString('en-US')} [${timeOfDay}]`;
      })
      .join("\n");

    const prompt = `
      You are a specialized Diabetes Specialist and Metabolic Clinician. 
      Analyze these readings and provide ONE professional, clinical, yet caring insight.
      IMPORTANT: Explicitly mention the latest value (${readings[0].value} mg/dL) as a focal point.
      CRITICAL INSTRUCTION: Pay close attention to the dates, times, and provided time-of-day context. Consider whether changes represent normal post-meal (after repat) spikes, fasting states, or concerning trends based on the time intervals between readings.
      If the reading is high, advise professional caution (e.g., checking ketones or hydration).
      If the reading is stable, offer clinical encouragement.
      
      Persona: Professional, Authoritative but Caring, Medical Expert.
      
      Data:
      ${context}
      
      Language: ${lang || 'en'}
      Output ONLY the insight in ${lang || 'en'}. No intro like "Based on my analysis". 
      Begin directly with the observation.
    `;

    const preferredModel = (modelId && provider) ? { id: modelId, provider } : null;

    const baseCascade = [
      { provider: "gemini", id: "gemini-2.0-flash" },
      { provider: "openai", id: "gpt-4o-mini" }
    ];

    const cascade = preferredModel 
      ? [preferredModel, ...baseCascade.filter(m => m.id !== preferredModel.id)]
      : baseCascade;

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
              { role: "system", content: "You are a metabolic health assistant. Mention the latest value exactly. Take the time of day and possible meal times into account when deducing patterns." },
              { role: "user", content: "Latest: " + readings[0].value + "\nContext:\n" + context }
            ],
            max_tokens: 150
          });
          insight = res.choices[0]?.message?.content?.trim() || "";
        }

        if (insight && insight.length > 5) break; 
      } catch (err: any) {
        console.warn(`Insight Cascade Failed for ${model.id}:`, err.message || err);
        // If 429, don't wait, just move to next
      }
    }

    if (!insight) {
      return NextResponse.json({ 
        insight: getFallbackInsight(readings, lang), 
        isFallback: true 
      });
    }

    return NextResponse.json({ insight });
  } catch {
    return NextResponse.json({ insight: "Metabolic analysis currently in standby.", isFallback: true }, { status: 200 });
  }
}
