import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, type SelectItem, SelectList, Text } from "@earendil-works/pi-tui";
import { existsSync } from "node:fs";
import { mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const STATE_PATH = join(homedir(), ".pi", "agent", "openspec-launcher-state.json");

type WorkflowStage = "initial" | "afterExplore" | "afterPropose" | "afterApply";
type WorkflowActionKind = "explore" | "propose" | "applyGroup" | "archiveGroup" | "init" | "exit";
type CandidateActionKind = "applyCandidate" | "archiveCandidate";
type LauncherActionKind = WorkflowActionKind | CandidateActionKind;

interface LauncherAction {
	kind: LauncherActionKind;
	label: string;
	description?: string;
	change?: string;
	candidates?: OpenSpecChangeSummary[];
}

interface OpenSpecChangeSummary {
	name: string;
	completedTasks: number;
	totalTasks: number;
	status?: string;
}

interface RepositoryLauncherState {
	stage: WorkflowStage;
	lastChange?: string;
	updatedAt: string;
}

type LauncherState = Record<string, RepositoryLauncherState>;

interface OpenSpecListChange {
	name?: unknown;
	completedTasks?: unknown;
	totalTasks?: unknown;
	status?: unknown;
}

function nowIso(): string {
	return new Date().toISOString();
}

function asNumber(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function canonicalPath(path: string): Promise<string> {
	try {
		return await realpath(path);
	} catch {
		return resolve(path);
	}
}

async function findOpenSpecRoot(cwd: string): Promise<string | undefined> {
	let current = await canonicalPath(cwd);
	while (true) {
		if (existsSync(join(current, "openspec", "config.yaml"))) return current;
		const parent = dirname(current);
		if (parent === current) return undefined;
		current = parent;
	}
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as T;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
		throw error;
	}
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const tmp = `${path}.${process.pid}.tmp`;
	await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
	await rename(tmp, path);
}

async function loadLauncherState(): Promise<LauncherState> {
	return readJsonFile<LauncherState>(STATE_PATH, {});
}

async function saveLauncherState(state: LauncherState): Promise<void> {
	await writeJsonFile(STATE_PATH, state);
}

async function getRepositoryStage(root: string): Promise<WorkflowStage> {
	const state = await loadLauncherState();
	return state[root]?.stage ?? "initial";
}

async function setRepositoryStage(root: string, stage: WorkflowStage, lastChange?: string): Promise<void> {
	const state = await loadLauncherState();
	state[root] = { stage, lastChange, updatedAt: nowIso() };
	await saveLauncherState(state);
}

async function runOpenSpecJson<T>(pi: ExtensionAPI, root: string, args: string[]): Promise<T> {
	const result = await pi.exec("openspec", args, { cwd: root, timeout: 10_000 });
	if (result.code !== 0) {
		throw new Error((result.stderr || result.stdout || `openspec ${args.join(" ")} failed`).trim());
	}
	return JSON.parse(result.stdout || "{}") as T;
}

function summarizeChange(change: OpenSpecListChange): OpenSpecChangeSummary | undefined {
	if (typeof change.name !== "string" || change.name.length === 0) return undefined;
	return {
		name: change.name,
		completedTasks: asNumber(change.completedTasks),
		totalTasks: asNumber(change.totalTasks),
		status: typeof change.status === "string" ? change.status : undefined,
	};
}

async function discoverOpenSpecChanges(pi: ExtensionAPI, root: string): Promise<OpenSpecChangeSummary[]> {
	const list = await runOpenSpecJson<{ changes?: OpenSpecListChange[] }>(pi, root, ["list", "--json"]);
	const rawChanges = Array.isArray(list.changes) ? list.changes : [];
	return rawChanges.map(summarizeChange).filter((change): change is OpenSpecChangeSummary => Boolean(change));
}

function getApplyCandidates(changes: OpenSpecChangeSummary[]): OpenSpecChangeSummary[] {
	return changes.filter((change) => change.totalTasks > 0 && change.completedTasks < change.totalTasks);
}

function getArchiveCandidates(changes: OpenSpecChangeSummary[]): OpenSpecChangeSummary[] {
	return changes.filter((change) => change.totalTasks > 0 && change.completedTasks === change.totalTasks);
}

function candidateDescription(change: OpenSpecChangeSummary): string {
	return `${change.completedTasks}/${change.totalTasks} tasks${change.status ? ` • ${change.status}` : ""}`;
}

function candidateAction(kind: "applyCandidate" | "archiveCandidate", change: OpenSpecChangeSummary): LauncherAction {
	return {
		kind,
		change: change.name,
		label: change.name,
		description: candidateDescription(change),
	};
}

function groupedAction(kind: "applyGroup" | "archiveGroup", candidates: OpenSpecChangeSummary[]): LauncherAction | undefined {
	if (candidates.length === 0) return undefined;
	const isApply = kind === "applyGroup";
	return {
		kind,
		candidates,
		label: `OpenSpec ${isApply ? "Apply" : "Archive"} (${candidates.length})`,
		description: `${candidates.length} ${candidates.length === 1 ? "change" : "changes"} ${isApply ? "ready for implementation" : "ready to archive"}`,
	};
}

function definedActions(actions: Array<LauncherAction | undefined>): LauncherAction[] {
	return actions.filter((action): action is LauncherAction => Boolean(action));
}

function buildInitializedActions(stage: WorkflowStage, changes: OpenSpecChangeSummary[]): LauncherAction[] {
	const explore: LauncherAction = { kind: "explore", label: "OpenSpec Explore", description: "Think through ideas and clarify requirements" };
	const propose: LauncherAction = { kind: "propose", label: "OpenSpec Propose", description: "Create a proposal, design, specs, and tasks" };
	const apply = groupedAction("applyGroup", getApplyCandidates(changes));
	const archive = groupedAction("archiveGroup", getArchiveCandidates(changes));
	const exit: LauncherAction = { kind: "exit", label: "Exit", description: "Close the launcher" };

	switch (stage) {
		case "afterExplore":
			return definedActions([propose, apply, archive, explore, exit]);
		case "afterPropose":
			return definedActions([apply, archive, propose, explore, exit]);
		case "afterApply":
			return definedActions([archive, apply, propose, explore, exit]);
		case "initial":
		default:
			return definedActions([explore, propose, apply, archive, exit]);
	}
}

function buildNonInitializedActions(): LauncherAction[] {
	return [
		{ kind: "init", label: "OpenSpec Init", description: "Initialize OpenSpec with pi support in this directory" },
		{ kind: "exit", label: "Exit", description: "Close the launcher" },
	];
}

function selectListTheme(theme: Theme) {
	return {
		selectedPrefix: (text: string) => theme.fg("accent", text),
		selectedText: (text: string) => theme.fg("accent", text),
		description: (text: string) => theme.fg("muted", text),
		scrollInfo: (text: string) => theme.fg("dim", text),
		noMatch: (text: string) => theme.fg("warning", text),
	};
}

async function selectLauncherAction(ctx: ExtensionContext, title: string, actions: LauncherAction[]): Promise<LauncherAction | undefined> {
	const itemByValue = new Map(actions.map((action, index) => [`${index}:${action.kind}:${action.change ?? ""}`, action]));
	const items: SelectItem[] = [...itemByValue.entries()].map(([value, action]) => ({
		value,
		label: action.label,
		description: action.description,
	}));

	const selected = await ctx.ui.custom<string | null>((tui, theme, _keybindings, done) => {
		const container = new Container();
		container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
		container.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));

		const selectList = new SelectList(items, Math.min(Math.max(items.length, 1), 12), selectListTheme(theme));
		selectList.onSelect = (item) => done(String(item.value));
		selectList.onCancel = () => done(null);
		container.addChild(selectList);
		container.addChild(new Text(theme.fg("dim", "↑↓/j/k navigate • enter select • esc cancel"), 1, 0));
		container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

		return {
			render: (width: number) => container.render(width),
			invalidate: () => container.invalidate(),
			handleInput: (data: string) => {
				if (data === "j") selectList.handleInput("\u001b[B");
				else if (data === "k") selectList.handleInput("\u001b[A");
				else selectList.handleInput(data);
				tui.requestRender();
			},
		};
	});

	return selected ? itemByValue.get(selected) : undefined;
}

