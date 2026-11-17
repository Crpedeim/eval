/**
 * Set up the TriageAI project on the eval platform:
 *   1. find the organization the user "Crpedeim" belongs to (stops if there is more than one),
 *   2. find or create the project "TriageAI" in it (no RAG judges),
 *   3. create an API key (only its SHA-256 hash and prefix are stored, as in tenancy.ts),
 *   4. hand the raw key to Secret Manager on stdin (`triage-trace-api-key`), never via argv,
 *      a shell, a file or the console; if that fails, the ApiKey row is deleted again.
 *
 *   npx tsx scripts/setup-triage-project.ts [--org <slug>]
 *
 * --org is required only when the user belongs to more than one organization.
 *
 * Prints only: org slug, project name, projectId, key prefix, secret name, secret version.
 */
import "dotenv/config";
import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateApiKey } from "../src/lib/api-key";

const GCP_PROJECT = "gen-lang-client-0005933941";
const SECRET = "triage-trace-api-key";
const PROJECT_NAME = "TriageAI";
const KEY_NAME = "triage-ai cloud run";
const USER_NAME = "Crpedeim";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const db = new PrismaClient({ adapter });

/**
 * How to run gcloud without a shell. On Windows `gcloud` is a .cmd file, which Node can only
 * start through cmd.exe, so run the SDK's Python entry point (lib/gcloud.py) directly with
 * the SDK's bundled Python (or CLOUDSDK_PYTHON). Elsewhere `gcloud` is directly executable.
 */
function gcloudCommand(): { file: string; prefix: string[] } {
  if (process.platform !== "win32") return { file: "gcloud", prefix: [] };
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!existsSync(path.join(dir, "gcloud.cmd"))) continue;
    const sdk = path.dirname(dir); // <sdk>/bin/gcloud.cmd -> <sdk>
    const entry = path.join(sdk, "lib", "gcloud.py");
    const bundled = path.join(sdk, "platform", "bundledpython", "python.exe");
    const python = process.env.CLOUDSDK_PYTHON || (existsSync(bundled) ? bundled : "python");
    if (existsSync(entry)) return { file: python, prefix: [entry] };
  }
  throw new Error("gcloud not found on PATH");
}

/** Run gcloud with no shell. `stdin` (if given) is written as-is, with no trailing newline. */
function gcloud(args: string[], stdin?: string): Promise<{ code: number; out: string }> {
  const { file, prefix } = gcloudCommand();
  return new Promise((resolve, reject) => {
    const child = spawn(file, [...prefix, ...args], { shell: false, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d)); // gcloud reports "Created version [N]" on stderr
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, out }));
    child.stdin.end(stdin ?? "");
  });
}

async function main() {
  // a. the organization
  const users = await db.user.findMany({ where: { name: USER_NAME }, select: { id: true } });
  if (users.length === 0) throw new Error(`no user named ${USER_NAME}`);
  const memberships = await db.membership.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
    include: { org: { include: { projects: { select: { name: true } } } } },
  });
  const all = [...new Map(memberships.map((m) => [m.org.id, m.org])).values()];
  // --org <slug> picks one when the user belongs to several; it must be one of theirs.
  const flag = process.argv.indexOf("--org");
  const wanted = flag >= 0 ? process.argv[flag + 1] : undefined;
  const orgs = wanted ? all.filter((o) => o.slug === wanted) : all;
  if (orgs.length !== 1) {
    if (wanted) console.log(`${USER_NAME} is not a member of an organization with slug "${wanted}".`);
    console.log(`${USER_NAME} is a member of ${all.length} organizations; choose one with --org <slug>:`);
    for (const o of all) console.log(`  ${o.slug}: projects ${o.projects.map((p) => p.name).join(", ") || "(none)"}`);
    process.exitCode = 1;
    return;
  }
  const org = orgs[0];

  // b. the project
  const project =
    (await db.project.findFirst({ where: { orgId: org.id, name: PROJECT_NAME } })) ??
    (await db.project.create({ data: { orgId: org.id, name: PROJECT_NAME } }));

  // c. the key
  const { raw, hashedKey, prefix } = generateApiKey();
  const key = await db.apiKey.create({ data: { projectId: project.id, hashedKey, prefix, name: KEY_NAME } });

  // d. raw key -> Secret Manager on stdin; e. roll the row back on failure
  try {
    const exists = (await gcloud(["secrets", "describe", SECRET, "--project", GCP_PROJECT, "--format=value(name)"])).code === 0;
    const args = exists
      ? ["secrets", "versions", "add", SECRET, "--project", GCP_PROJECT, "--data-file=-"]
      : ["secrets", "create", SECRET, "--project", GCP_PROJECT, "--replication-policy", "automatic", "--data-file=-"];
    const res = await gcloud(args, raw);
    if (res.code !== 0) throw new Error(`gcloud exited ${res.code}: ${res.out.trim().split("\n").slice(-3).join(" | ")}`);
    const version = res.out.match(/Created version \[(\d+)\]/)?.[1];
    if (!version) throw new Error("gcloud succeeded but reported no version number");

    // f. the only output
    console.log(`org slug:    ${org.slug}`);
    console.log(`project:     ${project.name}`);
    console.log(`projectId:   ${project.id}`);
    console.log(`key prefix:  ${prefix}`);
    console.log(`secret:      ${SECRET}`);
    console.log(`version:     ${version}`);
  } catch (e) {
    await db.apiKey.delete({ where: { id: key.id } });
    console.error(`Secret Manager step failed; deleted the new ApiKey row. ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
