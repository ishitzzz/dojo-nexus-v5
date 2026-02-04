import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { text } = await req.json();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `
    You are a Helpful Tutor in a book margin.
    The user highlighted this text: "${text}"

    Explain it simply in 2-3 sentences. 
    If it's code, explain the logic. 
    If it's a concept, give a real-world analogy.
  `;

  const result = await model.generateContent(prompt);
  return NextResponse.json({ explanation: result.response.text() });
}