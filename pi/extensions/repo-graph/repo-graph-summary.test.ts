import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { __repoGraphTest } from "./index";

function hashText(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

const root = await mkdtemp(join(tmpdir(), "repo-graph-summary-"));
const cachePath = join(homedir(), ".pi", "agent", "memory", "file-summaries.json");
let priorCache: string | undefined;
try {
	if (existsSync(cachePath)) priorCache = await readFile(cachePath, "utf8");
	await mkdir(join(root, "src"), { recursive: true });
	const sourcePath = join(root, "src", "memory.ts");
	const initial = "export function queryMemory() { return 'ok'; }\n";
	await writeFile(sourcePath, initial, "utf8");
	const repoKey = hashText(await realpath(root)).slice(0, 16);
	await mkdir(join(homedir(), ".pi", "agent", "memory"), { recursive: true });
	await writeFile(cachePath, JSON.stringify([{ repoKey, repoRoot: root, path: "src/memory.ts", contentHash: hashText(initial), summary: "memory.ts coordinates explicit memory query and save operations.", source: "read-derived", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }], null, 2), "utf8");

	const readDerived = await __repoGraphTest.runRepoGraph(root, { mode: "search", query: "coordinates explicit memory", limit: 5 });
	assert.match(readDerived, /read-derived\/hash-valid/, "hash-valid read-derived summary is displayed");
	assert.match(readDerived, /summary contains "coordinates"/, "summary match contributes deterministic ranking reason");

	await writeFile(sourcePath, "export function queryMemoryAgain() { return 'changed'; }\n", "utf8");
	const stale = await __repoGraphTest.runRepoGraph(root, { mode: "search", query: "coordinates explicit memory", limit: 5 });
	assert.doesNotMatch(stale, /read-derived\/hash-valid/, "stale read-derived summary is omitted from normal results");

	const fallback = await __repoGraphTest.runRepoGraph(root, { mode: "search", query: "queryMemoryAgain", limit: 5 });
	assert.match(fallback, /queryMemoryAgain/, "fresh graph calls reflect file changes made after a previous graph query");
	assert.match(fallback, /deterministic\/current-scan/, "deterministic fallback summary is displayed when no valid read-derived summary exists");
} finally {
	if (priorCache !== undefined) await writeFile(cachePath, priorCache, "utf8");
	else await rm(cachePath, { force: true });
	await rm(root, { recursive: true, force: true });
}
