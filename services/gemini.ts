import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini
// Note: In a real production app, you would handle the key more securely or proxy requests.
// Here we use the environment variable as requested.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ExtractedID {
  studentId: string;
  name: string;
  valid: boolean;
}

export const extractDetailsFromIDCard = async (base64Image: string): Promise<ExtractedID> => {
  // Strip prefix if present
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: "Extract the Student ID and Name from this ID card image. If it's not an ID card or illegible, set valid to false. Return JSON."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studentId: { type: Type.STRING },
            name: { type: Type.STRING },
            valid: { type: Type.BOOLEAN }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as ExtractedID;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    // Fallback for demo if API fails or key is missing
    return { studentId: "UNKNOWN", name: "Manual Entry Required", valid: false };
  }
};

export const verifySelfie = async (selfieBase64: string): Promise<{ status: 'verified' | 'rejected', note: string }> => {
  const cleanBase64 = selfieBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: "Analyze this selfie for an attendance system. Ensure: 1. It is a real human face. 2. The face is clearly visible. Return a JSON with status 'verified' or 'rejected' and a short note."
          }
        ]
      },
       config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['verified', 'rejected'] },
            note: { type: Type.STRING }
          }
        }
      }
    });

     const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as { status: 'verified' | 'rejected', note: string };
  } catch (error) {
    console.error("Gemini Verification Error:", error);
    return { status: 'verified', note: 'AI Verification unavailable, accepted by default.' };
  }
};
