import { generateContentWithFailover } from "@/utils/gemini";
import { NextResponse } from "next/server";
import { checkNexusCache, storeNexusCache } from "@/utils/nexusCache";
import { sieveGoal } from "@/utils/contextSieve";
import { safeParseJsonObject } from "@/utils/safeJsonParser";

// ═══════════════════════════════════════════════════════════════
// GENERATE NEXUS API
// Creates the Origin Node and spawns initial learning nodes
// Now with ILS Nexus Cache integration
// ═══════════════════════════════════════════════════════════════

interface NexusRequest {
  userGoal: string;
  personaId?: string;
  clarified?: boolean; // true when user clicked a Choice Chip
}



/**
 * Builds the final response shape from raw LLM data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildResponse(data: any) {
  return {
    origin: {
      id: `origin-${Date.now()}`,
      ...data.origin,
      position: { x: 0, y: 0 },
      status: "active",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialNodes: (data.initialNodes || []).map((node: any, index: number) => ({
      id: `node-${Date.now()}-${index}`,
      ...node,
      position: {
        x: index === 0 ? -400 : 400,
        y: 350,
      },
      status: "ghost",
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    edges: (data.initialNodes || []).map((_node: any, index: number) => ({
      id: `edge-origin-${index}`,
      sourceId: `origin-${Date.now()}`,
      targetId: `node-${Date.now()}-${index}`,
      edgeType: "deep_dive",
      label: index === 0 ? "Start Here" : "Then This",
    })),
    suggestedPaths: data.suggestedPaths || [],
  };
}

export async function POST(req: Request) {
  try {
    const body: NexusRequest = await req.json();
    const { userGoal } = body;

    if (!userGoal || userGoal.trim().length < 3) {
      return NextResponse.json(
        { error: "Please provide a learning goal" },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // ILS Step 0: Context Sieve (Ambiguity Detection)
    // Only runs for fresh queries. Skipped if user already clarified.
    // ═══════════════════════════════════════════════════════════════
    if (!body.clarified) {
      const sieveResult = await sieveGoal(userGoal);
      if (sieveResult.isAmbiguous && sieveResult.chips && sieveResult.chips.length > 0) {
        console.log(`🧹 Context Sieve: Returning ${sieveResult.chips.length} chips for "${userGoal}"`);
        return NextResponse.json({
          type: "ambiguous",
          chips: sieveResult.chips,
          originalGoal: userGoal,
          reason: sieveResult.reason,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ILS Step 1: Check Nexus Cache (saves Gemini API call)
    // ═══════════════════════════════════════════════════════════════
    const cacheResult = await checkNexusCache(userGoal);
    if (cacheResult.found && cacheResult.data) {
      console.log(`🗄️ Nexus Cache HIT — skipping Gemini call for: "${userGoal.slice(0, 30)}..."`);
      const response = buildResponse(cacheResult.data);
      return NextResponse.json(response);
    }

    // ═══════════════════════════════════════════════════════════════
    // No cache → Generate with Gemini
    // ═══════════════════════════════════════════════════════════════
    const prompt = `
You are a friendly learning guide for beginners. A user wants to learn something.

USER'S GOAL: "${userGoal}"

YOUR TASK: Create a starting point for their learning journey.

CRITICAL RULES:
1. INTERPRET THE GOAL CHARITABLY - If they say "web design", they likely mean UI/UX, HTML, CSS - NOT database schemas or UML diagrams.
2. USE SIMPLE, CLEAR TITLES - No jargon. A 12-year-old should understand.
3. WRITE DETAILED EXPLANATIONS - Each section should have 3-5 sentences explaining the concept clearly.

EXAMPLE of good vs bad:
❌ BAD TITLE: "The Primitive State: Text-Based Information Systems"
✅ GOOD TITLE: "HTML Basics: Building Your First Webpage"

❌ BAD SUMMARY: "Understanding markup languages"
✅ GOOD SUMMARY: "HTML is the skeleton of every website. It tells browsers what content to show - headings, paragraphs, images, and links. Without HTML, there would be no structure to the web."

RETURN THIS JSON STRUCTURE:
{
  "origin": {
    "title": "Simple, friendly title about their goal",
    "summary": "3-4 sentences explaining what they'll learn and why it matters. Be encouraging and clear.",
    "content": {
      "introduction": "A welcoming paragraph (3-4 sentences) about this learning journey.",
      "sections": [
        {
          "heading": "What You'll Learn",
          "body": "2-3 sentences about the main skills they'll gain."
        },
        {
          "heading": "Why This Matters",
          "body": "2-3 sentences about real-world applications."
        },
        {
          "heading": "Getting Started",
          "body": "2-3 sentences about the first steps."
        }
      ]
    }
  },
  "initialNodes": [
    {
      "title": "Simple title for first concept",
      "summary": "3-4 sentences explaining this concept in plain language.",
      "content": {
        "introduction": "A paragraph introducing this topic.",
        "sections": [
          {
            "heading": "Key Concept 1",
            "body": "2-3 sentences explaining it simply."
          },
          {
            "heading": "Key Concept 2", 
            "body": "2-3 sentences explaining it simply."
          },
          {
            "heading": "Try This",
            "body": "A simple exercise or example."
          }
        ]
      },
      "youtubeQuery": "beginner tutorial [topic] for beginners"
    },
    {
      "title": "Simple title for second concept",
      "summary": "3-4 sentences explaining this concept in plain language.",
      "content": {
        "introduction": "A paragraph introducing this topic.",
        "sections": [
          {
            "heading": "Key Concept 1",
            "body": "2-3 sentences explaining it simply."
          },
          {
            "heading": "Key Concept 2",
            "body": "2-3 sentences explaining it simply."
          },
          {
            "heading": "Try This",
            "body": "A simple exercise or example."
          }
        ]
      },
      "youtubeQuery": "beginner tutorial [topic] for beginners"
    }
  ],
  "suggestedPaths": [
    {
      "question": "A natural follow-up question a learner might ask",
      "preview": "Brief preview of what clicking this would teach"
    },
    {
      "question": "Another follow-up question",
      "preview": "Brief preview"
    },
    {
      "question": "Third follow-up question",
      "preview": "Brief preview"
    }
  ]
}

REMEMBER:
- Simple language, no jargon
- Detailed explanations (not one-liners)
- Interpret their goal as a BEGINNER would mean it
- The suggestedPaths are clickable options shown to the user
`;

    const result = await generateContentWithFailover(prompt, {
      responseMimeType: "application/json",
      temperature: 0.7,
    });

    console.log(`🧠 Nexus Generated [Model: ${result.modelUsed}]`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = safeParseJsonObject<any>(result.text);

    // FIX: Match the validation to the Prompt schema (origin + initialNodes)
    // The previous validation incorrectly checked for 'title'/'children' which caused the crash.
    if (!data || !data.origin || !Array.isArray(data.initialNodes)) {
      console.warn("⚠️ Invalid nexus structure:", result.text.slice(0, 200));
      throw new Error("Failed to parse valid Nexus structure");
    }

    // ═══════════════════════════════════════════════════════════════
    // ILS: Store in Nexus Cache for future use
    // ═══════════════════════════════════════════════════════════════
    await storeNexusCache(userGoal, data);

    const response = buildResponse(data);
    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ Nexus Generation Failed:", error);
    return NextResponse.json(
      {
        error: "Failed to generate learning nexus",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
