import { db } from "./db";
import { hashApiKey } from "./api-key";

export async function authenticateApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const raw = authHeader.slice("Bearer ".length).trim();

  const key = await db.apiKey.findUnique({
    where: { hashedKey: hashApiKey(raw) },
    include: { project: true },
  });
  if (!key) return null;

  db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { project: key.project, apiKeyId: key.id };
}