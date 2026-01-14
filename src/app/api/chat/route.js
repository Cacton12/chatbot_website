import { GoogleGenAI } from "@google/genai";

const RETRY_DELAY = 1000; // 1 second

// Helper to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// System instruction for formatting
const FORMATTING_INSTRUCTION = `You can use the following Markdown formatting in your responses:
- Bold text: **text** or __text__
- Italic text: *text* or _text_
- Inline code: \`code\`
- Links: [text](url)
- Line breaks: Use regular line breaks

Please use these formatting options naturally in your responses to emphasize important points and improve readability.`;

export async function POST(request) {
  try {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return Response.json(
        {
          error:
            "API key not configured. Please add GEMINI_API_KEY to your environment variables.",
        },
        { status: 500 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return Response.json(
        { error: "Invalid request format. Expected JSON." },
        { status: 400 }
      );
    }

    const { message, files } = body;

    // Initialize Google Generative AI
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Build contents array
    const contents = [];

    // Process image files
    if (files && Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        if (!file.type || !file.type.startsWith("image/")) continue;

        let base64Data = file.data;
        if (!base64Data) {
          console.warn(`Skipping file ${file.name}: no data`);
          continue;
        }

        if (typeof base64Data === "string" && base64Data.includes(",")) {
          base64Data = base64Data.split(",")[1];
        }

        if (typeof base64Data === "string") {
          base64Data = base64Data.replace(/\s+/g, "");
        }

        if (!base64Data) {
          console.warn(`Skipping file ${file.name}: invalid base64 data`);
          continue;
        }

        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      }
    }

    // Add text message
    const prompt =
      message?.trim() || (contents.length > 0 ? "What is in this image?" : null);
    
    if (prompt) {
      // If we have images, add text to the contents array
      if (contents.length > 0) {
        contents.push(prompt);
      } else {
        // If no images, just use the text prompt directly
        contents.push(prompt);
      }
    }

    // Validate we have content to send
    if (contents.length === 0) {
      return Response.json(
        { error: "No content provided. Please include a message or image." },
        { status: 400 }
      );
    }

    // Models in order with fallbacks
    const MODELS = [
      "gemini-3-flash-preview",   // Primary model
      "gemini-2.5-flash",          // Fast fallback
      "gemini-2.5-flash-lite",     // Lite fallback
      "gemini-2.5-flash-tts",      // TTS fallback
      "gemma-3-27b-it",            // Final fallback
    ];

    const MAX_RETRIES = MODELS.length - 1;
    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const model = MODELS[attempt];

      try {
        if (attempt > 0) {
          console.log(
            `Retry attempt ${attempt}/${MAX_RETRIES} using model: ${model}`
          );
          await delay(RETRY_DELAY * attempt);
        }

        const response = await ai.models.generateContent({
          model,
          contents,
          systemInstruction: FORMATTING_INSTRUCTION,
        });

        const responseText = response.text;

        if (!responseText) {
          throw new Error("No text response received from API");
        }

        return Response.json({ response: responseText });
      } catch (apiError) {
        lastError = apiError;

        const status = apiError?.status;
        const message =
          apiError?.error?.message || apiError?.message || "Unknown error";

        console.warn(
          `Model ${model} failed (attempt ${attempt + 1}/${
            MAX_RETRIES + 1
          }): ${message}`
        );

        // Only break on **true client errors**, not rate limit (429) or model not found (404)
        if (status >= 400 && status < 500 && status !== 429 && status !== 404) {
          console.warn(`Stopping retries due to client error ${status}`);
          break;
        }
      }
    }

    // All retries failed
    console.error("All retry attempts failed:", lastError);

    const errorMessage = lastError?.message || "Unknown error";
    const isRateLimitError =
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.toLowerCase().includes("quota");
    const isAuthError =
      errorMessage.toLowerCase().includes("api key") ||
      errorMessage.toLowerCase().includes("authentication");

    if (isRateLimitError) {
      return Response.json(
        {
          error: "Rate limit exceeded. Please wait a moment and try again.",
          details: errorMessage,
        },
        { status: 429 }
      );
    }

    if (isAuthError) {
      return Response.json(
        {
          error:
            "API authentication failed. Please check your API key configuration.",
          details: errorMessage,
        },
        { status: 401 }
      );
    }

    return Response.json(
      {
        error: "Failed to generate response from API.",
        details: errorMessage,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Unexpected error in API route:", error);
    return Response.json(
      {
        error: "An unexpected error occurred.",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}