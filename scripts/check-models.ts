import "dotenv/config";
import { db } from "../src/lib/db";

// Sanity check that the generated client exposes the Auth.js adapter models.
const client = db as unknown as Record<string, unknown>;
for (const model of ["account", "session", "user", "verificationToken"]) {
  console.log(`${model}:`, typeof client[model]);
}
process.exit(0);
