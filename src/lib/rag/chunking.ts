/**
 * Chunking for unstructured (markdown / plain text / PDF pages) and structured (CSV) input.
 *
 * Character-based rather than token-based: no tokenizer dependency, and ~4 chars/token
 * makes the default 1200-char window roughly 300 tokens — small enough that a top-5
 * context stays cheap, large enough to keep a paragraph and its heading together.
 */

export type ChunkDraft = {
  content: string;
  metadata: Record<string, unknown>;
};

export type ChunkOptions = {
  /** Hard upper bound on chunk length, heading prefix included. */
  maxChars: number;
  /** Characters of the previous chunk repeated at the start of the next one. */
  overlapChars: number;
};

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { maxChars: 1200, overlapChars: 150 };

const MIN_BODY_BUDGET = 200;

// ---------------------------------------------------------------------------
// Markdown / text

type Section = { headings: string[]; body: string };

/** Split markdown into sections at ATX headings, ignoring `#` lines inside code fences. */
export function splitMarkdownSections(text: string): Section[] {
  const sections: Section[] = [];
  const stack: { level: number; title: string }[] = [];
  let buf: string[] = [];
  let inFence = false;

  const flush = () => {
    const body = buf.join("\n").trim();
    if (body) sections.push({ headings: stack.map((h) => h.title), body });
    buf = [];
  };

  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const m = !inFence && /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      flush();
      const level = m[1].length;
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      stack.push({ level, title: m[2] });
      continue;
    }
    buf.push(line);
  }
  flush();
  return sections;
}

/** Break an over-long paragraph at sentence ends, falling back to a hard character split. */
export function splitOversized(paragraph: string, budget: number): string[] {
  if (paragraph.length <= budget) return [paragraph];
  const sentences = paragraph.match(/[^.!?\n]+(?:[.!?]+|\n|$)\s*/g) ?? [paragraph];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (s.length > budget) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      for (let i = 0; i < s.length; i += budget) out.push(s.slice(i, i + budget).trim());
      continue;
    }
    if (cur && (cur + s).length > budget) {
      out.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/** The last ~`n` characters of `s`, starting on a word boundary. Empty if `s` is that short. */
export function overlapTail(s: string, n: number): string {
  if (n <= 0 || s.length <= n) return "";
  const tail = s.slice(-n);
  const ws = tail.search(/\s/);
  return (ws === -1 ? tail : tail.slice(ws + 1)).trim();
}

/** Greedily pack pieces (each ≤ budget) into windows ≤ budget, with overlap between windows. */
export function packPieces(pieces: string[], budget: number, overlap: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const piece of pieces) {
    const sep = cur ? "\n\n" : "";
    if (cur && cur.length + sep.length + piece.length > budget) {
      out.push(cur);
      const tail = overlapTail(cur, overlap);
      cur = tail && tail.length + 2 + piece.length <= budget ? `${tail}\n\n${piece}` : piece;
    } else {
      cur += sep + piece;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function chunkBody(body: string, budget: number, overlap: number): string[] {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => splitOversized(p, budget));
  return packPieces(paragraphs, budget, overlap);
}

/**
 * Markdown: each chunk stays inside one section and is prefixed with its heading path
 * ("Guide > Setup > Env"), so a chunk that only says "set it to true" still carries
 * what "it" is — that context is what the embedding sees.
 */
export function chunkMarkdown(text: string, opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS): ChunkDraft[] {
  const chunks: ChunkDraft[] = [];
  for (const section of splitMarkdownSections(text)) {
    const heading = section.headings.join(" > ");
    const prefix = heading ? `${heading}\n\n` : "";
    const budget = Math.max(opts.maxChars - prefix.length, MIN_BODY_BUDGET);
    chunkBody(section.body, budget, opts.overlapChars).forEach((body, part) => {
      chunks.push({ content: prefix + body, metadata: { heading: heading || null, part } });
    });
  }
  return chunks;
}

/** Plain text: paragraph packing, no heading parsing. */
export function chunkPlainText(
  text: string,
  opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS,
  metadata: Record<string, unknown> = {}
): ChunkDraft[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  return chunkBody(normalized, opts.maxChars, opts.overlapChars).map((content, part) => ({
    content,
    metadata: { ...metadata, part },
  }));
}

/** PDF: chunk each page separately so every chunk can cite a page number. */
export function chunkPages(pages: string[], opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS): ChunkDraft[] {
  return pages.flatMap((text, i) => chunkPlainText(text, opts, { page: i + 1 }));
}

// ---------------------------------------------------------------------------
// CSV

/** RFC 4180 parser: quoted fields, escaped quotes (""), commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (inQuotes) throw new Error("unterminated quoted field in CSV");
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/**
 * Structured rows: one chunk per CSV row, rendered as `column: value` lines under the
 * file name. Keeping column names next to values is what lets a question like
 * "which file handles retries?" match a row whose cells alone are just paths and prose.
 */
export function chunkCsv(text: string, sourceName: string, opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS): ChunkDraft[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h, i) => h.trim() || `column_${i + 1}`);

  return rows.slice(1).map((cells, i) => {
    const lines = header
      .map((h, j) => [h, (cells[j] ?? "").trim()] as const)
      .filter(([, v]) => v !== "")
      .map(([h, v]) => `${h}: ${v}`);
    let content = `${sourceName} (row ${i + 1})\n${lines.join("\n")}`;
    if (content.length > opts.maxChars) content = content.slice(0, opts.maxChars);
    return { content, metadata: { row: i + 1, columns: header } };
  });
}
