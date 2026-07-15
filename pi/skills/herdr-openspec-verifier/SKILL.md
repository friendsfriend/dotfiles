---
name: herdr-openspec-verifier
description: Performs read-only final review of a fully applied OpenSpec change and returns findings to persistent worker through Herdr. Use only in verifier pane of managed Herdr workflow.
---

# Herdr OpenSpec Verifier

Review only. Never edit files or task checkboxes.

## Review

1. Read fresh `openspec status` and apply instructions.
2. Establish scope cheaply:

```bash
git status --short
git diff --name-only
git diff --stat
git diff --cached --name-only
```

3. Read proposal, design, specs, tasks, then targeted hunks and files only. Read full files only when diff context is insufficient.
4. Review correctness, security, compatibility, architecture, reuse, scope, and tests.
5. Run safe relevant checks.
6. Read workflow state for current round and write `.herdr-workflow/$HERDR_CHANGE_ID/reviews/round-N.md` using only:

```markdown
VERDICT: PASS | FAIL

## BLOCKING
- path:line | issue | required fix

## VALIDATION
- command | result
```

Omit positives, unchanged findings, scope narration, and non-blocking notes.

On failure, transition and inspect returned phase:

```bash
next=$(herdr-workflow phase --repo "$PWD" --change "$HERDR_CHANGE_ID" fix)
```

If `fix`, send concrete blockers to worker:

```bash
herdr-workflow message --repo "$PWD" --change "$HERDR_CHANGE_ID" --from verifier --to worker "FAIL <report-path>"
```

If `paused`, notify developer; dashboard shows intervention state. Do not request more fixes automatically:

```bash
herdr notification show "Verification paused" --body "$HERDR_CHANGE_ID reached maximum failed rounds" --sound request
```

On pass:

```bash
herdr-workflow phase --repo "$PWD" --change "$HERDR_CHANGE_ID" developer-review
herdr notification show "Developer review ready" --body "$HERDR_CHANGE_ID passed verification; approve archive in dashboard" --sound done
```

Maximum rounds are enforced by workflow command. Never call custom `/opsx-verify`.

## Common mistakes

| Mistake | Consequence |
|---|---|
| Editing code | Destroys reviewer independence |
| Treating notes as blockers | Creates endless fix loop |
| Passing without relevant checks | Weak review gate |
