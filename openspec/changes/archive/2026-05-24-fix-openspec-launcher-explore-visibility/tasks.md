## 1. Launcher Action Ordering

- [x] 1.1 Update `buildInitializedActions` so `OpenSpec Explore` is included for `afterExplore`, `afterPropose`, and `afterApply` stages.
- [x] 1.2 Preserve current stage-specific priorities by keeping propose first after explore, apply/archive prioritized after propose, and archive/apply prioritized after apply.
- [x] 1.3 Preserve existing initial-stage ordering and non-initialized launcher behavior.

## 2. Behavior Preservation

- [x] 2.1 Verify selecting Explore still fills `/opsx-explore ` without submitting the prompt.
- [x] 2.2 Verify grouped apply and archive actions still open candidate pickers and preserve candidate filtering behavior.
- [x] 2.3 Verify stage update handling for submitted `/opsx-*` prompts remains unchanged.

## 3. Validation

- [x] 3.1 Run TypeScript syntax/type validation appropriate for the pi extension.
- [x] 3.2 Manually verify `/openspec` shows Explore when launcher state is `initial`.
- [x] 3.3 Manually verify `/openspec` shows Explore when launcher state is `afterExplore`.
- [x] 3.4 Manually verify `/openspec` shows Explore when launcher state is `afterPropose` or `afterApply`.
- [x] 3.5 Run OpenSpec validation for the change artifacts.
