/**
 * 🧠 Gemini Reranker
 * Uses Gemini 1.5 Flash-Lite to perform semantic reranking
 * of video candidates based on Information Density.
 */

import { generateContentWithFailover } from "@/utils/gemini";

export interface RerankerInput {
    candidates: string;  // Formatted string of video metadata
    userRole: string;
    topic: string;
    experienceLevel: string;
}

export interface RerankerResult {
    winnerId: string | null;
    reasoning?: string;
    fallbackUsed: boolean;
}

/**
 * The "Vibe-Check" Reranker
 * Sends top candidates to Gemini and asks for the most technically dense video.
 */
export async function vibeCheckRerank(
    input: RerankerInput
): Promise<RerankerResult> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("⚠️ No Gemini API key, using heuristic fallback");
        return { winnerId: null, fallbackUsed: true };
    }

    try {
        const result = await generateContentWithFailover(prompt, {
            temperature: 0.1,  // Low temperature for consistent results
            maxOutputTokens: 256,
        });
        const response = result.text;

        // Extract the video ID from the response
        const videoIdMatch = response.match(/(?:winner|id|video[_\s]?id)[:\s]*([a-zA-Z0-9_-]{11})/i);

        if (videoIdMatch) {
            return {
                winnerId: videoIdMatch[1],
                reasoning: response,
                fallbackUsed: false,
            };
        }

        // Try to find any 11-character YouTube ID pattern
        const anyIdMatch = response.match(/\b([a-zA-Z0-9_-]{11})\b/);
        if (anyIdMatch) {
            return {
                winnerId: anyIdMatch[1],
                reasoning: response,
                fallbackUsed: false,
            };
        }

        console.warn("⚠️ Could not parse Gemini response:", response);
        return { winnerId: null, fallbackUsed: true };

    } catch (error) {
        console.error("❌ Gemini Reranker Error:", error);
        return { winnerId: null, fallbackUsed: true };
    }
}

/**
 * Build the reranker prompt with specific criteria
 */
function buildRerankerPrompt(input: RerankerInput): string {
    return `You are a Technical Content Curator for an AI learning platform.

CONTEXT:
- User Role: ${input.userRole}
- Learning Topic: ${input.topic}
- Depth Level: ${input.experienceLevel}

TASK:
Analyze these YouTube video candidates and select the ONE with the highest Information Density.

CANDIDATES:
${input.candidates}

RANKING CRITERIA (in order of importance):
1. 🔗 Contains links to GitHub, documentation, or notebooks
2. 📚 Provides structured, educational content (not entertainment)
3. ⚙️ Mentions specific libraries, algorithms, or implementation details
4. 🎓 Academic or research-oriented approach
5. ⏱️ Appropriate length for deep learning (15+ minutes preferred)

ANTI-CRITERIA (avoid these):
- ❌ Hyperbolic language ("Mind-blowing", "Insane", etc.)
- ❌ High view count with shallow content
- ❌ Entertainment-focused rather than educational
- ❌ Clickbait titles with ALL CAPS or excessive emojis

RESPONSE FORMAT:
Return ONLY the Video ID of the winner in this exact format:
WINNER_ID: [11-character-video-id]

Select the best video now:`;
}

/**
 * Generate expanded search queries using Gemini
 */
export async function generateExpandedQueries(
    topic: string,
    userRole: string,
    experienceLevel: string
): Promise<string[] | null> {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    try {
        const prompt = `You are a YouTube Search Query Optimizer for technical education.

CONTEXT:
- Topic: "${topic}"
- User: ${userRole}
- Depth: ${experienceLevel}

TASK:
Generate 3 diverse YouTube search queries that will find HIGH-QUALITY technical videos.
Each query should target a different aspect of learning.

RULES:
1. Include anti-clickbait terms: -shorts -reaction -giveaway
2. For "${experienceLevel}" level, ${experienceLevel === "Deep Dive" ? "focus on comprehensive, documentation-style content" : experienceLevel === "Project Based" ? "focus on hands-on building and implementation" : "focus on clear introductory explanations"}
3. For "${userRole}" role, ${userRole === "Student" ? "use beginner-friendly terms" : userRole === "Professional" ? "use advanced architecture terms" : "use practical business implementation terms"}

Return JSON array:
{
  "queries": [
    { "type": "conceptual", "query": "..." },
    { "type": "implementation", "query": "..." },
    { "type": "troubleshooting", "query": "..." }
  ]
}`;

        const result = await generateContentWithFailover(prompt, {
            temperature: 0.7,
            maxOutputTokens: 512,
            responseMimeType: "application/json",
        });
        const data = JSON.parse(result.text);

        return data.queries.map((q: { query: string }) => q.query);

    } catch (error) {
        console.error("❌ Query Expansion Error:", error);
        return null;
    }
}

/**
 * Analyze transcript for technical density
 */
export async function analyzeTranscriptDensity(
    transcript: string,
    topic: string
): Promise<{ score: number; summary: string } | null> {
    if (!process.env.GEMINI_API_KEY || !transcript) {
        return null;
    }

    try {
        // Only analyze first 2000 chars to save tokens
        const truncatedTranscript = transcript.slice(0, 2000);

        const prompt = `Analyze this transcript snippet for technical Information Density.
Topic: "${topic}"

TRANSCRIPT:
${truncatedTranscript}

Score on a scale of 1-100:
- 1-30: Basic/surface level, entertainment focused
- 31-60: Moderate depth, good explanation
- 61-80: High density, technical details, examples
- 81-100: Expert level, documentation quality, code examples

Return JSON:
{
  "score": <number>,
  "summary": "<brief assessment>"
}`;

        const result = await generateContentWithFailover(prompt, {
            temperature: 0.1,
            maxOutputTokens: 256,
            responseMimeType: "application/json",
        });

        return JSON.parse(result.text);

    } catch (error) {
        console.error("❌ Transcript Analysis Error:", error);
        return null;
    }
}
