---
name: herdr-openspec-archive
description: Archives an explicitly approved, verified OpenSpec change, creates the sole workflow commit, and pushes its feature branch to origin. Use only in archive pane of managed Herdr workflow.
---

# Herdr OpenSpec Archive

Developer approval already exists when this role starts. Stop on any failed check.

## Archive

1. Confirm current branch is `feature/$HERDR_CHANGE_ID` and working tree contains expected implementation only.
2. Confirm all OpenSpec tasks complete and workflow phase is `archive`.
3. Run standard OpenSpec archive with immediate spec sync.
4. Validate archived artifacts and relevant tests.
5. Stage implementation plus archived OpenSpec artifacts.
6. Create one descriptive commit.
7. Push current feature branch to `origin` with upstream:

```bash
git push --set-upstream origin "$(git branch --show-current)"
```

Never force-push, merge, or create PR/MR. On push failure, stop and report it; do not mark complete.

After successful push:

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
