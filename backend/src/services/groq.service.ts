import Groq from 'groq-sdk';

export interface StructuredAnswer {
  answer: string;
  sources: {
    documentId: string;
    chunkIndex: number;
    score: number;
  }[];
}

export class GroqService {
  private groq: Groq;
  public model: string;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('GROQ_API_KEY is not set. LLM calls will fail.');
    }
    this.groq = new Groq({ apiKey: apiKey || 'dummy_key' });
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  /**
   * Generate a structured JSON response for RAG QA.
   * We prompt the model to return JSON matching the schema and use response_format.
   */
  async generateAnswer(systemInstruction: string, prompt: string): Promise<{ result: StructuredAnswer, usage: any }> {
    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemInstruction + '\n\nYou must return your response strictly as a JSON object with the keys "answer" (string) and "sources" (array of objects with documentId, chunkIndex, and score).' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(resultText) as StructuredAnswer;

      return {
        result,
        usage: {
          promptTokenCount: response.usage?.prompt_tokens || 0,
          candidatesTokenCount: response.usage?.completion_tokens || 0,
          totalTokenCount: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('Groq generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a streaming text response.
   */
  async generateStream(systemInstruction: string, prompt: string) {
    try {
      const responseStream = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        stream: true
      });

      return responseStream;
    } catch (error) {
      console.error('Groq streaming failed:', error);
      throw error;
    }
  }

  /**
   * Generic structured generation (e.g., for summary, quiz).
   */
  async generateStructured(systemInstruction: string, prompt: string): Promise<{ result: any, usage: any }> {
    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(resultText);

      return {
        result,
        usage: {
          promptTokenCount: response.usage?.prompt_tokens || 0,
          candidatesTokenCount: response.usage?.completion_tokens || 0,
          totalTokenCount: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('Groq structured generation failed:', error);
      throw error;
    }
  }
}
