/** Rubrics of the two RAG judges (llm_judge evaluators scoped to rag.answer traces). */
export const FAITHFULNESS_RUBRIC =
  "The INPUT contains numbered context passages followed by a QUESTION; the OUTPUT is an answer. " +
  "Score FAITHFULNESS only: is every factual claim in the OUTPUT supported by the context passages? " +
  "1.0 = every claim is supported; lower the score for each claim that is unsupported by or contradicts the passages. " +
  "If the OUTPUT says the documents do not contain the answer and the passages indeed lack it, score 1.0. " +
  "Do not judge completeness, style or length, and ignore citation markers like [1].";

export const RELEVANCE_RUBRIC =
  "The INPUT ends with a QUESTION; the OUTPUT is an answer to it. " +
  "Score ANSWER RELEVANCE only: does the OUTPUT directly address what the QUESTION asks? " +
  "1.0 = directly and fully addresses it; 0.5 = partially or with substantial off-topic content; " +
  "0.0 = does not address it, including declining to answer. " +
  "Do not judge factual accuracy against the passages, and do not reward or penalize length.";
