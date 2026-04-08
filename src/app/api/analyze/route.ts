import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

const PROMPT_SYSTEM = "You are a specialized medical AI tasked with reading glucose meter displays from user-provided images. Analyze the image to extract the glucose reading (mg/dL, mmol/L, or g/L). Respond solely with a highly structured JSON object representing the data found. If no valid reading can be found, return { \"error\": \"No clear glucose reading found.\" }";
const PROMPT_USER = "Extract the exact glucose value shown on this screen. Provide the output in strict JSON format with keys: `value` (number) and `unit` (string, either mg/dL, mmol/L, or g/L). Only output the JSON object without code block formatting.";

async function analyzeWithOpenAI(imageBase64: string, apiKey: string, modelId: string = "gpt-4o") {
  console.log(`Attempting analysis with OpenAI (${modelId})...`);
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: PROMPT_SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT_USER },
          { type: "image_url", image_url: { url: imageBase64 } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 150,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response content from OpenAI");
  
  return JSON.parse(content);
}

async function analyzeWithGemini(imageBase64: string, apiKey: string, modelId: string = "gemini-2.0-flash") {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  // Extract base64 and mime payload from the data URL format
  const [header, base64Data] = imageBase64.split(",");
  const mimeType = header.split(":")[1].split(";")[0];

  const result = await model.generateContent([
    `${PROMPT_SYSTEM}\n\n${PROMPT_USER}`,
    { inlineData: { data: base64Data, mimeType } }
  ]);

  const text = result.response.text();
  
  // Gemini might output with ```json code blocks, so we need to clean it up safely
  const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  return JSON.parse(cleanedText);
}

export async function POST(req: Request) {
  try {
    const { imageBase64, preferredModelId, preferredProvider } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const openAiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!openAiKey && !geminiKey) {
      return NextResponse.json({ error: "No API keys configured" }, { status: 500 });
    }

    // Define a prioritized cascade of models to try
    const modelCascade = [
      // State-of-the-Art (2026 Picks)
      { provider: "openai", id: "gpt-5.4-mini" },
      { provider: "gemini", id: "gemini-2.5-flash" },
      { provider: "openai", id: "gpt-4.1-mini" },
      { provider: "gemini", id: "gemini-2.0-flash" },
      // Balanced Reliability
      { provider: "openai", id: "gpt-4o-mini" },
      { provider: "gemini", id: "gemini-pro-latest" },
      // Legacy Fallbacks
      { provider: "openai", id: "gpt-4o" },
      { provider: "openai", id: "gpt-3.5-turbo" }
    ];

    // If user has a preference, prioritize it at the top
    if (preferredProvider && preferredModelId) {
      modelCascade.unshift({ provider: preferredProvider, id: preferredModelId });
    }

    let parsedData = null;
    let fallbackLogs = "";

    // Iterate through the cascade until one succeeds
    for (const model of modelCascade) {
      // Skip if key for provider is missing
      if (model.provider === "openai" && !openAiKey) continue;
      if (model.provider === "gemini" && !geminiKey) continue;

      try {
        console.log(`Cascade: Trying ${model.provider} with ${model.id}...`);
        
        if (model.provider === "openai" && openAiKey) {
          parsedData = await analyzeWithOpenAI(imageBase64, openAiKey, model.id);
        } else if (model.provider === "gemini" && geminiKey) {
          parsedData = await analyzeWithGemini(imageBase64, geminiKey, model.id);
        }

        if (parsedData && !parsedData.error) {
          console.log(`Cascade SUCCESS with ${model.id}`);
          break; // Stop once we have data
        } else if (parsedData?.error) {
          fallbackLogs += ` [${model.id} logic error: ${parsedData.error}]`;
          parsedData = null; // reset for next try
        }
      } catch (err: unknown) {
        const dErr = err as Error;
        console.warn(`Cascade FAILED for ${model.id}:`, dErr.message);
        fallbackLogs += ` [${model.id} failed: ${dErr.message}]`;
      }
    }

    if (!parsedData) {
      return NextResponse.json(
        { error: "AI Analysis exhausted all available models. Quota or technical failure across all providers. Logs: " + fallbackLogs },
        { status: 500 }
      );
    }
    
    // Normalize g/L to mg/dL (1 g/L = 100 mg/dL)
    if (parsedData.unit === "g/L" || parsedData.unit === "g/l") {
       parsedData.value = parsedData.value * 100;
       parsedData.unit = "mg/dL";
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: unknown) {
    const apiError = error as Error;
    console.error("Critical API Execution Error:", apiError);
    return NextResponse.json(
      { error: apiError.message || "Failed to analyze image" },
      { status: 500 }
    );
  }
}
