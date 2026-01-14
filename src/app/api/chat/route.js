import { GoogleGenAI } from "@google/genai";

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Helper to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request) {
  try {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return Response.json(
        { error: 'API key not configured. Please add GEMINI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return Response.json(
        { error: 'Invalid request format. Expected JSON.' },
        { status: 400 }
      );
    }

    const { message, files } = body;

    // Initialize Google Generative AI
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const parts = [];

    // Process image files
    if (files && Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        if (!file.type || !file.type.startsWith('image/')) {
          continue; // Skip non-image files
        }

        let base64Data = file.data;

        // Validate base64 data exists
        if (!base64Data) {
          console.warn(`Skipping file ${file.name}: no data`);
          continue;
        }

        // Strip data URL prefix if present
        if (typeof base64Data === 'string' && base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }

        // Clean whitespace
        if (typeof base64Data === 'string') {
          base64Data = base64Data.replace(/\s+/g, '');
        }

        // Validate base64 format
        if (typeof base64Data !== 'string' || base64Data.length === 0) {
          console.warn(`Skipping file ${file.name}: invalid base64 data`);
          continue;
        }

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      }
    }

    // Add text message
    const prompt = message?.trim() || (parts.length > 0 ? "What is in this image?" : null);
    if (prompt) {
      parts.push({ text: prompt });
    }

    // Validate we have content to send
    if (parts.length === 0) {
      return Response.json(
        { error: 'No content provided. Please include a message or image.' },
        { status: 400 }
      );
    }

    // Generate content with retry logic
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt}/${MAX_RETRIES}`);
          await delay(RETRY_DELAY * attempt);
        }

        const result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: "user", parts: parts }],
          config: {
            thinkingLevel: "medium"
          }
        });

        // Extract response text
        const responseText = result.text || 
                           result.candidates?.[0]?.content?.parts?.[0]?.text ||
                           null;

        if (!responseText) {
          throw new Error('No text response received from Gemini API');
        }

        return Response.json({ response: responseText });

      } catch (apiError) {
        lastError = apiError;
        
        // Don't retry on client errors (4xx)
        if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
          break;
        }
        
        // Log retry attempts
        if (attempt < MAX_RETRIES) {
          console.warn(`API call failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, apiError.message);
        }
      }
    }

    // All retries failed
    console.error('All retry attempts failed:', lastError);
    
    const errorMessage = lastError.message || 'Unknown error';
    const isRateLimitError = errorMessage.toLowerCase().includes('rate limit') || 
                            errorMessage.toLowerCase().includes('quota');
    const isAuthError = errorMessage.toLowerCase().includes('api key') || 
                       errorMessage.toLowerCase().includes('authentication');

    if (isRateLimitError) {
      return Response.json(
        { 
          error: 'Rate limit exceeded. Please wait a moment and try again.',
          details: errorMessage 
        },
        { status: 429 }
      );
    }

    if (isAuthError) {
      return Response.json(
        { 
          error: 'API authentication failed. Please check your API key configuration.',
          details: errorMessage 
        },
        { status: 401 }
      );
    }

    return Response.json(
      { 
        error: 'Failed to generate response from Gemini API.',
        details: errorMessage 
      },
      { status: 500 }
    );

  } catch (error) {
    console.error('Unexpected error in API route:', error);
    return Response.json(
      { 
        error: 'An unexpected error occurred.',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}