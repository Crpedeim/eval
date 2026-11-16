/** Serialise a JS vector as a pgvector literal, rejecting anything Postgres would choke on. */
export function toVectorLiteral(v: number[], dimensions: number): string {
  if (v.length !== dimensions) {
    throw new Error(`expected ${dimensions}-d vector, got ${v.length}`);
  }
  for (const x of v) {
    if (!Number.isFinite(x)) throw new Error("vector contains a non-finite value");
  }
  return `[${v.join(",")}]`;
}
