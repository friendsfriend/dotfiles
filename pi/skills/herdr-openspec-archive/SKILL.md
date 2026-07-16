---
name: herdr-openspec-archive
description: Archives an explicitly approved, verified OpenSpec change, creates the sole workflow commit, and pushes its feature branch to origin. Use only in archive pane of managed Herdr workflow.
---

# Herdr OpenSpec Archive

Developer approval already exists when this role starts. Stop on any failed check.

## Archive

1. Read workflow state and confirm current branch matches its `branch` value (`feature/<ticket>-<change>` when ticket exists, otherwise `feature/<change>`).
2. Confirm all OpenSpec tasks complete and workflow phase is `archive`.
3. Run standard OpenSpec archive with immediate spec sync.
4. Validate archived artifacts and relevant tests.
5. Immediately before staging, committing, or pushing, run branch preflight. On error, stop and ask developer to check/switch branch; do not commit or push:

```bash
herdr-workflow preflight-archive --repo "$PWD" --change "$HERDR_CHANGE_ID"
```

6. Stage implementation plus archived OpenSpec artifacts.
7. Create one descriptive commit. Prefix subject with bare ticket identifier and one space when `ticketNumber` exists; otherwise use normal subject:

```text
12345 make preferred date optional
make preferred date optional
```

8. Push current feature branch to `origin` with upstream:

```bash
git push --set-upstream origin "$(git branch --show-current)"
```

Never force-push, merge, or create PR/MR. On push failure, stop and report it; do not mark complete.

After successful push (run preflight again first):

```bash
herdr-workflow phase --repo "$PWD" --change "$HERDR_CHANGE_ID" completed
herdr notification show "OpenSpec change completed" --body "$HERDR_CHANGE_ID archived and pushed; close from dashboard when ready" --sound done
```

## Common mistakes

| Mistake | Consequence |
|---|---|
| Committing before archive validation | Leaves partial final commit |
| Force-pushing | Can destroy remote history |
| Marking complete after failed push | Hides unfinished delivery |
