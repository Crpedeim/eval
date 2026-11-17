| Metric | vector (run `cmwkovirq0000kwmkdursvn6i`) | hybrid (run `cmwkpgb5t0000wkmke8iv1yiq`) |
|---|---|---|
| Questions answered | 150/150 (0 failed) | 150/150 (0 failed) |
| **Recall@5** (share of evidence sentences in top 5) | 0.974 | 0.774 |
| All evidence in top 5 (both hops found) | 142/150 | 86/150 |
| Hit rate@5 (≥1 evidence sentence) | 1.000 | 0.973 |
| **MRR@5** | 0.972 | 0.784 |
| Recall@5, bridge questions | 0.970 (n=127) | 0.757 (n=127) |
| Recall@5, comparison questions | 1.000 (n=23) | 0.870 (n=23) |
| **rag-answer-relevance** mean / pass@0.7 | 0.913 / 0.913 (150 judged, 0 errored) | 0.647 / 0.647 (150 judged, 0 errored) |
| **rag-faithfulness** mean / pass@0.7 | 0.997 / 0.993 (150 judged, 0 errored) | 1.000 / 1.000 (150 judged, 0 errored) |
| Answer contains gold answer (normalised) | 123/150 = 0.820 | 88/150 = 0.587 |
| "I don't know" answers | 12 | 51 |
| **Request latency p50 / p95** | 2693 / 3758 ms | 2746 / 4062 ms |
| retrieve step p50 / p95 | 643 / 972 ms | 664 / 942 ms |
| Cost per answer (retrieve + generate) | $0.000828 | $0.000892 |
| Judge cost per answer | $0.003557 | $0.003748 |
| **Cost per eval answer incl. judges** | $0.004385 | $0.004640 |
| Total run cost incl. judges | $0.6578 | $0.6960 |
| Wall clock, enqueue → all judges settled | 961 s | 956 s |

Per question, hybrid vs vector recall@5: higher on 1, lower on 58, equal on 91.
