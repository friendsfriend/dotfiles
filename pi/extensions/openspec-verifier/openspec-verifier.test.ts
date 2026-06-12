import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { __openspecVerifierTest } from "./index";

type ExecResult = { code: number; stdout: string; stderr: string };

function json(value: unknown): ExecResult {
	return { code: 0, stdout: JSON.stringify(value), stderr: "" };
}

const root = await mkdtemp(join(tmpdir(), "openspec-verifier-"));
const rootNoPolicies = await mkdtemp(join(tmpdir(), "openspec-verifier-no-policies-"));
const change = "verify-me";
let diff = "diff --git a/file.ts b/file.ts\n+hello\n";

const runner = async (command: string, args: string[]): Promise<ExecResult> => {
	if (command === "openspec" && args.join(" ") === `status --change ${change} --json`) {
		return json({ changeName: change, schemaName: "spec-driven", isComplete: true });
	}
	if (command === "openspec" && args.join(" ") === `instructions apply --change ${change} --json`) {
		return json({ state: "all_done", progress: { total: 1, complete: 1, remaining: 0 }, tasks: [{ id: "1", description: "done", done: true }] });
	}
	if (command === "git" && args.join(" ") === "diff --no-ext-diff --binary") return { code: 0, stdout: diff, stderr: "" };
	if (command === "git" && args.join(" ") === "diff --name-only") return { code: 0, stdout: "file.ts\n", stderr: "" };
	return { code: 1, stdout: "", stderr: `unexpected command: ${command} ${args.join(" ")}` };
};

try {
	await mkdir(join(root, "openspec"), { recursive: true });
	await mkdir(join(root, ".pi", "verifier", "nested"), { recursive: true });
	await writeFile(join(root, "openspec", "config.yaml"), "project: test\n", "utf8");
	await writeFile(join(root, ".pi", "verifier", "b-policy.md"), "B policy\n", "utf8");
	await writeFile(join(root, ".pi", "verifier", "a-policy.md"), "A policy\n", "utf8");
	await writeFile(join(root, ".pi", "verifier", "ignore.txt"), "ignore\n", "utf8");
	await writeFile(join(root, ".pi", "verifier", "nested", "z-policy.md"), "nested\n", "utf8");

	const bundle = await __openspecVerifierTest.loadVerifierPolicies(root);
	assert.deepEqual(bundle.files.map((file) => file.relativePath), [".pi/verifier/a-policy.md", ".pi/verifier/b-policy.md"], "loads only direct child Markdown policies sorted lexicographically");
	assert.match(bundle.text, /# Default verifier policy/, "policy bundle includes the default baseline");
	assert.match(bundle.text, /## Policy file: \.pi\/verifier\/a-policy\.md/, "policy bundle includes visible file boundary for first policy");
	assert.match(bundle.text, /---\n\n## Policy file: \.pi\/verifier\/b-policy\.md/, "policy bundle includes file boundary between policies");

	await mkdir(join(rootNoPolicies, "openspec"), { recursive: true });
	await writeFile(join(rootNoPolicies, "openspec", "config.yaml"), "project: test\n", "utf8");
	const defaultOnlyBundle = await __openspecVerifierTest.loadVerifierPolicies(rootNoPolicies);
	assert.equal(defaultOnlyBundle.files.length, 0, "no repository policy files are required");
	assert.match(defaultOnlyBundle.text, /Default code review baseline/, "default-only policy includes code review baseline");
	assert.match(defaultOnlyBundle.text, /Default OpenSpec verification baseline/, "default-only policy includes OpenSpec verification baseline");

	assert.deepEqual(__openspecVerifierTest.parseVerifyArgs("verify-me --model openai/gpt-5.5"), { change: "verify-me", modelRef: "openai/gpt-5.5", selectModel: false }, "parses explicit verifier model");
	assert.deepEqual(__openspecVerifierTest.parseVerifyArgs("verify-me --model=openai/gpt-5.5"), { change: "verify-me", modelRef: "openai/gpt-5.5", selectModel: false }, "parses equals verifier model syntax");
	assert.deepEqual(__openspecVerifierTest.parseVerifyArgs("verify-me --select-model"), { change: "verify-me", selectModel: true }, "parses model selection flag");

	assert.equal(__openspecVerifierTest.parseVerifierVerdict("Looks good\nVERDICT: PASS\n").verdict, "pass");
	assert.equal(__openspecVerifierTest.parseVerifierVerdict("Findings\nVERDICT: FAIL\n").verdict, "fail");
	assert.equal(__openspecVerifierTest.parseVerifierVerdict("Looks good but no verdict").verdict, "inconclusive");
	assert.equal(__openspecVerifierTest.parseVerifierVerdict("VERDICT: PASS\nVERDICT: FAIL\n").verdict, "inconclusive", "conflicting verdicts are inconclusive");
	const hunkVerdict = __openspecVerifierTest.parseVerifierVerdict('Finding\nHUNK_COMMENTS_JSON:\n```json\n{"comments":[{"filePath":"file.ts","hunk":1,"summary":"Fix this","rationale":"Evidence"}]}\n```\nVERDICT: FAIL\n');
	assert.equal(hunkVerdict.hunkComments.length, 1, "parses Hunk verifier comments");
	assert.equal(hunkVerdict.hunkComments[0]?.author, "openspec-verifier", "defaults Hunk comment author");

	const packet = await __openspecVerifierTest.buildVerificationContextPacket(change, root, runner);
	assert.equal(packet.policyBundle.files.length, 2, "context packet includes policies");
	assert.equal(packet.changedFiles?.[0], "file.ts", "context packet includes changed file list");
	assert.ok(packet.gitDiffHash, "context packet hashes git diff when available");
	assert.match(__openspecVerifierTest.contextPacketPrompt(packet), /# Verifier policy baseline and extensions/, "prompt includes policy section");

	await __openspecVerifierTest.recordVerifierPass(packet);
	assert.equal(await __openspecVerifierTest.isVerifierPassFresh(root, change, runner), true, "recorded pass is fresh for same policy and diff hash");
	diff = "diff --git a/file.ts b/file.ts\n+changed\n";
	assert.equal(await __openspecVerifierTest.isVerifierPassFresh(root, change, runner), false, "recorded pass becomes stale when git diff hash changes");
} finally {
	await rm(root, { recursive: true, force: true });
	await rm(rootNoPolicies, { recursive: true, force: true });
}
