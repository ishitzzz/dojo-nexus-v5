import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question, userAnswer, context } = await req.json();
    
    // Connect to Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are a strict but helpful tutor.
      Topic: "${context}"
      Question: "${question}"
      Student Answer: "${userAnswer}"

      Task: Grade the answer.
      - If it is correct or mostly correct, return JSON: { "isCorrect": true, "feedback": "Great job! [One sentence summary]" }
      - If it is wrong, return JSON: { "isCorrect": false, "feedback": "Not quite. [Explain the right answer simply]" }
      
      Return ONLY valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    
    return NextResponse.json(JSON.parse(text));

  } catch (error) {
    return NextResponse.json({ isCorrect: false, feedback: "AI Error. Try again." });
  }
}