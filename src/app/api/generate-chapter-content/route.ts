import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Helper to strip JSON markdown
function cleanJSON(text: string) {
  return JSON.parse(text.replace(/```json/g, "").replace(/```/g, ""));
}

export async function POST(req: Request) {
  // FIX: Define topic outside try/catch scope
  let topic = "Topic";
  
  try {
    const body = await req.json();
    topic = body.topic || "Topic"; // Assign it here
    const context = body.context;

    if (!process.env.GEMINI_API_KEY) throw new Error("No API Key");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are a Senior Developer Tutor.
      TOPIC: "${topic}"
      CONTEXT: "${context}"

      Generate a structured learning guide (JSON) to display alongside a video tutorial.
      
      RETURN JSON ONLY:
      {
        "summary": "A 2-sentence hook explaining why this concept matters.",
        "keyPoints": ["Point 1", "Point 2", "Point 3"],
        "codeSnippet": "Small, relevant code example (or null if conceptual)",
        "commonPitfalls": "One specific mistake beginners make here.",
        "analogy": "A simple real-world analogy (1 sentence)."
      }
    `;

    const result = await model.generateContent(prompt);
    const data = cleanJSON(result.response.text());
    return NextResponse.json(data);

  } catch (error) {
    console.error("Content Gen Error:", error);
    // FIX: Fallback now works because 'topic' is defined in the outer scope
    return NextResponse.json({
        summary: "Mastering " + topic + " is essential for this module.",
        keyPoints: ["Understand the syntax", "Practice the logic", "Review edge cases"],
        codeSnippet: null,
        commonPitfalls: "Skipping the foundational theory.",
        analogy: "It's like building a foundation before the house."
    });
  }
}