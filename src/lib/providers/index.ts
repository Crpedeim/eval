import type { JudgeProvider } from "./types";
import { GeminiProvider } from "./gemini";

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