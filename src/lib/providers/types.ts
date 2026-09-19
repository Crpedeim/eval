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