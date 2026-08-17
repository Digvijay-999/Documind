import { GoogleGenAI, Type } from '@google/genai';

export interface StructuredAnswer {
  answer: string;
  sources: {
    documentId: string;
    chunkIndex: number;
    score: number;
  }[];
}

export class LlmService {
  private ai: GoogleGenAI;
  public model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. LLM calls will fail.');
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || 'dummy_key' });
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Generate a structured JSON response.
   */
  async generateAnswer(systemInstruction: string, prompt: string): Promise<{ result: StructuredAnswer, usage: any }> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: {
                type: Type.STRING,
                description: 'The direct answer to the user\'s question based on the provided document context.'
              },
              sources: {
                type: Type.ARRAY,
                description: 'List of sources used to formulate the answer.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    documentId: { type: Type.STRING },
                    chunkIndex: { type: Type.INTEGER },
                    score: { type: Type.NUMBER }
                  },
                  required: ['documentId', 'chunkIndex', 'score']
                }
              }
            },
            required: ['answer', 'sources']
          }
        }
      });

      const resultText = response.text || '{}';
      const result = JSON.parse(resultText) as StructuredAnswer;

      return {
        result,
        usage: response.usageMetadata
      };
    } catch (error) {
      console.error('LLM generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a streaming text response.
   * Note: This returns an AsyncGenerator of chunks.
   */
  async generateStream(systemInstruction: string, prompt: string) {
    try {
      const responseStream = await this.ai.models.generateContentStream({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          // For streaming, we typically just want plain text since streaming partial JSON is difficult to parse on the fly
          responseMimeType: 'text/plain'
        }
      });

      return responseStream;
    } catch (error) {
      console.error('LLM streaming failed:', error);
      throw error;
    }
  }
}
