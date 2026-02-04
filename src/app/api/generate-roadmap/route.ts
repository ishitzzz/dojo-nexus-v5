import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// 1. CLEANUP UTILS (Kept robust)
function cleanAndParseJSON(text: string) {
  try {
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "");
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON object found");
    let jsonStr = cleanText.substring(firstBrace, lastBrace + 1);
    // Fix common JSON errors (trailing commas, comments)
    jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""); 
    return JSON.parse(jsonStr);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) { 
    console.error("JSON Clean Failed on:", text);
    throw new Error("JSON Parse Failed");
  }
}

// 2. SEARCH UTILS
async function getWebContext(query: string) {
    try {
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        const html = await res.text();
        const snippetRegex = /class="result__snippet"[^>]*>(.*?)<\/a>/g;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any[] = [];
        let match; let count = 0;
        while ((match = snippetRegex.exec(html)) !== null && count < 3) { results.push(match[1].replace(/<[^>]*>/g, "")); count++; }
        return results.join("\n- ");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) { return ""; }
}

export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {}; 
  let userGoal = "";

  try {
    body = await req.json();
    userGoal = body.userGoal;
    // Default to these if missing to prevent "Generic" fallback
    const userRole = body.userRole || "Student";
    const experienceLevel = body.experienceLevel || "Deep Dive";

    if (!process.env.GEMINI_API_KEY) throw new Error("No API Key");
    
    const webContext = await getWebContext(userGoal); 
    
    // RESTORED: This is the "Crucial Step" that changes the video search
    let searchModifier = "";
    if (userRole === "Student") searchModifier = "tutorial for beginners with examples";
    if (userRole === "Professional") searchModifier = "advanced crash course architecture";
    if (userRole === "Founder") searchModifier = "business logic and mvp guide";

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest",
        // FIX: This line forces the AI to output ONLY valid JSON. No more parsing errors.
        generationConfig: { responseMimeType: "application/json" }
    });

    const geminiPrompt = `
      You are a Technical Curriculum Architect.
      TOPIC: "${userGoal}"
      ROLE: "${userRole}" (CRITICAL: If 'Student', ALL analogies must use University, Campus, or Daily Student Life examples.)
      LEVEL: "${experienceLevel}"
      CONTEXT: ${webContext}

      INSTRUCTIONS:
      1. Create a 3-Module roadmap.
      2. For each chapter, assign a "toolType" (mcq, cloze, analogy).
      
      3. CRITICAL: For "youtubeQuery", append specific terms:
         - IF Student: "${userGoal} simple explanation ${searchModifier}"
         - IF Professional: "${userGoal} deep dive ${searchModifier}"

      4. Define "gamePayload" based on toolType.

      RETURN JSON ONLY:
      {
        "courseTitle": "...",
        "modules": [
          {
            "moduleTitle": "...",
            "chapters": [
              {
                "chapterTitle": "...",
                "youtubeQuery": "EXACT SEARCH QUERY HERE", 
                "toolType": "mcq",
                "gamePayload": { "question": "...", "options": ["A", "B"], "correctAnswer": "A", "explanation": "..." }
              }
            ]
          }
        ]
      }
    `;

    const result = await model.generateContent(geminiPrompt);
    const data = cleanAndParseJSON(result.response.text());
    return NextResponse.json(data);

  } catch (error) {
    console.error("Generating fallback...", error);
    return NextResponse.json({
      courseTitle: `Guide: ${userGoal || "Learning Path"}`,
      modules: [{
          moduleTitle: "Basics",
          chapters: [{ 
              chapterTitle: "Introduction", 
              youtubeQuery: `${userGoal} tutorial`, 
              toolType: "mcq",
              gamePayload: { 
                  question: "Ready?", options: ["Yes", "No"], correctAnswer: "Yes", explanation: "Let's go."
              }
          }]
      }]
    });
  }
}


