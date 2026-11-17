export type JudgeRequest = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;  // JSON schema for the structured response
};

/** Token usage reported by the model API for one call. */
export type Usage = {
  promptTokens: number;
  /** Visible output tokens. */
  completionTokens: number;
  /** Hidden reasoning tokens; Gemini bills them as output. */
  thoughtsTokens: number;
};

export type JudgeResult = {
  /** Parsed JSON matching the request schema. */
  data: unknown;
  usage: Usage;
  latencyMs: number;
};

export interface JudgeProvider {
  readonly name: string;
  readonly model: string;
  complete(req: JudgeRequest): Promise<JudgeResult>;
}

/** Free-text generation with the usage numbers a trace span needs. */
export type GenerationRequest = { system: string; prompt: string };

export type GenerationResult = Usage & { text: string };

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
