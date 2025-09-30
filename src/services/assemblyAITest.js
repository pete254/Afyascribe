// src/services/assemblyAITest.js
const ASSEMBLYAI_API_KEY = process.env.EXPO_PUBLIC_ASSEMBLYAI_API_KEY;

export async function testAssemblyAI() {
  console.log("API Key length:", ASSEMBLYAI_API_KEY ? ASSEMBLYAI_API_KEY.length : 'undefined');
  console.log("API Key first 8 chars:", ASSEMBLYAI_API_KEY ? ASSEMBLYAI_API_KEY.substring(0, 8) : 'undefined');
  
  if (!ASSEMBLYAI_API_KEY) {
    throw new Error("Missing AssemblyAI API key. Please set EXPO_PUBLIC_ASSEMBLYAI_API_KEY in your .env file.");
  }

  if (ASSEMBLYAI_API_KEY.length !== 32) {
    throw new Error(`Invalid API key length: ${ASSEMBLYAI_API_KEY.length}. Should be 32 characters.`);
  }

  try {
    console.log("Testing AssemblyAI API connection...");

    // First test: Get a temp token (tests API key validity)
    const tokenResponse = await fetch('https://api.assemblyai.com/v2/realtime/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_in: 3600,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token test failed:', errorText);
      if (tokenResponse.status === 401) {
        throw new Error(`Invalid API key. Please check your key in the AssemblyAI dashboard.`);
      }
      throw new Error(`Token request failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("Token test successful!");

    // Test 1: Try to create a transcript (this validates API key and endpoints)
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: 'https://storage.googleapis.com/aai-docs-samples/nbc.wav',
        // This is a sample audio file from AssemblyAI's docs for testing
      }),
    });

    console.log("Transcript response status:", transcriptResponse.status);

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error('AssemblyAI transcript request details:', {
        status: transcriptResponse.status,
        statusText: transcriptResponse.statusText,
        error: errorText,
        apiKey: `${ASSEMBLYAI_API_KEY.substring(0, 8)}...${ASSEMBLYAI_API_KEY.substring(-4)}`
      });
      
      if (transcriptResponse.status === 401) {
        throw new Error(`Authentication failed. Please check your API key in the AssemblyAI dashboard.`);
      } else if (transcriptResponse.status === 402) {
        throw new Error(`Insufficient credits. Please add credits to your AssemblyAI account.`);
      } else {
        throw new Error(`API request failed: ${transcriptResponse.status} - ${errorText}`);
      }
    }

    const transcriptData = await transcriptResponse.json();
    console.log("AssemblyAI transcript test successful:", transcriptData);

    // Test 2: Test WebSocket connection capability
    const wsTest = await testWebSocketConnection();

    return `✅ AssemblyAI API connected successfully!\n- Speech-to-Text: Ready (ID: ${transcriptData.id})\n- Real-time streaming: ${wsTest}\n- Credits available: ✅`;
    
  } catch (error) {
    console.error("AssemblyAI test failed:", error);
    throw new Error(`AssemblyAI connection failed: ${error.message}`);
  }
}

// Test WebSocket connection
async function testWebSocketConnection() {
  try {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      const websocketUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000`;
      const ws = new WebSocket(websocketUrl);

      ws.onopen = () => {
        clearTimeout(timeout);
        
        // Send auth message
        const authMessage = {
          authorization: ASSEMBLYAI_API_KEY,
          sample_rate: 16000,
          language_code: 'en'
        };
        
        ws.send(JSON.stringify(authMessage));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        if (data.message_type === 'SessionBegins') {
          clearTimeout(timeout);
          ws.close(1000, 'Test completed');
          resolve('Connected');
        } else if (data.error) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(`WebSocket auth failed: ${data.error}`));
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = (event) => {
        if (event.code === 1000) {
          // Normal closure after successful test
          return;
        }
        console.log('WebSocket closed:', event.code, event.reason);
      };
    });
  } catch (error) {
    console.error('WebSocket test error:', error);
    return 'Failed';
  }
}

// Simple API key validation test
export async function quickTestAssemblyAI() {
  if (!ASSEMBLYAI_API_KEY) {
    throw new Error("No API key found");
  }

  try {
    // Just test if we can access the API
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASSEMBLYAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: 'https://storage.googleapis.com/aai-docs-samples/nbc.wav',
      }),
    });

    if (response.status === 401) {
      throw new Error('Invalid API key - check your AssemblyAI dashboard');
    } else if (response.status === 402) {
      throw new Error('No credits available - add funds to your AssemblyAI account');
    } else if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return '✅ API key valid and working';
    
  } catch (error) {
    throw error;
  }
}