import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { RagDataset } from "./eval";

/** Labelled question sets shipped with the app: datasets/rag/*.json and datasets/rag/<dir>/questions.json. */
const ROOT = path.join(process.cwd(), "datasets", "rag");
const SKIP_DIRS = new Set(["results", "corpus"]);

export type BundledDataset = { name: string; description?: string; questions: number; file: string };

function candidateFiles(): string[] {
  if (!existsSync(ROOT)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(ROOT)) {
    const full = path.join(ROOT, entry);
    if (entry.endsWith(".json")) files.push(full);
    else if (!SKIP_DIRS.has(entry) && statSync(full).isDirectory()) {
      const q = path.join(full, "questions.json");
      if (existsSync(q)) files.push(q);
    }
  }
  return files;
}

function load(file: string): RagDataset | null {
  try {
    const parsed = RagDataset.safeParse(JSON.parse(readFileSync(file, "utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function bundledDatasets(): BundledDataset[] {
  return candidateFiles()
    .map((file) => ({ file, ds: load(file) }))
    .filter((x): x is { file: string; ds: RagDataset } => x.ds !== null)
    .map(({ file, ds }) => ({
      name: ds.name,
      description: ds.description,
      questions: ds.questions.length,
      file: path.relative(process.cwd(), file).replaceAll("\\", "/"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Looks a dataset up by name only, so a request can never make the server read an arbitrary path. */
export function bundledDataset(name: string): RagDataset | null {
  for (const file of candidateFiles()) {
    const ds = load(file);
    if (ds?.name === name) return ds;
  }
  return null;
}
