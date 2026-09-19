import { createHash, randomBytes } from "crypto";

const PREFIX = "evp_live_";

export function generateApiKey() {
  const raw = PREFIX + randomBytes(24).toString("base64url");
  const hashedKey = hashApiKey(raw);
  const prefix = raw.slice(0, PREFIX.length + 4); // non-secret handle for lookup/display
  return { raw, hashedKey, prefix };
}

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}