function isPrintable(data: string): boolean {
	return data.length === 1 && data.charCodeAt(0) >= 32 && data.charCodeAt(0) !== 127;
}

async function selectCandidateAction(ctx: ExtensionContext, kind: "applyCandidate" | "archiveCandidate", candidates: OpenSpecChangeSummary[]): Promise<LauncherAction | undefined> {
	const itemByValue = new Map(candidates.map((change) => [change.name, candidateAction(kind, change)]));
	const items: SelectItem[] = candidates.map((change) => ({
		value: change.name,
		label: change.name,
		description: candidateDescription(change),
	}));
	const title = `OpenSpec ${kind === "applyCandidate" ? "Apply" : "Archive"} Candidates`;

	const selected = await ctx.ui.custom<string | null>((tui, theme, _keybindings, done) => {
		let filter = "";
		const filterText = new Text("", 1, 0);
		const container = new Container();
		container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
		container.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
		container.addChild(filterText);

		const selectList = new SelectList(items, Math.min(Math.max(items.length, 1), 12), selectListTheme(theme));
		const updateFilter = () => {
			selectList.setFilter(filter);
			filterText.setText(theme.fg("dim", `Search: ${filter || "(type to filter)"}`));
		};
		updateFilter();
		selectList.onSelect = (item) => done(String(item.value));
		selectList.onCancel = () => done(null);
		container.addChild(selectList);
		container.addChild(new Text(theme.fg("dim", "type to filter • backspace edit • ↑↓/j/k navigate • enter select • esc cancel"), 1, 0));
		container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

		return {
			render: (width: number) => container.render(width),
			invalidate: () => container.invalidate(),
			handleInput: (data: string) => {
				if (data === "j") selectList.handleInput("\u001b[B");
				else if (data === "k") selectList.handleInput("\u001b[A");
				else if (data === "\u007f" || data === "\b") {
					filter = filter.slice(0, -1);
					updateFilter();
				} else if (isPrintable(data)) {
					filter += data;
					updateFilter();
				} else selectList.handleInput(data);
				tui.requestRender();
			},
		};
	});

	return selected ? itemByValue.get(selected) : undefined;
}

