## Context

The OpenSpec launcher is implemented in `.pi/extensions/openspec-launcher/index.ts`. It builds initialized-project actions from the persisted workflow stage and the current OpenSpec task state. The current `afterExplore`, `afterPropose`, and `afterApply` action orderings omit `OpenSpec Explore`, and the current launcher spec explicitly requires hiding Explore after the `afterExplore` stage.

Explore mode is a reusable discovery/thinking mode, not a terminal workflow step. Users may need to return to Explore while proposing, implementing, debugging, or deciding whether a completed change is ready to archive.

## Goals / Non-Goals

**Goals:**

- Keep `OpenSpec Explore` visible in initialized OpenSpec projects for every workflow stage.
- Preserve the existing `/opsx-explore ` prompt-prefill behavior.
- Preserve stage-aware guidance by changing ordering rather than removing Explore.
- Keep apply/archive grouping, candidate filtering, candidate pickers, startup behavior, and per-repository state behavior unchanged.

**Non-Goals:**

- Changing `/opsx-explore` prompt or skill behavior.
- Changing how apply/archive candidates are computed.
- Replacing persisted launcher stages or changing when stages are updated.
- Changing non-initialized launcher behavior.

## Decisions

### Treat Explore as always available in initialized projects

`buildInitializedActions` should include the Explore action in all stage branches. Stage-specific ordering remains useful, but Explore should not disappear after use.

Alternative considered: reset the repository stage to `initial` after every Explore selection. Rejected because this would blur the existing workflow-stage signal and would not solve the more general need to revisit Explore from later stages.

### Keep stage-specific priorities

The launcher should keep the current priorities for the main next action:

- `initial`: Explore first, then Propose, Apply, Archive, Exit.
- `afterExplore`: Propose remains first, then Apply and Archive, while Explore remains available later in the list.
- `afterPropose`: Apply and Archive remain prioritized, while Explore remains available.
- `afterApply`: Archive remains prioritized, while Explore remains available.

Alternative considered: always show the same ordering for every stage. Rejected because stage-aware ordering is still valuable as lightweight workflow guidance.

### Update the spec before implementation

The current spec says Explore is hidden after Explore. The delta must modify that requirement so implementation and validation agree that Explore is visible across all initialized stages.

Alternative considered: implement the behavior as a bug fix without spec changes. Rejected because the current spec would continue to describe the old behavior.

## Risks / Trade-offs

- More launcher entries in later stages could add small visual noise → Keep the main next workflow action first and place Explore after the higher-priority action groups.
- Users may expect stage state to reset when selecting Explore again → Preserve existing stage update behavior and rely on visible ordering to communicate the recommended next step.
- Existing manual validation notes may assume Explore is hidden → Update validation expectations with the spec delta.
