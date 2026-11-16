import { GoogleGenAI, ThinkingLevel, type ThinkingConfig } from "@google/genai";
import type {
  JudgeProvider, JudgeRequest,
  GenerationProvider, GenerationRequest, GenerationResult,
  EmbeddingProvider, EmbeddingTask,
} from "./types";

let sharedClient: GoogleGenAI | null = null;
function client() {
  sharedClient ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return sharedClient;
}

export class GeminiProvider implements JudgeProvider {
  readonly name = "gemini";
  readonly model = process.env.JUDGE_MODEL ?? "gemini-2.5-flash";

  async complete(req: JudgeRequest): Promise<unknown> {
    const res = await client().models.generateContent({
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

export class GeminiGenerator implements GenerationProvider {
  readonly name = "gemini";
  // Defaults to the judge's model: one model for the whole platform unless overridden.
  readonly model = process.env.RAG_MODEL ?? process.env.JUDGE_MODEL ?? "gemini-2.5-flash";

  /**
   * Keep hidden reasoning low: grounded QA over retrieved context doesn't need it, and it
   * keeps latency and tokens/sec about the answer the user sees. Gemini 2.5 takes a token
   * budget (0 = off); Gemini 3 ignores that field and takes a level instead (lowest
   * accepted by gemini-3.8-flash is LOW — MINIMAL is rejected).
   */
  private thinkingConfig(): ThinkingConfig {
    if (this.model.startsWith("gemini-2")) {
      return { thinkingBudget: Number(process.env.RAG_THINKING_BUDGET ?? 0) };
    }
    const level = (process.env.RAG_THINKING_LEVEL ?? "LOW").toUpperCase() as ThinkingLevel;
    return { thinkingLevel: level };
  }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const res = await client().models.generateContent({
      model: this.model,
      contents: req.prompt,
      config: {
        systemInstruction: req.system,
        temperature: 0,
        thinkingConfig: this.thinkingConfig(),
      },
    });

    const text = res.text;
    if (!text) throw new Error("empty response from generator");
    const u = res.usageMetadata;
    return {
      text,
      promptTokens: u?.promptTokenCount ?? 0,
      completionTokens: u?.candidatesTokenCount ?? 0,
      thoughtsTokens: u?.thoughtsTokenCount ?? 0,
    };
  }
}

const TASK_TYPE: Record<EmbeddingTask, string> = {
  document: "RETRIEVAL_DOCUMENT",
  query: "RETRIEVAL_QUERY",
};

export class GeminiEmbedder implements EmbeddingProvider {
  readonly name = "gemini";
  readonly model = process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";
  // Fixed by the schema: Chunk.embedding is vector(768). gemini-embedding-001 is
  // Matryoshka-trained, so truncating its 3072-d output to 768 is supported.
  readonly dimensions = 768;
  private readonly batchSize = 50;

  async embed(texts: string[], task: EmbeddingTask): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const res = await client().models.embedContent({
        model: this.model,
        contents: batch,
        config: { taskType: TASK_TYPE[task], outputDimensionality: this.dimensions },
      });
      const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
      if (vectors.length !== batch.length) {
        throw new Error(`embedder returned ${vectors.length} vectors for ${batch.length} inputs`);
      }
      out.push(...vectors);
    }
    return out;
  }
}
