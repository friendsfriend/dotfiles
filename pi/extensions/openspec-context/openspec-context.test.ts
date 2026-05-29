import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { __openspecContextTest } from "./index";

type ExecResult = { code: number; stdout: string; stderr: string };

const root = await mkdtemp(join(tmpdir(), "openspec-context-"));
const activeChange = "add-context-tool";
const archivedChange = "2026-05-24-old-context";

function json(value: unknown): ExecResult {
	return { code: 0, stdout: JSON.stringify(value), stderr: "" };
}

const runner = async (_command: string, args: string[]): Promise<ExecResult> => {
	if (args.join(" ") === "list --json") {
		return json({ changes: [{ name: activeChange, status: "ready", completedTasks: 1, totalTasks: 2 }] });
	}
	if (args.join(" ") === `status --change ${activeChange} --json`) {
		return json({ changeName: activeChange, schemaName: "spec-driven", isComplete: true, artifacts: [{ id: "tasks", outputPath: "tasks.md", status: "done" }] });
	}
	if (args.join(" ") === `instructions apply --change ${activeChange} --json`) {
		return json({ state: "ready", instruction: "Read context files.", progress: { total: 2, complete: 1, remaining: 1 }, tasks: [{ id: "1", description: "1.1 done", done: true }], contextFiles: { tasks: [join(root, "openspec", "changes", activeChange, "tasks.md")] } });
	}
	return { code: 1, stdout: "", stderr: `unexpected openspec args: ${args.join(" ")}` };
};

try {
	await mkdir(join(root, "openspec", "changes", activeChange, "specs", "openspec-context-tooling"), { recursive: true });
	await mkdir(join(root, "openspec", "changes", "archive", archivedChange, "specs", "openspec-context-tooling"), { recursive: true });
	await mkdir(join(root, "openspec", "specs", "openspec-context-tooling"), { recursive: true });
	await writeFile(join(root, "openspec", "config.yaml"), "project: test\n", "utf8");
	await writeFile(join(root, "openspec", "changes", activeChange, "proposal.md"), "## Why\n", "utf8");
	await writeFile(join(root, "openspec", "changes", activeChange, "tasks.md"), "## Foundation\n\n- [x] 1.1 Create foundation.\n- [ ] 1.2 Implement task context search.\n", "utf8");
	await writeFile(join(root, "openspec", "changes", activeChange, "specs", "openspec-context-tooling", "spec.md"), "## ADDED Requirements\n", "utf8");
	await writeFile(join(root, "openspec", "changes", "archive", archivedChange, "tasks.md"), "- [x] archived task\n", "utf8");
	await writeFile(join(root, "openspec", "changes", "archive", archivedChange, "specs", "openspec-context-tooling", "spec.md"), "## ADDED Requirements\n", "utf8");
	await writeFile(join(root, "openspec", "specs", "openspec-context-tooling", "spec.md"), "## Requirements\n", "utf8");

	const emptyOverview = await __openspecContextTest.runOpenSpecContext(root, { mode: "overview" }, async () => json({ changes: [] }));
	assert.match(emptyOverview, /Active changes:\n- none/, "overview reports no active changes");

	const overview = await __openspecContextTest.runOpenSpecContext(root, { mode: "overview", includeArchived: true }, runner);
	assert.match(overview, new RegExp(activeChange), "overview includes active changes from current CLI state");
	assert.match(overview, new RegExp(archivedChange), "overview includes archived changes when requested");

	const change = await __openspecContextTest.runOpenSpecContext(root, { mode: "change", change: activeChange }, runner);
	assert.match(change, /Schema: spec-driven/, "change mode includes schema/status details");
	assert.match(change, /Task progress: 1\/2 complete/, "change mode includes parsed task progress");
	assert.match(change, /openspec-context-tooling/, "change mode includes affected capabilities");

	const taskContext = await __openspecContextTest.runOpenSpecContext(root, { mode: "task-context", change: activeChange, task: "1.2" }, runner);
	assert.match(taskContext, /1\.2 Implement task context search/, "task-context returns matched task");
	assert.match(taskContext, /graphify query suggestion/, "task-context suggests follow-up graphify query");
	const removedToolName = ["repo", "graph"].join("_");
	assert.equal(taskContext.includes(removedToolName), false, "task-context does not suggest removed graph tool");
	assert.match(taskContext, /Related OpenSpec artifacts:/, "task-context includes related artifacts");

	const capability = await __openspecContextTest.runOpenSpecContext(root, { mode: "capability", capability: "openspec-context-tooling", includeArchived: true }, runner);
	assert.match(capability, /Stable spec paths:/, "capability mode reports stable specs");
	assert.match(capability, new RegExp(activeChange), "capability mode includes active changes");
	assert.match(capability, new RegExp(archivedChange), "capability mode includes requested archived changes");

	const readiness = await __openspecContextTest.runOpenSpecContext(root, { mode: "readiness", change: activeChange, readiness: "apply" }, runner);
	assert.match(readiness, /Apply readiness/, "readiness mode reports apply readiness");
	assert.match(readiness, /Progress: 1\/2 complete/, "readiness mode includes CLI progress");
} finally {
	await rm(root, { recursive: true, force: true });
}
