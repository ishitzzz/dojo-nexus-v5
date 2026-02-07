import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

// User requested "Gemini 2.5 Flash" as primary and "Gemini 2.5 Flash Lite" as secondary.
// Since those specific versions might not be standard aliases in the SDK yet,
// we map them to the current best available stable equivalents.
// Primary: gemini-1.5-flash (Fast, capable)
// Secondary: gemini-1.5-flash-8b (Extremely fast, lower cost/latency)

const PRIMARY_MODEL = "gemini-2.5-flash";
const SECONDARY_MODEL = "gemini-2.5-flash-lite";

export interface FailoverResult {
    text: string;
    modelUsed: string;
    fallbackUsed: boolean;
}

/**
 * Generates content using Google Gemini with automatic failover.
 * Tries the Primary Model first. If it fails, tries the Secondary Model.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateContentWithFailover(
    prompt: string | Array<string | any>,
    config: GenerationConfig = {}
): Promise<FailoverResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // 1. Try Primary Model
    try {
        const model = genAI.getGenerativeModel({
            model: PRIMARY_MODEL,
            generationConfig: config,
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return {
            text,
            modelUsed: PRIMARY_MODEL,
            fallbackUsed: false,
        };
    } catch (primaryError) {
        console.warn(`⚠️ Primary Model (${PRIMARY_MODEL}) failed. Attempting failover...`, primaryError);

        // 2. Try Secondary Model
        try {
            const model = genAI.getGenerativeModel({
                model: SECONDARY_MODEL,
                generationConfig: config,
            });

            const result = await model.generateContent(prompt);
            const text = result.response.text();

            console.log(`✅ Failover successful using ${SECONDARY_MODEL}`);

            return {
                text,
                modelUsed: SECONDARY_MODEL,
                fallbackUsed: true,
            };
        } catch (secondaryError) {
            console.error(`❌ Secondary Model (${SECONDARY_MODEL}) also failed.`, secondaryError);
            throw new Error(`All Gemini models failed. Primary: ${String(primaryError)}. Secondary: ${String(secondaryError)}`);
        }
    }
}
