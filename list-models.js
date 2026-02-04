const API_KEY = "AIzaSyDqzM6ltWcWDZU_yPXgScTgv6ZndKbaW3I";

async function checkMenu() {
  console.log("🔍 Asking Google for the menu...");
  
  try {
    // We hit the 'models' endpoint directly to see what is allowed
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    if (data.error) {
      console.log("❌ ERROR:", data.error.message);
    } else {
      console.log("✅ SUCCESS! Here are your available models:");
      // Filter for 'generateContent' models only
      const chatModels = data.models
        .filter(m => m.supportedGenerationMethods.includes("generateContent"))
        .map(m => m.name);
      
      console.log(chatModels);
    }
  } catch (err) {
    console.log("❌ Network Error:", err.message);
  }
}

checkMenu();