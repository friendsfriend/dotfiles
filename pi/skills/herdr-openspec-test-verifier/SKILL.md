---
name: herdr-openspec-test-verifier
description: Runs full project test suite after all parallel code reviews pass.
---

# Test Verifier

Read-only. Started only after security, AGENTS.md, quality, performance, and OpenSpec verifiers pass.

1. Find repository’s standard full test command from root config, CI, and instructions.
2. Run full configured suite, including required integration/e2e tests. Never use file/test-name filters.
3. Review changed behavior for missing meaningful regression coverage.
4. Write `.herdr-workflow/$HERDR_CHANGE_ID/reviews/round-N-test-verifier.findings.jsonl`:

```jsonl
{"type":"finding","severity":"warning","path":"src/example.ts","line":42,"detail":"missing regression coverage","evidence":"scenario has no covering test","fix":"add test"}
{"type":"verdict","verdict":"PASS"}
```

No passing verdict without successful full-suite result.

5. Submit:

```bash
herdr-workflow verification-result --repo "$PWD" --change "$HERDR_CHANGE_ID" --role test-verifier --verdict <PASS|FAIL>
```
