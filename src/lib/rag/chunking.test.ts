import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  chunkCsv, chunkMarkdown, chunkPages, chunkPlainText, overlapTail, packPieces,
  parseCsv, splitMarkdownSections, splitOversized,
} from "./chunking";

describe("splitMarkdownSections", () => {
  test("tracks the heading path and pops on same-or-higher level", () => {
    const md = "# A\nintro\n## B\nb body\n### C\nc body\n## D\nd body";
    const s = splitMarkdownSections(md);
    assert.deepEqual(s.map((x) => x.headings), [["A"], ["A", "B"], ["A", "B", "C"], ["A", "D"]]);
    assert.equal(s[3].body, "d body");
  });

  test("ignores # lines inside code fences", () => {
    const md = "# Real\n```bash\n# not a heading\nnpm run dev\n```\nafter";
    const s = splitMarkdownSections(md);
    assert.equal(s.length, 1);
    assert.match(s[0].body, /# not a heading/);
  });

  test("drops empty sections", () => {
    assert.equal(splitMarkdownSections("# A\n\n# B\ntext").length, 1);
  });
});

describe("splitOversized / packPieces / overlapTail", () => {
  test("splits at sentence ends when a paragraph exceeds the budget", () => {
    const p = "One sentence here. Two sentence here. Three sentence here.";
    const parts = splitOversized(p, 40);
    assert.ok(parts.length >= 2);
    assert.ok(parts.every((x) => x.length <= 40));
    assert.equal(parts.join(" ").replace(/\s+/g, " "), p);
  });

  test("hard-splits a single sentence longer than the budget", () => {
    const parts = splitOversized("x".repeat(250), 100);
    assert.deepEqual(parts.map((x) => x.length), [100, 100, 50]);
  });

  test("overlapTail starts on a word boundary and is empty for short input", () => {
    assert.equal(overlapTail("alpha beta gamma delta", 11), "delta");
    assert.equal(overlapTail("short", 50), "");
  });

  test("packPieces never exceeds the budget and carries overlap forward", () => {
    const pieces = Array.from({ length: 20 }, (_, i) => `paragraph number ${i} with some words`);
    const out = packPieces(pieces, 120, 30);
    assert.ok(out.length > 1);
    assert.ok(out.every((c) => c.length <= 120), "chunk over budget");
    // the start of chunk n+1 repeats the end of chunk n
    const tail = overlapTail(out[0], 30);
    assert.ok(tail && out[1].startsWith(tail));
  });
});

describe("chunkMarkdown", () => {
  test("prefixes every chunk with its heading path and respects maxChars", () => {
    const body = Array.from({ length: 30 }, (_, i) => `Sentence ${i} about the queue worker.`).join(" ");
    const md = `# Guide\n\n## Worker\n\n${body}\n\n## Other\n\nshort`;
    const chunks = chunkMarkdown(md, { maxChars: 300, overlapChars: 50 });
    assert.ok(chunks.length > 2);
    for (const c of chunks) assert.ok(c.content.length <= 300, `len ${c.content.length}`);
    const worker = chunks.filter((c) => c.metadata.heading === "Guide > Worker");
    assert.ok(worker.length >= 2);
    assert.ok(worker.every((c) => c.content.startsWith("Guide > Worker\n\n")));
    assert.deepEqual(worker.map((c) => c.metadata.part), worker.map((_, i) => i));
    assert.equal(chunks.at(-1)!.content, "Guide > Other\n\nshort");
  });

  test("no text is lost: every paragraph appears in some chunk", () => {
    const paras = Array.from({ length: 12 }, (_, i) => `Unique paragraph token${i} lorem ipsum dolor sit amet.`);
    const chunks = chunkMarkdown(`# T\n\n${paras.join("\n\n")}`, { maxChars: 200, overlapChars: 40 });
    const all = chunks.map((c) => c.content).join("\n");
    for (let i = 0; i < 12; i++) assert.ok(all.includes(`token${i} `), `token${i} missing`);
  });
});

describe("chunkPlainText / chunkPages", () => {
  test("pages are chunked separately and tagged with page numbers", () => {
    const chunks = chunkPages(["page one text", "page two text"]);
    assert.deepEqual(chunks.map((c) => c.metadata.page), [1, 2]);
    assert.equal(chunks[1].content, "page two text");
  });

  test("plain text does not treat # as a heading", () => {
    const [c] = chunkPlainText("# hashtag line\nbody");
    assert.equal(c.content, "# hashtag line\nbody");
  });
});

describe("parseCsv", () => {
  test("handles quotes, escaped quotes, embedded commas and newlines, CRLF", () => {
    const csv = 'a,b,c\r\n1,"x, y","say ""hi"""\r\n2,"multi\nline",z\r\n';
    assert.deepEqual(parseCsv(csv), [
      ["a", "b", "c"],
      ["1", "x, y", 'say "hi"'],
      ["2", "multi\nline", "z"],
    ]);
  });

  test("skips blank lines, strips BOM, keeps a final row without newline", () => {
    assert.deepEqual(parseCsv("﻿h1,h2\n\nv1,v2"), [["h1", "h2"], ["v1", "v2"]]);
  });

  test("throws on an unterminated quote", () => {
    assert.throws(() => parseCsv('a\n"open'), /unterminated/);
  });
});

describe("chunkCsv", () => {
  test("one chunk per row with column names next to values", () => {
    const chunks = chunkCsv("path,purpose\nsrc/lib/errors.ts,classifies errors\nsrc/lib/queue.ts,", "files.csv");
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].content, "files.csv (row 1)\npath: src/lib/errors.ts\npurpose: classifies errors");
    assert.equal(chunks[1].content, "files.csv (row 2)\npath: src/lib/queue.ts"); // empty cell dropped
    assert.deepEqual(chunks[0].metadata, { row: 1, columns: ["path", "purpose"] });
  });

  test("header-only CSV yields no chunks", () => {
    assert.deepEqual(chunkCsv("a,b\n", "x.csv"), []);
  });
});
