import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const MAX_TASK_SUGGESTION_TERMS = 8;

type OpenSpecContextMode = "overview" | "change" | "tasks" | "task-context" | "capability" | "readiness";
type ReadinessKind = "apply" | "archive";
type ExecResult = { code: number; stdout: string; stderr: string };
type ExecRunner = (command: string, args: string[], options: { cwd: string; timeout: number }) => Promise<ExecResult>;

interface OpenSpecContextParams {
	mode: OpenSpecContextMode;
	query?: string;
	target?: string;
	change?: string;
	task?: string;
	capability?: string;
	includeArchived?: boolean;
	readiness?: ReadinessKind;
	limit?: number;
}

interface ListChange {
	name?: unknown;
	status?: unknown;
	completedTasks?: unknown;
	totalTasks?: unknown;
	schemaName?: unknown;
}

interface StatusArtifact {
	id?: unknown;
	outputPath?: unknown;
	status?: unknown;
}

interface StatusResponse {
	changeName?: unknown;
	schemaName?: unknown;
	isComplete?: unknown;
	applyRequires?: unknown;
	artifacts?: unknown;
}

interface InstructionTask {
	id?: unknown;
	description?: unknown;
	done?: unknown;
}

interface InstructionResponse {
	state?: unknown;
	instruction?: unknown;
	progress?: unknown;
	tasks?: unknown;
	contextFiles?: unknown;
}

interface TaskInfo {
	id: string;
	ordinal: number;
	text: string;
	done: boolean;
	path: string;
	line: number;
	section?: string;
}

interface CliSuccess<T> {
	ok: true;
	value: T;
}

interface CliFailure {
	ok: false;
	command: string;
	message: string;
}

type CliResult<T> = CliSuccess<T> | CliFailure;

function StringEnum<T extends readonly string[]>(values: T, options?: { description?: string; default?: T[number] }) {
	return Type.Unsafe<T[number]>({
		type: "string",
		enum: values,
		...(options?.description ? { description: options.description } : {}),
		...(options?.default ? { default: options.default } : {}),
	});
}

const openspecContextParameters = Type.Object({
	mode: StringEnum(["overview", "change", "tasks", "task-context", "capability", "readiness"] as const, {
		description: "OpenSpec context query mode.",
	}),
	query: Type.Optional(Type.String({ description: "Search text, change name, task text, or capability name depending on mode." })),
	target: Type.Optional(Type.String({ description: "Change, task, or capability target depending on mode." })),
	change: Type.Optional(Type.String({ description: "OpenSpec change name for change, tasks, task-context, and readiness modes." })),
	task: Type.Optional(Type.String({ description: "Task id or task text for task-context mode." })),
	capability: Type.Optional(Type.String({ description: "Capability name for capability mode." })),
	includeArchived: Type.Optional(Type.Boolean({ description: "Include archived changes when listing or matching context." })),
	readiness: Type.Optional(StringEnum(["apply", "archive"] as const, { description: "Readiness instruction set to query in readiness mode.", default: "apply" })),
	limit: Type.Optional(Type.Number({ description: "Maximum number of listed items. Defaults to 10, max 50." })),
});

function clampLimit(value: number | undefined): number {
	if (!Number.isFinite(value ?? NaN)) return 10;
	return Math.max(1, Math.min(50, Math.floor(value!)));
}

function toPosix(path: string): string {
	return path.split("/").join("/");
}

function rel(root: string, path: string): string {
	return toPosix(relative(root, path) || ".");
}

async function findOpenSpecRoot(cwd: string): Promise<string | undefined> {
	let current = resolve(cwd);
	while (true) {
		if (existsSync(join(current, "openspec", "config.yaml"))) return current;
		const parent = dirname(current);
		if (parent === current) return undefined;
		current = parent;
	}
}

function textFromError(result: ExecResult, fallback: string): string {
	return (result.stderr || result.stdout || fallback).trim();
}

