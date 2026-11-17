"""
Build the public RAG benchmark from HotpotQA (distractor setting, dev split).

    python -I scripts/hotpotqa-build.py <validation.parquet> [n=150] [seed=20261117]

Source: https://huggingface.co/datasets/hotpotqa/hotpot_qa
        file distractor/validation-00000-of-00001.parquet (27,452,575 bytes,
        sha256 c20b638ca82b21d04fe12e14ff417ad05153d4d215a65de54497fca4e972f7c6)
Licence: CC BY-SA 4.0 (https://hotpotqa.github.io/). Yang et al., EMNLP 2018.

Writes datasets/rag/hotpotqa/:
  questions.json    n questions in this platform's dataset format; evidence = the labelled
                    supporting-fact sentences, verbatim
  corpus/part-*.md  every context paragraph of the sampled questions (2 gold + 8 distractors
                    each), one "## <title>" section per paragraph, deduplicated by title
"""
import json
import os
import random
import sys

import pyarrow.parquet as pq

src = sys.argv[1]
n = int(sys.argv[2]) if len(sys.argv) > 2 else 150
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 20261117
out = os.path.join("datasets", "rag", "hotpotqa")
PER_PART = 250  # paragraphs per corpus document (each part stays far below the 5 MB upload cap)
MIN_EVIDENCE = 8  # the dataset schema rejects shorter evidence spans

rows = pq.read_table(src).to_pylist()
rng = random.Random(seed)
order = list(range(len(rows)))
rng.shuffle(order)

questions, paragraphs = [], {}
skipped = {"short_or_missing_evidence": 0}
for i in order:
    if len(questions) == n:
        break
    r = rows[i]
    ctx = dict(zip(r["context"]["title"], r["context"]["sentences"]))
    evidence = []
    for title, sid in zip(r["supporting_facts"]["title"], r["supporting_facts"]["sent_id"]):
        sents = ctx.get(title, [])
        if sid >= len(sents):
            continue  # a few HotpotQA labels point past the end of the paragraph
        s = sents[sid].strip()
        if len(s) >= MIN_EVIDENCE:
            evidence.append(s)
    if len(evidence) < 2:  # keep it multi-hop: both supporting sentences must be usable
        skipped["short_or_missing_evidence"] += 1
        continue
    for title, sents in ctx.items():
        text = "".join(sents).strip()
        prev = paragraphs.get(title)
        if prev is not None and prev != text:
            # same title, different text: keep both under distinct headings
            title = f"{title} ({len(paragraphs)})"
        paragraphs[title] = text
    questions.append({
        "id": r["id"],
        "question": r["question"],
        "evidence": sorted(set(evidence), key=evidence.index),
        "answer": r["answer"],
        "type": r["type"],
        "level": r["level"],
    })

os.makedirs(os.path.join(out, "corpus"), exist_ok=True)
titles = sorted(paragraphs)
parts = [titles[i:i + PER_PART] for i in range(0, len(titles), PER_PART)]
for p, chunk in enumerate(parts, 1):
    body = "\n\n".join(f"## {t}\n\n{paragraphs[t]}" for t in chunk)
    with open(os.path.join(out, "corpus", f"hotpotqa-part-{p}.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write(body + "\n")

dataset = {
    "name": f"hotpotqa-dev-distractor-{n}",
    "description": (
        f"{n} questions sampled (seed {seed}) from the HotpotQA dev set, distractor setting "
        "(Yang et al., 2018; CC BY-SA 4.0). Corpus: the 10 context paragraphs of every sampled "
        "question (2 gold + 8 TF-IDF-retrieved distractors), deduplicated by title. Evidence: the "
        "labelled supporting-fact sentences, verbatim; most questions need two of them (multi-hop)."
    ),
    "questions": questions,
}
with open(os.path.join(out, "questions.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(dataset, f, indent=1, ensure_ascii=False)
    f.write("\n")

types = {}
for q in questions:
    types[q["type"]] = types.get(q["type"], 0) + 1
print(json.dumps({
    "questions": len(questions),
    "by_type": types,
    "evidence_spans": sum(len(q["evidence"]) for q in questions),
    "paragraphs": len(paragraphs),
    "corpus_parts": len(parts),
    "corpus_chars": sum(len(t) for t in paragraphs.values()),
    "skipped": skipped,
    "source_rows": len(rows),
}, indent=1))
