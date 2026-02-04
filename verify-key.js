// verify-key.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Paste your "AIza..." key inside these quotes:
const API_KEY = "AIzaSyDqzM6ltWcWDZU_yPXgScTgv6ZndKbaW3I";

async function testKey() {
  console.log("🔑 Testing API Key...");

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    // We test the Flash model because it's the free default
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent("Reply with the word: WORKING");
    const response = await result.response;
    
    console.log("\n✅ SUCCESS! The API responded:");
    console.log(response.text());
    
  } catch (error) {
    console.log("\n❌ FAILED. Here is the real reason:");
    console.log(error.message); // This will tell us if it's "400 Key Invalid" or "404 Not Found"
  }
}

testKey();