async function runOpenSpecJson<T>(runner: ExecRunner, root: string, args: string[]): Promise<CliResult<T>> {
	const command = `openspec ${args.map((arg) => JSON.stringify(arg)).join(" ")}`;
	try {
		const result = await runner("openspec", args, { cwd: root, timeout: 10_000 });
		if (result.code !== 0) return { ok: false, command, message: textFromError(result, `${command} failed with code ${result.code}`) };
		try {
			return { ok: true, value: JSON.parse(result.stdout || "{}") as T };
		} catch (error) {
			return { ok: false, command, message: `Could not parse JSON from ${command}: ${(error as Error).message}` };
		}
	} catch (error) {
		return { ok: false, command, message: (error as Error).message };
	}
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function activeChangeName(change: ListChange): string | undefined {
	return asString(change.name);
}

async function readTextIfExists(path: string): Promise<string | undefined> {
	try {
		const info = await stat(path);
		if (!info.isFile()) return undefined;
		return await readFile(path, "utf8");
	} catch {
		return undefined;
	}
}

async function listDirectories(path: string): Promise<string[]> {
	try {
		const entries = await readdir(path, { withFileTypes: true });
		return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
	} catch {
		return [];
	}
}

async function listChangeSpecCapabilities(changeDir: string): Promise<string[]> {
	return listDirectories(join(changeDir, "specs"));
}

async function listStableCapabilities(root: string): Promise<Array<{ capability: string; path: string }>> {
	const candidates = [join(root, "openspec", "specs"), join(root, "openspec", "capabilities")];
	const rows: Array<{ capability: string; path: string }> = [];
	for (const base of candidates) {
		for (const capability of await listDirectories(base)) {
			const specPath = join(base, capability, "spec.md");
			if (existsSync(specPath)) rows.push({ capability, path: rel(root, specPath) });
		}
	}
	return rows.sort((a, b) => a.capability.localeCompare(b.capability) || a.path.localeCompare(b.path));
}

async function archivedChanges(root: string): Promise<Array<{ name: string; path: string }>> {
	const archiveRoot = join(root, "openspec", "changes", "archive");
	return (await listDirectories(archiveRoot)).map((name) => ({ name, path: rel(root, join(archiveRoot, name)) }));
}

function changeDir(root: string, name: string, archived = false): string {
	return archived ? join(root, "openspec", "changes", "archive", name) : join(root, "openspec", "changes", name);
}

async function findChangeLocation(root: string, name: string, includeArchived: boolean): Promise<{ state: "active" | "archived"; dir: string; path: string } | undefined> {
	const active = changeDir(root, name, false);
	if (existsSync(active)) return { state: "active", dir: active, path: rel(root, active) };
	if (includeArchived) {
		const archive = changeDir(root, name, true);
		if (existsSync(archive)) return { state: "archived", dir: archive, path: rel(root, archive) };
	}
	return undefined;
}

function artifactPaths(root: string, dir: string): string[] {
	const direct = ["proposal.md", "design.md", "tasks.md"].map((file) => join(dir, file)).filter(existsSync).map((path) => rel(root, path));
	const specsDir = join(dir, "specs");
	const specs: string[] = [];
	if (existsSync(specsDir)) {
		// Keep this bounded and deterministic: OpenSpec delta specs are one level below specs/<capability>/spec.md.
		for (const capability of require("node:fs").readdirSync(specsDir, { withFileTypes: true }).filter((entry: import("node:fs").Dirent) => entry.isDirectory()).map((entry: import("node:fs").Dirent) => entry.name).sort()) {
			const spec = join(specsDir, capability, "spec.md");
			if (existsSync(spec)) specs.push(rel(root, spec));
		}
	}
	return [...direct, ...specs];
}

async function parseTasks(root: string, dir: string): Promise<TaskInfo[]> {
	const path = join(dir, "tasks.md");
	const content = await readTextIfExists(path);
	if (!content) return [];
	const tasks: TaskInfo[] = [];
	let section: string | undefined;
	content.split(/\r?\n/).forEach((line, index) => {
		const heading = line.match(/^#{1,6}\s+(.+)$/);
		if (heading) section = heading[1].trim();
		const task = line.match(/^- \[([ xX])\]\s+(.+)$/);
		if (!task) return;
		const text = task[2].trim();
		const id = text.match(/^(\d+(?:\.\d+)*)\b/)?.[1] ?? String(tasks.length + 1);
		tasks.push({ id, ordinal: tasks.length + 1, text, done: task[1].toLowerCase() === "x", path: rel(root, path), line: index + 1, section });
	});
	return tasks;
}

function formatCliFailure(failure: CliFailure): string {
	return [`OpenSpec CLI failure while running ${failure.command}:`, failure.message, "", "No workflow state was guessed from stale context."].join("\n");
}

function artifactReadAdvice(paths: string[]): string[] {
	return paths.length ? ["", "Read exact artifact files next before making exact claims:", ...paths.map((path) => `- ${path}`)] : ["", "No artifact files were found to suggest for exact reads."];
}

function repoGraphSuggestion(text: string): string {
	const stop = new Set(["the", "and", "with", "for", "from", "that", "this", "mode", "query", "tool", "task", "implement", "create", "update", "add"]);
	const terms = text.toLowerCase().split(/[^a-z0-9_.-]+/).filter((term) => term.length > 2 && !stop.has(term)).slice(0, MAX_TASK_SUGGESTION_TERMS);
	return terms.length ? `repo_graph search query suggestion: ${terms.join(" ")}` : "repo_graph search query suggestion: derive terms from the exact task/design text after reading artifacts.";
}

async function queryOverview(root: string, runner: ExecRunner, params: OpenSpecContextParams): Promise<string> {
	const limit = clampLimit(params.limit);
	const list = await runOpenSpecJson<{ changes?: ListChange[] }>(runner, root, ["list", "--json"]);
	if (!list.ok) return formatCliFailure(list);
	const active = Array.isArray(list.value.changes) ? list.value.changes.map(activeChangeName).filter((name): name is string => Boolean(name)).sort() : [];
	const stableCaps = await listStableCapabilities(root);
	const lines = [
		`OpenSpec context overview for ${root}`,
		"Active changes:",
		...(active.length ? active.slice(0, limit).map((name) => `- ${name}`) : ["- none"]),
	];
	if (params.includeArchived) {
		const archived = await archivedChanges(root);
		lines.push("", "Archived changes:", ...(archived.length ? archived.slice(0, limit).map((change) => `- ${change.name} (${change.path})`) : ["- none"]));
	}
	lines.push("", "Stable capabilities:", ...(stableCaps.length ? stableCaps.slice(0, limit).map((cap) => `- ${cap.capability}: ${cap.path}`) : ["- none detected"]));
	lines.push("", "Guidance: use openspec_context for workflow/artifact context, then read exact artifacts before claims or edits. Use repo_graph only for non-OpenSpec implementation navigation.");
	return lines.join("\n");
}

async function queryChange(root: string, runner: ExecRunner, params: OpenSpecContextParams): Promise<string> {
	const name = params.change ?? params.target ?? params.query;
	if (!name?.trim()) return "Change mode requires a change name. Try overview mode to list available changes.";
	const includeArchived = params.includeArchived ?? true;
	const location = await findChangeLocation(root, name, includeArchived);
	if (!location) return `OpenSpec change not found: ${name}\nTry overview mode with includeArchived=true to list available changes.`;
	const artifacts = artifactPaths(root, location.dir);
	const caps = await listChangeSpecCapabilities(location.dir);
	const tasks = await parseTasks(root, location.dir);
	const lines = [`OpenSpec change ${name}:`, `State: ${location.state}`, `Path: ${location.path}`];
	if (location.state === "active") {
		const status = await runOpenSpecJson<StatusResponse>(runner, root, ["status", "--change", name, "--json"]);
		if (status.ok) {
			lines.push(`Schema: ${asString(status.value.schemaName) ?? "unknown"}`, `Complete: ${status.value.isComplete === true ? "yes" : "no"}`);
			const statusArtifacts = Array.isArray(status.value.artifacts) ? status.value.artifacts as StatusArtifact[] : [];
			if (statusArtifacts.length) lines.push("Artifacts:", ...statusArtifacts.map((artifact) => `- ${asString(artifact.id) ?? "artifact"}: ${asString(artifact.outputPath) ?? "unknown path"} (${asString(artifact.status) ?? "unknown"})`));
		} else {
			lines.push("", formatCliFailure(status));
		}
	}
	lines.push("Affected capabilities:", ...(caps.length ? caps.map((cap) => `- ${cap}`) : ["- none detected from delta specs"]));
	if (tasks.length) {
		const complete = tasks.filter((task) => task.done).length;
		lines.push(`Task progress: ${complete}/${tasks.length} complete`, ...tasks.slice(0, clampLimit(params.limit)).map((task) => `- [${task.done ? "x" : " "}] ${task.id} ${task.text} (${task.path}:${task.line})`));
	}
	lines.push(...artifactReadAdvice(artifacts));
	return lines.join("\n");
}

async function queryTasks(root: string, params: OpenSpecContextParams): Promise<string> {
	const name = params.change ?? params.target ?? params.query;
	if (!name?.trim()) return "Tasks mode requires a change name.";
	const location = await findChangeLocation(root, name, params.includeArchived ?? true);
	if (!location) return `OpenSpec change not found: ${name}`;
	const tasks = await parseTasks(root, location.dir);
	if (!tasks.length) return `No tasks.md checkboxes found for ${name}.` + artifactReadAdvice(artifactPaths(root, location.dir)).join("\n");
	const complete = tasks.filter((task) => task.done).length;
	const lines = [`Tasks for ${name} (${location.state}): ${complete}/${tasks.length} complete`];
	for (const task of tasks.slice(0, clampLimit(params.limit))) lines.push(`- [${task.done ? "x" : " "}] ${task.id} ${task.text} (${task.path}:${task.line}${task.section ? `, ${task.section}` : ""})`);
	lines.push(...artifactReadAdvice([tasks[0].path]));
	return lines.join("\n");
}

function matchTask(tasks: TaskInfo[], needle: string | undefined): TaskInfo | undefined {
	if (!needle?.trim()) return tasks.find((task) => !task.done) ?? tasks[0];
	const normalized = needle.trim().toLowerCase();
	return tasks.find((task) => task.id === normalized || String(task.ordinal) === normalized || task.text.toLowerCase().includes(normalized))
		?? tasks.map((task) => ({ task, score: normalized.split(/\s+/).filter((term) => task.text.toLowerCase().includes(term)).length })).sort((a, b) => b.score - a.score)[0]?.task;
}

async function queryTaskContext(root: string, params: OpenSpecContextParams): Promise<string> {
	const name = params.change;
	if (!name?.trim()) return "Task-context mode requires a change name plus optional task id/text.";
	const location = await findChangeLocation(root, name, params.includeArchived ?? true);
	if (!location) return `OpenSpec change not found: ${name}`;
	const tasks = await parseTasks(root, location.dir);
	const task = matchTask(tasks, params.task ?? params.target ?? params.query);
	if (!task) return `No matching task found for ${name}.`;
	const artifacts = artifactPaths(root, location.dir);
	return [
		`Task context for ${name}:`,
		`- [${task.done ? "x" : " "}] ${task.id} ${task.text}`,
		`Task file: ${task.path}:${task.line}`,
		`Change state: ${location.state}`,
		"Related OpenSpec artifacts:",
		...(artifacts.length ? artifacts.map((path) => `- ${path}`) : ["- none detected"]),
		"",
		repoGraphSuggestion(task.text),
		"Use that follow-up repo_graph query only for implementation/source/config navigation outside openspec/.",
		...artifactReadAdvice(artifacts),
	].join("\n");
}

async function queryCapability(root: string, params: OpenSpecContextParams): Promise<string> {
	const capability = params.capability ?? params.target ?? params.query;
	if (!capability?.trim()) return "Capability mode requires a capability name.";
	const stable = (await listStableCapabilities(root)).filter((item) => item.capability === capability);
	const activeDirs = (await listDirectories(join(root, "openspec", "changes"))).filter((name) => name !== "archive");
	const matchingChanges: Array<{ state: "active" | "archived"; name: string; path: string }> = [];
	for (const change of activeDirs) {
		const dir = changeDir(root, change, false);
		if (existsSync(join(dir, "specs", capability, "spec.md"))) matchingChanges.push({ state: "active", name: change, path: rel(root, dir) });
	}
	if (params.includeArchived) {
		for (const archived of await archivedChanges(root)) {
			const dir = changeDir(root, archived.name, true);
			if (existsSync(join(dir, "specs", capability, "spec.md"))) matchingChanges.push({ state: "archived", name: archived.name, path: archived.path });
		}
	}
	const specReads = [...stable.map((item) => item.path), ...matchingChanges.map((change) => rel(root, join(root, change.path, "specs", capability, "spec.md"))).filter((path) => existsSync(join(root, path)))];
	return [
		`Capability ${capability}:`,
		"Stable spec paths:",
		...(stable.length ? stable.map((item) => `- ${item.path}`) : ["- none detected"]),
		"Related changes:",
		...(matchingChanges.length ? matchingChanges.slice(0, clampLimit(params.limit)).map((change) => `- ${change.name} (${change.state}, ${change.path})`) : ["- none detected"]),
		...artifactReadAdvice(specReads),
	].join("\n");
}

async function queryReadiness(root: string, runner: ExecRunner, params: OpenSpecContextParams): Promise<string> {
	const name = params.change ?? params.target ?? params.query;
	if (!name?.trim()) return "Readiness mode requires a change name.";
	const readiness = params.readiness ?? "apply";
	const result = await runOpenSpecJson<InstructionResponse>(runner, root, ["instructions", readiness, "--change", name, "--json"]);
	if (!result.ok) return formatCliFailure(result);
	const progress = result.value.progress && typeof result.value.progress === "object" ? result.value.progress as Record<string, unknown> : undefined;
	const tasks = Array.isArray(result.value.tasks) ? result.value.tasks as InstructionTask[] : [];
	const contextFiles = result.value.contextFiles && typeof result.value.contextFiles === "object" ? result.value.contextFiles as Record<string, unknown> : {};
	const files = Object.values(contextFiles).flatMap((value) => Array.isArray(value) ? value : []).filter((value): value is string => typeof value === "string").map((path) => rel(root, path));
	const lines = [
		`${readiness[0].toUpperCase()}${readiness.slice(1)} readiness for ${name}:`,
		`State: ${asString(result.value.state) ?? "unknown"}`,
		progress ? `Progress: ${asNumber(progress.complete)}/${asNumber(progress.total)} complete` : "Progress: unavailable",
	];
	if (asString(result.value.instruction)) lines.push(`Instruction: ${asString(result.value.instruction)}`);
	if (tasks.length) lines.push("Tasks:", ...tasks.slice(0, clampLimit(params.limit)).map((task) => `- [${task.done === true ? "x" : " "}] ${asString(task.id) ?? "?"} ${asString(task.description) ?? ""}`));
	lines.push(...artifactReadAdvice(files));
	return lines.join("\n");
}

async function runOpenSpecContext(rootOrCwd: string, params: OpenSpecContextParams, runner: ExecRunner): Promise<string> {
	const root = await findOpenSpecRoot(rootOrCwd);
	if (!root) return `No OpenSpec project found from ${rootOrCwd}. Expected openspec/config.yaml in this directory or an ancestor.`;
	switch (params.mode) {
		case "overview":
			return queryOverview(root, runner, params);
		case "change":
			return queryChange(root, runner, params);
		case "tasks":
			return queryTasks(root, params);
		case "task-context":
			return queryTaskContext(root, params);
		case "capability":
			return queryCapability(root, params);
		case "readiness":
			return queryReadiness(root, runner, params);
	}
}

export const __openspecContextTest = {
	runOpenSpecContext,
	parseTasks,
};

export default function openspecContextExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "openspec_context",
		label: "OpenSpec Context",
		description: "Query fresh OpenSpec workflow, artifact, task, capability, and readiness context without using durable memory or repo graph scans.",
		promptSnippet: "Fresh OpenSpec workflow context for changes, tasks, artifacts, capabilities, and apply/archive readiness.",
		promptGuidelines: [
			"Use openspec_context for OpenSpec workflow state, active/archived changes, artifact paths, task progress, capability specs, and apply/archive readiness.",
			"Treat openspec_context as workflow context, not authority for artifact contents: read exact OpenSpec files before claims, edits, or implementation.",
			"Do not use repo_graph for OpenSpec changes, specs, tasks, or capabilities; use repo_graph only afterward for implementation/source/config navigation outside openspec/.",
			"If an OpenSpec CLI command fails, do not guess workflow state; surface the failure and ask for guidance.",
		],
		parameters: openspecContextParameters,
		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			onUpdate?.({ content: [{ type: "text", text: "Querying fresh OpenSpec context from current CLI/filesystem state..." }] });
			const runner: ExecRunner = (command, args, options) => pi.exec(command, args, options);
			const output = await runOpenSpecContext(ctx.cwd, params as OpenSpecContextParams, runner);
			return {
				content: [{ type: "text", text: output }],
				details: { mode: (params as OpenSpecContextParams).mode, fresh: true, persisted: false, durableMemory: false },
			};
		},
	});
}
