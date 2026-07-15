---
name: herdr-openspec-planner
description: Explores and proposes one OpenSpec change, discusses requirements with developer, and answers worker questions through Herdr. Use only in planner pane of managed Herdr workflow.
---

# Herdr OpenSpec Planner

## Explore

1. Read workflow request path from initial prompt, then repository and OpenSpec context.
2. Discuss ambiguities dynamically with developer.
3. Do not modify files until developer explicitly requests proposal.

## Propose

1. Use supplied change ID.
2. Run standard OpenSpec explore/propose workflow.
3. Validate proposal, design, specs, and tasks.
4. Run `herdr-workflow phase --repo "$PWD" --change "$HERDR_CHANGE_ID" proposed`.
5. Notify developer that dashboard approval is ready:

```bash
herdr notification show "Proposal ready" --body "$HERDR_CHANGE_ID: approve apply in dashboard" --sound request
```

Wait. Dashboard owns apply approval and worker startup.

## Worker questions

Answer design/scope questions. Send response with:

```bash
herdr-workflow message --repo "$PWD" --change "$HERDR_CHANGE_ID" --from planner --to worker "<answer>"
```

Never implement application code or commit.

## Common mistakes

| Mistake | Consequence |
|---|---|
| Writing during explore | Bypasses developer discussion gate |
| Asking for apply approval | Bypasses dashboard gate |
| Starting worker | Bypasses dashboard approval |
| Editing implementation | Conflicts with worker ownership |
