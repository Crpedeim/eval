import { GoogleGenAI } from "@google/genai";
import type { JudgeProvider, JudgeRequest } from "./types";

export class GeminiProvider implements JudgeProvider {
  readonly name = "gemini";
  readonly model = process.env.JUDGE_MODEL ?? "gemini-2.5-flash";
  private client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  async complete(req: JudgeRequest): Promise<unknown> {
    const res = await this.client.models.generateContent({
      model: this.model,
      contents: `${req.system}\n\n${req.prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: req.schema,
        temperature: 0,
      },
    });

    const text = res.text;
    if (!text) throw new Error("empty response from judge");
    return JSON.parse(text);
  }
}