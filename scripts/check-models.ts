import "dotenv/config";
import { db } from "../src/lib/db";

console.log("account:", typeof (db as any).account);
console.log("session:", typeof (db as any).session);
console.log("user:", typeof (db as any).user);
console.log("verificationToken:", typeof (db as any).verificationToken);
process.exit(0);