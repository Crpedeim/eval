import type { JudgeProvider, GenerationProvider, EmbeddingProvider } from "./types";
import { GeminiProvider, GeminiGenerator, GeminiEmbedder } from "./gemini";

let cached: JudgeProvider | null = null;

export function getJudgeProvider(): JudgeProvider {
  if (!cached) {
    switch (process.env.JUDGE_PROVIDER ?? "gemini") {
      case "gemini":
        cached = new GeminiProvider();
        break;
      default:
        throw new Error(`unknown judge provider: ${process.env.JUDGE_PROVIDER}`);
    }
  }
  return cached;
}

let generator: GenerationProvider | null = null;

export function getGenerationProvider(): GenerationProvider {
  if (!generator) {
    switch (process.env.RAG_PROVIDER ?? "gemini") {
      case "gemini":
        generator = new GeminiGenerator();
        break;
      default:
        throw new Error(`unknown generation provider: ${process.env.RAG_PROVIDER}`);
    }
  }
  return generator;
}

let embedder: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!embedder) {
    switch (process.env.EMBEDDING_PROVIDER ?? "gemini") {
      case "gemini":
        embedder = new GeminiEmbedder();
        break;
      default:
        throw new Error(`unknown embedding provider: ${process.env.EMBEDDING_PROVIDER}`);
    }
  }
  return embedder;
}
