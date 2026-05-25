import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { __openspecLauncherTest, stageUpdateFromSubmittedPrompt } from "./index";

assert.equal(stageUpdateFromSubmittedPrompt("hello world"), undefined, "unrelated input does not request launcher stage discovery");
assert.equal(stageUpdateFromSubmittedPrompt(" /not-opsx-apply change "), undefined, "non-workflow slash input is ignored");
assert.deepEqual(stageUpdateFromSubmittedPrompt("  /opsx-explore idea  "), { stage: "afterExplore" }, "leading and trailing whitespace are trimmed for explore prompts");
assert.deepEqual(stageUpdateFromSubmittedPrompt("/opsx-propose build it"), { stage: "afterPropose" }, "propose prompts update stage");
assert.deepEqual(stageUpdateFromSubmittedPrompt("/opsx-apply harden-runtime"), { stage: "afterApply", lastChange: "harden-runtime" }, "apply prompts preserve change name");
assert.deepEqual(stageUpdateFromSubmittedPrompt("/opsx-verify harden-runtime"), { stage: "afterVerify", lastChange: "harden-runtime" }, "verify prompts update stage and preserve change name");
assert.deepEqual(stageUpdateFromSubmittedPrompt("/opsx-archive harden-runtime "), { stage: "initial", lastChange: "harden-runtime" }, "archive prompts preserve change name");

const changes = [
	{ name: "unfinished", completedTasks: 1, totalTasks: 2, status: "ready" },
	{ name: "complete", completedTasks: 2, totalTasks: 2, status: "ready" },
	{ name: "no-tasks", completedTasks: 0, totalTasks: 0, status: "draft" },
];

assert.deepEqual(__openspecLauncherTest.getVerifyCandidates(changes, false).map((change) => change.name), [], "verify candidates are unavailable without policies");
assert.deepEqual(__openspecLauncherTest.getVerifyCandidates(changes, true).map((change) => change.name), ["complete"], "verify candidates include only completed changes with tasks when policies exist");
assert.equal(__openspecLauncherTest.promptForWorkflowAction({ kind: "verifyCandidate", label: "complete", change: "complete" }), "/opsx-verify complete ", "verify candidate fills verify prompt");

const initialWithPolicies = __openspecLauncherTest.buildInitializedActions("initial", changes, true).map((action) => action.kind);
assert.deepEqual(initialWithPolicies, ["explore", "propose", "applyGroup", "verifyGroup", "archiveGroup", "exit"], "initial ordering includes verify group when policies exist");

const initialWithoutPolicies = __openspecLauncherTest.buildInitializedActions("initial", changes, false).map((action) => action.kind);
assert.deepEqual(initialWithoutPolicies, ["explore", "propose", "applyGroup", "archiveGroup", "exit"], "verify group is hidden when policies do not exist");

const afterApplyWithPolicies = __openspecLauncherTest.buildInitializedActions("afterApply", changes, true).map((action) => action.kind);
assert.deepEqual(afterApplyWithPolicies, ["verifyGroup", "archiveGroup", "applyGroup", "propose", "explore", "exit"], "after apply prioritizes verify before archive when policies exist");

const afterApplyWithoutPolicies = __openspecLauncherTest.buildInitializedActions("afterApply", changes, false).map((action) => action.kind);
assert.deepEqual(afterApplyWithoutPolicies, ["archiveGroup", "applyGroup", "propose", "explore", "exit"], "after apply without policies prioritizes archive before apply");

const afterVerify = __openspecLauncherTest.buildInitializedActions("afterVerify", changes, true).map((action) => action.kind);
assert.deepEqual(afterVerify, ["archiveGroup", "verifyGroup", "applyGroup", "propose", "explore", "exit"], "after verify prioritizes archive before verify and apply");

const root = await mkdtemp(join(tmpdir(), "openspec-launcher-policies-"));
try {
	await mkdir(join(root, ".pi", "verifier", "nested"), { recursive: true });
	assert.equal(await __openspecLauncherTest.hasVerifierPolicies(root), false, "missing policy files means no verifier policies");
	await writeFile(join(root, ".pi", "verifier", "nested", "policy.md"), "nested\n", "utf8");
	assert.equal(await __openspecLauncherTest.hasVerifierPolicies(root), false, "nested policies do not enable verifier candidates");
	await writeFile(join(root, ".pi", "verifier", "policy.md"), "policy\n", "utf8");
	assert.equal(await __openspecLauncherTest.hasVerifierPolicies(root), true, "direct child Markdown policy enables verifier candidates");
} finally {
	await rm(root, { recursive: true, force: true });
}
