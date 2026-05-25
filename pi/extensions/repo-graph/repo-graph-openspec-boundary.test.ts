import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { __repoGraphTest } from "./index";

const root = await mkdtemp(join(tmpdir(), "repo-graph-openspec-boundary-"));
try {
	await mkdir(join(root, "src"), { recursive: true });
	await mkdir(join(root, "openspec", "changes", "add-hidden", "specs", "hidden-capability"), { recursive: true });
	await writeFile(join(root, "src", "app.ts"), "export function visibleImplementation() { return 'ok'; }\n", "utf8");
	await writeFile(join(root, "openspec", "config.yaml"), "project: test\n", "utf8");
	await writeFile(join(root, "openspec", "changes", "add-hidden", "tasks.md"), "- [ ] hidden task only in openspec\n", "utf8");
	await writeFile(join(root, "openspec", "changes", "add-hidden", "specs", "hidden-capability", "spec.md"), "## ADDED Requirements\n", "utf8");

	const overview = await __repoGraphTest.runRepoGraph(root, { mode: "overview", limit: 20 });
	assert.doesNotMatch(overview, /openspec\//, "overview excludes openspec paths");
	assert.doesNotMatch(overview, /add-hidden|hidden-capability/, "overview excludes OpenSpec change/capability nodes");
	assert.match(overview, /src/, "overview still includes normal repository directories");

	const search = await __repoGraphTest.runRepoGraph(root, { mode: "search", query: "hidden task", limit: 20 });
	assert.doesNotMatch(search, /openspec\//, "search excludes openspec paths");
	assert.doesNotMatch(search, /hidden-capability|add-hidden/, "search excludes OpenSpec change and capability content");
	assert.match(search, /No graph matches/, "OpenSpec-only task text does not create graph matches");

	const neighbors = await __repoGraphTest.runRepoGraph(root, { mode: "neighbors", target: ".", depth: 3, limit: 50 });
	assert.doesNotMatch(neighbors, /openspec\//, "neighbors excludes openspec paths");
	assert.doesNotMatch(neighbors, /add-hidden|hidden-capability/, "neighbors excludes OpenSpec nodes");

	const deprecated = await __repoGraphTest.runRepoGraph(root, { mode: "task-context", change: "add-hidden", task: "hidden task" });
	assert.match(deprecated, /openspec_context/, "deprecated OpenSpec repo graph modes point to openspec_context");
} finally {
	await rm(root, { recursive: true, force: true });
}
