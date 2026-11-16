export type JudgeRequest = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;  // JSON schema for the structured response
};

export interface JudgeProvider {
  readonly name: string;
  readonly model: string;
  complete(req: JudgeRequest): Promise<unknown>;  // parsed JSON matching schema
}

/** Free-text generation with the usage numbers a trace span needs. */
export type GenerationRequest = { system: string; prompt: string };

export type GenerationResult = {
  text: string;
  promptTokens: number;
  /** Visible output tokens. */
  completionTokens: number;
  /** Hidden reasoning tokens (billed as output by Gemini 2.5). */
  thoughtsTokens: number;
};

export interface GenerationProvider {
  readonly name: string;
  readonly model: string;
  generate(req: GenerationRequest): Promise<GenerationResult>;
}

export type EmbeddingTask = "document" | "query";

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimensions: number;
  /** One vector per input, same order. */
  embed(texts: string[], task: EmbeddingTask): Promise<number[][]>;
}
