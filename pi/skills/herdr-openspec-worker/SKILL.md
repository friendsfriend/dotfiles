---
name: herdr-openspec-worker
description: Applies one approved OpenSpec change, asks persistent planner for clarification, and fixes verifier findings. Use only in worker pane of managed Herdr workflow.
---

# Herdr OpenSpec Worker

## Apply

1. Read fresh OpenSpec apply instructions and referenced artifacts.
2. Implement all tasks with minimum correct diff.
3. Ask planner when proposal intent is unclear:

```bash
herdr-workflow message --repo "$PWD" --change "$HERDR_CHANGE_ID" --from worker --to planner "<question>"
```

4. Run only focused tests covering changed behavior: affected test file/class/module or nearest existing regression test. Never run project-wide test suite; verifier owns that gate. Run relevant non-test build/lint/type checks when cheap.
5. Mark tasks complete only after focused validation.
6. Start verification without sending an implementation summary; Git diff and OpenSpec artifacts are authoritative:

```bash
herdr-workflow verify --repo "$PWD" --change "$HERDR_CHANGE_ID"
```

Do not commit, push, archive, or spawn agents.

## Fix

Read only consolidated report path from handoff. Its stable critical/warning finding IDs are the fix checklist; do not reopen raw verifier reports unless consolidated evidence links them. Fix every listed ID, rerun focused tests covering each fix plus relevant non-test checks. Do not run project-wide test suite; verifier runs it. Then start next round with the same `herdr-workflow verify` command. Do not restate report or implementation in handoff. Third failed round pauses for developer instruction.

## Common mistakes

| Mistake | Consequence |
|---|---|
| Guessing unclear design | Creates proposal drift |
| Committing | Breaks archive-only commit policy |
| Running full suite | Duplicates verifier’s mandatory gate |
