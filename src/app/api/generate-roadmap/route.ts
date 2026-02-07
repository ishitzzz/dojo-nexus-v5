import { generateContentWithFailover } from "@/utils/gemini";
import { BACKUP_ROADMAPS } from "@/data/backupRoadmaps";
import { NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════
// CLEANUP UTILS
// ═══════════════════════════════════════════════════════════════
function cleanAndParseJSON(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found");

    let jsonStr = jsonMatch[0]
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/,\s*}/g, "}") // Trailing comma fix
      .replace(/,\s*]/g, "]")
      .replace(/\/\/.*$/gm, "") // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, "");

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("JSON Clean Failed on:", text);
    throw new Error("JSON Parse Failed: " + String(error));
  }
}

// ═══════════════════════════════════════════════════════════════
// WEB CONTEXT (Keep for grounding)
// ═══════════════════════════════════════════════════════════════
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
  } catch (_e) { return ""; }
}

export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {};

  try {
    body = await req.json();
    const { userGoal, experienceLevel = "Deep Dive", mode = "skeleton", moduleContext } = body;

    let prompt = "";

    // ═══════════════════════════════════════════════════════════════
    // MODE 1: SKELETON GENERATION (Global Architecture)
    // ═══════════════════════════════════════════════════════════════
    if (mode === "skeleton") {
      const webContext = await getWebContext(userGoal);

      prompt = `
        You are a "First Principles" Knowledge Architect building a CONTINUOUS learning path.
        
        GOAL: Create an "Evolutionary Chain" for: "${userGoal}"
        CONTEXT: ${webContext}
        LEVEL: ${experienceLevel}

        TASK: Generate the COURSE ARCHITECTURE (Skeleton).
        
        CRITICAL OPTIMIZATION (Warm Start):
        To save the user time, you MUST fully generate the chapters for MODULE 1 and MODULE 2 immediately.
        For Module 3 onwards, generate ONLY the title and description (Skeleton).

        CRITICAL RULE - CONTINUITY:
        Each module MUST be a direct continuation of the previous one.
        Structure it like a dependency graph:
        1. Primitive State (The "Hello World" / No-Framework era)
        2. The First Problem (Why the primitive state fails)
        3. The Abstraction (The modern solution)
        4. The Optimization (Advanced patterns)

        ANCHOR CHANNEL:
        Recommend ONE YouTube channel that covers this entire topic well.
        Examples: "Academind", "Fireship", "Web Dev Simplified", "Traversy Media", "Hussein Nasser"
        
        RETURN JSON ONLY:
        {
          "courseTitle": "The Evolutionary Path to [Topic]",
          "anchorChannel": "Channel Name",
          "modules": [
            {
              "moduleTitle": "Stage 1: [Name]",
              "atomicTruth": "One sentence core principle",
              "narrativeBridge": "This is where we begin.",
              "estimatedDuration": "45 mins",
              "chapters": [ 
                  // REQUIRED FOR MOD 1 & 2 ONLY
                  {
                     "chapterTitle": "Specific micro-concept",
                     "youtubeQuery": "Specific search query (include '${userGoal}')",
                     "narrativeBridge": "Reasoning...",
                     "toolType": "analogy",
                     "gamePayload": { "concept": "...", "analogy": "...", "explanation": "..." }
                  }
              ]
            },
            {
              "moduleTitle": "Stage 3: [Name] (Skeleton)",
              "atomicTruth": "...",
              "narrativeBridge": "...",
              "estimatedDuration": "...",
              "chapters": [] // Empty for Mod 3+
            }
          ]
        }
      `;
    }
    // ═══════════════════════════════════════════════════════════════
    // MODE 2: MODULE DETAIL GENERATION (JIT Expansion)
    // ═══════════════════════════════════════════════════════════════
    else if (mode === "module_details") {
      if (!moduleContext || !moduleContext.moduleTitle) throw new Error("Missing module context");

      prompt = `
        You are a Specialized Curriculum Designer.
        
        GOAL: Create detailed chapters for the module: "${moduleContext.moduleTitle}"
        COURSE: "${userGoal}"
        PREVIOUS CONTEXT: ${moduleContext.previousModuleTitle ? `The user just finished "${moduleContext.previousModuleTitle}".` : "This is the very first module."}
        
        INSTRUCTION:
        Break this module down into 3-5 atomic chapters.
        Focus on "First Principles" - explain the CONCEPT before the SYNTAX.
        
        YOUTUBE QUERY RULES (CRITICAL):
        1. Be ULTRA-SPECIFIC. Include technical terms.
        2. If this is a beginner module, use "explained visually" or "concept".
        3. If this is an advanced module, use "implementation" or "deep dive".
        4. ALWAYS include the main topic ("${userGoal}") in the query.

        RETURN JSON ONLY:
        {
          "chapters": [
             {
               "chapterTitle": "Specific micro-concept",
               "youtubeQuery": "Specific search query",
               "narrativeBridge": "Reasoning for this step...",
               "toolType": "analogy",
               "gamePayload": { "concept": "...", "analogy": "...", "explanation": "..." }
             }
          ]
        }
      `;
    } else {
      throw new Error("Invalid generation mode");
    }

    const result = await generateContentWithFailover(prompt, {
      responseMimeType: "application/json",
      temperature: 0.7,
    });

    console.log(`🤖 Gemini Response (${mode}) [Model: ${result.modelUsed}]:`, result.text.slice(0, 100));
    const data = cleanAndParseJSON(result.text);

    return NextResponse.json(data);

  } catch (error) {
    console.error(`❌ Roadmap Generation Failed (${body.mode}):`, error);

    // ═══════════════════════════════════════════════════════════════
    // FAILOVER: BACKUP MODES
    // ═══════════════════════════════════════════════════════════════
    const normalizedGoal = body.userGoal?.toLowerCase().trim();
    if (BACKUP_ROADMAPS[normalizedGoal]) {
      console.warn(`⚠️ Triggering Backup Mode for: ${normalizedGoal}`);
      return NextResponse.json({
        ...BACKUP_ROADMAPS[normalizedGoal],
        _isBackup: true, // Internal flag for debugging/UI if needed
      });
    }

    return NextResponse.json({
      error: "Generation Failed",
      details: String(error)
    }, { status: 500 });
  }
}

