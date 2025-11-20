import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, BeamStructure } from "../types";

// Define the schema for the structured output
const beamSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    structure: {
      type: Type.OBJECT,
      description: "The extracted structural model data.",
      properties: {
        totalLength: { type: Type.NUMBER },
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              position: { type: Type.NUMBER },
              supportType: { 
                type: Type.STRING, 
                enum: ["FIXED", "PIN", "ROLLER", "FREE", "HINGE"]
              },
              hasHinge: { type: Type.BOOLEAN }
            },
            required: ["id", "label", "position"]
          }
        },
        loads: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["DISTRIBUTED", "POINT", "MOMENT"] },
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER },
              magnitude: { type: Type.NUMBER, description: "Numeric value only" },
              unit: { type: Type.STRING, description: "Unit string, e.g., k, kN/m" },
              symbol: { type: Type.STRING, description: "Parameter symbol, e.g., P1, w1, M" },
              direction: { type: Type.STRING, enum: ["UP", "DOWN", "CLOCKWISE", "COUNTER_CLOCKWISE"] }
            },
            required: ["type", "start", "end", "magnitude", "direction", "symbol"]
          }
        },
        dimensions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER },
              value: { type: Type.NUMBER, description: "Numeric length" },
              unit: { type: Type.STRING, description: "Unit like ft or m" },
              symbol: { type: Type.STRING, description: "Parameter symbol like L1, L2" }
            },
            required: ["start", "end", "value", "symbol"]
          }
        }
      },
      required: ["totalLength", "nodes", "loads", "dimensions"]
    },
    latexCode: {
      type: Type.STRING,
      description: "Complete LaTeX TikZ code snippet."
    }
  },
  required: ["structure", "latexCode"]
};

export const analyzeBeamImage = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: `Analyze this structural beam diagram. 
            1. Identify all supports and hinges.
            2. Identify all loads. Assign them symbolic names (P1, P2 for points, w1 for distributed, M1 for moments) AND extract their numeric values.
            3. Identify spans/dimensions. Assign them symbolic names (L1, L2...).
            4. Create a structured JSON.
            5. Generate LaTeX TikZ code.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: beamSchema,
        thinkingConfig: {
            thinkingBudget: 2048
        }
      }
    });

    if (!response.text) {
      throw new Error("No response from model");
    }

    return JSON.parse(response.text) as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing beam:", error);
    throw error;
  }
};

export const generateStructuralReport = async (structure: BeamStructure): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      text: `
        Perform a structural analysis for the following beam system.
        
        Data provided in JSON format:
        ${JSON.stringify(structure, null, 2)}

        Task:
        1. Calculate Reactions at supports.
        2. Write Equilibrium Equations (Sum Fy, Sum M).
        3. Provide step-by-step reasoning.
        4. Use LaTeX formatting for math equations (wrapped in $...$ or $$...$$).
        5. Return the output in clean Markdown format.
        
        Assume the beam is static. If indeterminate, state the degree of indeterminacy and describe the method (e.g., Force Method) briefly, but solve for reaction forces if possible or set up the equations.
      `
    }
  });

  return response.text || "Analysis failed.";
};