function promptForWorkflowAction(action: LauncherAction): string | undefined {
	switch (action.kind) {
		case "explore":
			return "/opsx-explore ";
		case "propose":
			return "/opsx-propose ";
		case "applyCandidate":
			return action.change ? `/opsx-apply ${action.change} ` : undefined;
		case "archiveCandidate":
			return action.change ? `/opsx-archive ${action.change} ` : undefined;
		default:
			return undefined;
	}
}

async function prefillWorkflowPrompt(ctx: ExtensionContext, action: LauncherAction): Promise<void> {
	const prompt = promptForWorkflowAction(action);
	if (!prompt) return;
	ctx.ui.setEditorText(prompt);
	ctx.ui.notify("OpenSpec prompt filled. Add details if needed, then press enter to run.", "info");
}

async function updateStageFromSubmittedPrompt(ctx: ExtensionContext, text: string): Promise<void> {
	const root = await findOpenSpecRoot(ctx.cwd);
	if (!root) return;

	const trimmed = text.trim();
	if (/^\/opsx-explore(?:\s|$)/.test(trimmed)) {
		await setRepositoryStage(root, "afterExplore");
		return;
	}
	if (/^\/opsx-propose(?:\s|$)/.test(trimmed)) {
		await setRepositoryStage(root, "afterPropose");
		return;
	}

	const applyMatch = trimmed.match(/^\/opsx-apply\s+(\S+)/);
	if (applyMatch) {
		await setRepositoryStage(root, "afterApply", applyMatch[1]);
		return;
	}

	const archiveMatch = trimmed.match(/^\/opsx-archive\s+(\S+)/);
	if (archiveMatch) {
		await setRepositoryStage(root, "initial", archiveMatch[1]);
	}
}

async function dispatchAction(pi: ExtensionAPI, ctx: ExtensionContext, _root: string | undefined, action: LauncherAction): Promise<void> {
	switch (action.kind) {
		case "explore":
		case "propose":
		case "applyCandidate":
		case "archiveCandidate":
			await prefillWorkflowPrompt(ctx, action);
			return;
		case "applyGroup":
		case "archiveGroup": {
			const candidates = action.candidates ?? [];
			if (candidates.length === 0) return;
			const candidate = await selectCandidateAction(ctx, action.kind === "applyGroup" ? "applyCandidate" : "archiveCandidate", candidates);
			if (candidate) await prefillWorkflowPrompt(ctx, candidate);
			return;
		}
		case "init": {
			const result = await pi.exec("openspec", ["init", "--tools", "pi"], { cwd: ctx.cwd, timeout: 120_000 });
			if (result.code === 0) ctx.ui.notify("OpenSpec initialized for pi", "info");
			else ctx.ui.notify((result.stderr || result.stdout || "OpenSpec init failed").trim(), "error");
			return;
		}
		case "exit":
		default:
			return;
	}
}

async function openLauncher(pi: ExtensionAPI, ctx: ExtensionContext, options: { startup?: boolean } = {}): Promise<void> {
	if (!ctx.hasUI) return;

	const root = await findOpenSpecRoot(ctx.cwd);
	if (!root) {
		if (options.startup) return;
		const action = await selectLauncherAction(ctx, "OpenSpec", buildNonInitializedActions());
		if (action) await dispatchAction(pi, ctx, undefined, action);
		return;
	}

	let changes: OpenSpecChangeSummary[] = [];
	try {
		changes = await discoverOpenSpecChanges(pi, root);
	} catch (error) {
		ctx.ui.notify(`Could not read OpenSpec changes: ${(error as Error).message}`, "warning");
	}

	const stage = await getRepositoryStage(root);
	const action = await selectLauncherAction(ctx, `OpenSpec (${stage})`, buildInitializedActions(stage, changes));
	if (action) await dispatchAction(pi, ctx, root, action);
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("openspec", {
		description: "Open the interactive OpenSpec launcher",
		handler: async (_args, ctx) => {
			await openLauncher(pi, ctx);
		},
	});

	pi.on("input", async (event, ctx) => {
		await updateStageFromSubmittedPrompt(ctx, event.text);
		return { action: "continue" };
	});

	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		await openLauncher(pi, ctx, { startup: true });
	});
}
