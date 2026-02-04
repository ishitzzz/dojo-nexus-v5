import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    let prompt = "";
    
    if (mode === "syllabus") {
        prompt = `
          Analyze this document (Syllabus or Image). 
          Extract the course structure into a learning roadmap.
          Ignore admin details like dates/grading.
          
          RETURN JSON ONLY:
          {
            "courseTitle": "Extracted Title",
            "modules": [
              { "moduleTitle": "...", "chapters": [{ "chapterTitle": "...", "youtubeQuery": "...", "toolType": "mcq", "gamePayload": {...} }] }
            ]
          }
        `;
    } else {
        // BOOK MODE (Extract text for Reader)
        prompt = `
           Extract the full text content from this document for a reading app. 
           Keep structure but remove page numbers.
           RETURN JSON ONLY: { "fullText": "..." }
        `;
    }

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: mimeType } },
    ]);

    const responseText = result.response.text();
    const data = cleanJSON(responseText);

    return NextResponse.json(data);

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "AI Processing Failed" }, { status: 500 });
  }
}