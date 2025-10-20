// src/services/geminiClient.js
import Constants from 'expo-constants';

// 🔍 DIAGNOSTIC: Check all possible sources for API key
console.log('🔍 ========== GEMINI API KEY DIAGNOSTIC ==========');
console.log('1. Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
console.log('2. process.env.EXPO_PUBLIC_GEMINI_API_KEY:', process.env.EXPO_PUBLIC_GEMINI_API_KEY ? 'EXISTS' : 'MISSING');

// ✅ FIXED: Read from multiple sources (same pattern as AudioService)
const GEMINI_API_KEY = 
  Constants.expoConfig?.extra?.GEMINI_API_KEY ||       // EAS builds
  Constants.manifest?.extra?.GEMINI_API_KEY ||         // Legacy
  Constants.manifest2?.extra?.GEMINI_API_KEY ||        // Legacy
  process.env.EXPO_PUBLIC_GEMINI_API_KEY;              // Local dev

console.log('3. Final GEMINI_API_KEY:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'NOT FOUND');
console.log('====================================================');

if (!GEMINI_API_KEY) {
  console.error('❌ CRITICAL: Gemini API key not found in any location!');
  console.error('📋 Checklist:');
  console.error('   1. Check app.json has GEMINI_API_KEY in extra section');
  console.error('   2. For local dev: Check .env has EXPO_PUBLIC_GEMINI_API_KEY');
  console.error('   3. For builds: Check EAS secrets with `eas secret:list`');
  console.error('   4. Restart dev server with `npx expo start -c`');
} else {
  console.log('✅ Gemini API key loaded successfully');
}

// Updated to use Gemini 2.5 Flash (current stable model)
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function testGemini() {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing Gemini API key. Please add GEMINI_API_KEY to app.json extra section or EXPO_PUBLIC_GEMINI_API_KEY to .env file.");
  }

  const url = `${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`;
  
  console.log("Calling Gemini API...");

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: "Hello! Can you translate 'How are you?' to French and explain why you chose that translation?"
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 200,
      topP: 0.8,
      topK: 10
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.log("Gemini Error response:", errorText);
      throw new Error(`Gemini ${res.status}: ${errorText || res.statusText}`);
    }
    
    const data = await res.json();
    console.log("Gemini Success response:", data);
    
    // Extract the generated text from Gemini's response format
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";
    
    return `Gemini AI reachable ✅ - Result: ${result}`;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

// Alternative function for chat-style conversations
export async function chatWithGemini(message, conversationHistory = []) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing Gemini API key.");
  }

  const url = `${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`;
  
  console.log('🤖 Calling Gemini for formatting...');
  console.log('🔑 Using API key:', GEMINI_API_KEY.substring(0, 10) + '...');
  
  // Build conversation history
  const contents = [
    ...conversationHistory,
    {
      parts: [{ text: message }]
    }
  ];

  const requestBody = {
    contents,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 1000,
      topP: 1.0,
      topK: 1
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Gemini API error response:', errorText);
      throw new Error(`Gemini ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
    
    console.log('✅ Gemini formatting completed');
    return result;
  } catch (error) {
    console.error("Chat with Gemini Error:", error);
    throw error;
  }
}

// Alternative using the official SDK approach (recommended)
// First install: npm install @google/generative-ai
export async function chatWithGeminiSDK(message) {
  try {
    // Note: This requires installing @google/generative-ai package
    // const { GoogleGenerativeAI } = require("@google/generative-ai");
    
    // const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // const result = await model.generateContent(message);
    // const response = await result.response;
    // return response.text();
    
    console.log("SDK approach commented out - install @google/generative-ai to use");
    return "SDK approach not implemented - using REST API instead";
  } catch (error) {
    console.error("SDK Error:", error);
    throw error;
  }
}

// Function to list available models (for debugging)
export async function listAvailableModels() {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing Gemini API key.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
  
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`List Models ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    console.log("Available models:", data);
    return data;
  } catch (error) {
    console.error("List Models Error:", error);
    throw error;
  }
}