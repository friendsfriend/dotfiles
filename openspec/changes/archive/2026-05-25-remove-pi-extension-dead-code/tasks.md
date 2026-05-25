## 1. Verify Dead-Code Candidates

- [x] 1.1 Run repository-wide literal searches for `addDaysIso`, `writeMarkdownFile`, `extractTurnMemory`, `classifyCandidate`, `isActionableCandidate`, `isSuspectedJunkText`, and `relatedImplementationSearch` to confirm there are no active callers outside definitions.
- [x] 1.2 Confirm the targeted code is not part of registered tool schemas, command names, prompt guidance, status identifiers, or storage formats.

## 2. Remove Obsolete Memory Helpers

- [x] 2.1 Remove the unused `addDaysIso` helper from `pi/extensions/memory-system/index.ts`.
- [x] 2.2 Remove the unused `writeMarkdownFile` helper from `pi/extensions/memory-system/index.ts`.
- [x] 2.3 Remove the obsolete `extractTurnMemory` implementation and private-only helper cascade that exists solely for transcript-derived semantic memory.
- [x] 2.4 Re-run targeted searches to ensure removed memory symbols no longer remain unexpectedly.

## 3. Remove Obsolete Repo Graph Helper

- [x] 3.1 Remove the unused `relatedImplementationSearch` helper from `pi/extensions/repo-graph/index.ts`.
- [x] 3.2 Re-run targeted searches to ensure the removed repo graph symbol no longer remains unexpectedly.

## 4. Validate Behavior Preservation

- [x] 4.1 Run existing memory policy validation for `pi/extensions/memory-system/memory-policy.test.ts` using the repository-supported TypeScript test runner if available.
- [x] 4.2 Run existing repo graph validation for `pi/extensions/repo-graph/repo-graph-openspec-boundary.test.ts` and `pi/extensions/repo-graph/repo-graph-summary.test.ts` using the repository-supported TypeScript test runner if available.
- [x] 4.3 Run existing OpenSpec context validation for `pi/extensions/openspec-context/openspec-context.test.ts` if supported, to confirm cleanup did not affect context-tool behavior.
- [x] 4.4 If direct test execution is not supported by the local TypeScript/ESM setup, document the attempted command and failure mode in the implementation summary.
