import { generateContentWithFailover } from "@/utils/gemini";
import { NextResponse } from "next/server";
import { safeParseJsonObject } from "@/utils/safeJsonParser";

export async function POST(req: Request) {
  // FIX: Define topic outside try/catch scope
  let topic = "Topic";

  try {
    const body = await req.json();
    topic = body.topic || "Topic"; // Assign it here
    const context = body.context;

    // 🧠 2. The Creative Prompt (Moved up)
    const prompt = `
      You are an expert technical tutor "bridging the gap" for a student watching a video tutorial.
      TOPIC: "${topic}"
      CONTEXT: "${context}"

      Generate a high-quality, specific learning guide (JSON).
      
      REQUIREMENTS:
      1. "briefing": A technical summary of the video's intro. "In this lesson, we will explore..."
      2. "keyTerms": A dictionary of 3-4 HARD/TECHNICAL terms used in this topic with clear, simple definitions.
      3. "syntax": Actual code syntax or formula if relevant (use clear text, NO LaTeX '$$', use 'x^2' or standard notation).
      4. "trapCard": A subtle, non-obvious mistake professionals make (not just "syntax error").
      5. "analogy": A brilliant, memorable mental model.

      RETURN JSON ONLY:
      {
        "summary": "Technical briefing of the lesson scope...",
        "keyPoints": [
            { "term": "Term 1", "def": "Simple definition..." },
            { "term": "Term 2", "def": "Simple definition..." }
        ],
        "codeSnippet": "Code or Formula (optional)",
        "commonPitfalls": "Advanced gotcha...",
        "analogy": "Mental model..."
      }
    `;

    const result = await generateContentWithFailover(prompt);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = safeParseJsonObject<any>(result.text);

    // Validate Schema (Failover Trigger)
    if (!data || !data.keyPoints || !Array.isArray(data.keyPoints)) {
      throw new Error("Invalid structure: missing keyPoints");
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("Content Gen Error:", error);
    // FIX: Fallback now works because 'topic' is defined in the outer scope
    return NextResponse.json({
      summary: "Mastering " + topic + " is essential for this module.",
      keyPoints: [
        { term: "Syntax", def: "The grammatical rules of the language." },
        { term: "Logic", def: "The flow of data and decision making." }
      ],
      codeSnippet: null,
      commonPitfalls: "Skipping the foundational theory.",
      analogy: "It's like building a foundation before the house."
    });
  }
}