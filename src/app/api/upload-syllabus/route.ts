import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFailover } from "@/utils/gemini";

function cleanJSON(text: string) {
  try {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, ""));
  } catch (e) {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const mode = formData.get("mode") as string; // "syllabus" or "book"

    if (!file) return NextResponse.json({ error: "No file found" }, { status: 400 });

    // Convert file to Base64 for Gemini
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");

    // Determine mime type (pdf or image)
    const mimeType = file.type;

    const result = await generateContentWithFailover([prompt, { inlineData: { data: base64Data, mimeType: mimeType } }]);

    const responseText = result.text;
    const data = cleanJSON(responseText);

    return NextResponse.json(data);

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "AI Processing Failed" }, { status: 500 });
  }
}