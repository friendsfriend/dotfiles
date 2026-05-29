import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { createAgentSession, DefaultResourceLoader, SessionManager } from "@earendil-works/pi-coding-agent";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

const STATE_PATH = join(homedir(), ".pi", "agent", "openspec-verifier-state.json");
const MAX_VERIFIER_ROUNDS = 3;

const VERIFIER_SYSTEM_PROMPT = `You are the independent OpenSpec verifier agent.

You are a read-only verifier. Inspect files, search, and run safe verification commands when useful, but do not intentionally modify repository files. Do not use write/edit tools even if available.

Assess only the selected OpenSpec change and the project verifier policies injected in the prompt. If findings are outside that scope, mention them only as context and do not fail the change for them.

Your final response MUST include exactly one machine-detectable verdict line:
VERDICT: PASS
or
VERDICT: FAIL

Use VERDICT: PASS only when the implementation satisfies the OpenSpec change and all injected repository policies for the current context. Use VERDICT: FAIL when there are concrete findings to fix, required context cannot be verified, or safe checks fail. Include concise findings and evidence before the verdict.`;

type ExecResult = { code: number; stdout: string; stderr: string };
type ExecRunner = (command: string, args: string[], options: { cwd: string; timeout: number }) => Promise<ExecResult>;

type VerdictKind = "pass" | "fail" | "inconclusive";

interface VerificationVerdict {
	verdict: VerdictKind;
	raw: string;
}

interface VerifierPolicyFile {
	name: string;
	relativePath: string;
	content: string;
}

interface PolicyBundle {
	files: VerifierPolicyFile[];
	text: string;
	hash: string;
}

interface VerificationContextPacket {
	change: string;
	root: string;
	status: unknown;
	applyInstructions: unknown;
	policyBundle: PolicyBundle;
	gitDiff?: string;
	gitDiffHash?: string;
	changedFiles?: string[];
}

interface VerifierPassState {
	root: string;
	change: string;
	policyHash: string;
	gitDiffHash?: string;
	durable: boolean;
	updatedAt: string;
}

type VerifierStateFile = Record<string, VerifierPassState>;

interface PendingVerification {
	root: string;
	change: string;
	round: number;
}

const sessionPassState = new Map<string, VerifierPassState>();
const pendingVerifications = new Map<string, PendingVerification>();

function nowIso(): string {
	return new Date().toISOString();
}

function hashText(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

function stateKey(root: string, change: string): string {
	return `${root}\u0000${change}`;
}

function toPosix(path: string): string {
	return path.split("/").join("/");
}

function projectRelative(root: string, path: string): string {
	return toPosix(relative(root, path));
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

async function runJson<T>(runner: ExecRunner, root: string, args: string[]): Promise<T> {
	const result = await runner("openspec", args, { cwd: root, timeout: 10_000 });
	if (result.code !== 0) throw new Error((result.stderr || result.stdout || `openspec ${args.join(" ")} failed`).trim());
	return JSON.parse(result.stdout || "{}") as T;
}

async function runOptional(runner: ExecRunner, root: string, command: string, args: string[], timeout = 10_000): Promise<ExecResult | undefined> {
	try {
		const result = await runner(command, args, { cwd: root, timeout });
		return result.code === 0 ? result : undefined;
	} catch {
		return undefined;
	}
}

async function loadVerifierPolicies(root: string): Promise<PolicyBundle> {
	const policyDir = join(root, ".pi", "verifier");
	let entries: string[] = [];
	try {
		entries = (await readdir(policyDir, { withFileTypes: true }))
			.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
			.map((entry) => entry.name)
			.sort((a, b) => a.localeCompare(b));
	} catch {
		entries = [];
	}

	const files: VerifierPolicyFile[] = [];
	for (const name of entries) {
		const path = join(policyDir, name);
		try {
			const info = await stat(path);
			if (!info.isFile()) continue;
			files.push({ name, relativePath: projectRelative(root, path), content: await readFile(path, "utf8") });
		} catch {
			// Ignore files that disappear during discovery.
		}
	}

	const text = files.map((file) => [`## Policy file: ${file.relativePath}`, "", file.content.trimEnd()].join("\n")).join("\n\n---\n\n");
	return { files, text, hash: hashText(text) };
}

async function hasVerifierPolicies(root: string): Promise<boolean> {
	return (await loadVerifierPolicies(root)).files.length > 0;
}

async function buildVerificationContextPacket(change: string, root: string, runner: ExecRunner): Promise<VerificationContextPacket> {
	const policyBundle = await loadVerifierPolicies(root);
	if (policyBundle.files.length === 0) throw new Error("No repository verifier policies are configured under .pi/verifier/*.md");

	const status = await runJson<unknown>(runner, root, ["status", "--change", change, "--json"]);
	let applyInstructions: unknown;
	try {
		applyInstructions = await runJson<unknown>(runner, root, ["instructions", "apply", "--change", change, "--json"]);
	} catch (error) {
		applyInstructions = { error: (error as Error).message };
	}

	const diffResult = await runOptional(runner, root, "git", ["diff", "--no-ext-diff", "--binary"], 20_000);
	const namesResult = await runOptional(runner, root, "git", ["diff", "--name-only"], 10_000);
	const gitDiff = diffResult?.stdout;
	const changedFiles = namesResult?.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

	return {
		change,
		root,
		status,
		applyInstructions,
		policyBundle,
		gitDiff,
		gitDiffHash: gitDiff !== undefined ? hashText(gitDiff) : undefined,
		changedFiles,
	};
}

function contextPacketPrompt(packet: VerificationContextPacket): string {
	return [
		`Verify OpenSpec change: ${packet.change}`,
		"",
		"# Current OpenSpec status",
		"```json",
		JSON.stringify(packet.status, null, 2),
		"```",
		"",
		"# Current OpenSpec apply/task context",
		"```json",
		JSON.stringify(packet.applyInstructions, null, 2),
		"```",
		"",
		"# Repository verifier policies",
		packet.policyBundle.text,
		"",
		"# Changed files",
		packet.changedFiles && packet.changedFiles.length > 0 ? packet.changedFiles.map((file) => `- ${file}`).join("\n") : "No changed-file list is available or no git diff files are currently reported.",
		"",
		"# Git diff context",
		packet.gitDiff ? `\`\`\`diff\n${packet.gitDiff}\n\`\`\`` : "No git diff is available.",
		"",
		"Remember: do not edit files. Finish with exactly one verdict line: VERDICT: PASS or VERDICT: FAIL.",
	].join("\n");
}

function parseVerifierVerdict(output: string): VerificationVerdict {
	const pass = /^VERDICT:\s*PASS\s*$/im.test(output);
	const fail = /^VERDICT:\s*FAIL\s*$/im.test(output);
	if (pass && !fail) return { verdict: "pass", raw: output };
	if (fail && !pass) return { verdict: "fail", raw: output };
	return { verdict: "inconclusive", raw: output };
}

async function runVerifierAgent(packet: VerificationContextPacket, ctx: ExtensionContext): Promise<VerificationVerdict> {
	const loader = new DefaultResourceLoader({ cwd: packet.root, systemPromptOverride: () => VERIFIER_SYSTEM_PROMPT });
	await loader.reload();
	const { session } = await createAgentSession({
		cwd: packet.root,
		model: ctx.model,
		modelRegistry: ctx.modelRegistry,
		resourceLoader: loader,
		sessionManager: SessionManager.inMemory(packet.root),
		tools: ["read", "bash", "grep", "find", "ls"],
	});
	let assistantText = "";
	const unsubscribe = session.subscribe((event) => {
		if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") assistantText += event.assistantMessageEvent.delta;
	});
	try {
		await session.prompt(contextPacketPrompt(packet));
		return parseVerifierVerdict(assistantText || session.messages.filter((message) => message.role === "assistant").map((message) => JSON.stringify(message.content)).join("\n"));
	} finally {
		unsubscribe();
		session.dispose();
	}
}

async function recordVerifierPass(packet: VerificationContextPacket): Promise<VerifierPassState> {
	const state: VerifierPassState = {
		root: packet.root,
		change: packet.change,
		policyHash: packet.policyBundle.hash,
		gitDiffHash: packet.gitDiffHash,
		durable: Boolean(packet.gitDiffHash),
		updatedAt: nowIso(),
	};
	sessionPassState.set(stateKey(packet.root, packet.change), state);
	if (state.durable) {
		const stored = await readJsonFile<VerifierStateFile>(STATE_PATH, {});
		stored[stateKey(packet.root, packet.change)] = state;
		await writeJsonFile(STATE_PATH, stored);
	}
	return state;
}

async function readVerifierPassState(root: string, change: string): Promise<VerifierPassState | undefined> {
	const key = stateKey(root, change);
	const sessionState = sessionPassState.get(key);
	if (sessionState) return sessionState;
	const stored = await readJsonFile<VerifierStateFile>(STATE_PATH, {});
	return stored[key];
}

async function isVerifierPassFresh(root: string, change: string, runner: ExecRunner): Promise<boolean> {
	const existing = await readVerifierPassState(root, change);
	if (!existing) return false;
	const packet = await buildVerificationContextPacket(change, root, runner);
	if (existing.policyHash !== packet.policyBundle.hash) return false;
	if (!existing.durable) return sessionPassState.has(stateKey(root, change));
	return Boolean(packet.gitDiffHash) && existing.gitDiffHash === packet.gitDiffHash;
}

function verifierFailureFollowUp(change: string, report: string, round: number): string {
	return [
		`The OpenSpec verifier failed for change \`${change}\` on round ${round}.`,
		"",
		"Fix only the verifier findings that are within this OpenSpec change scope. Do not broaden the implementation beyond the accepted artifacts. After your fix turn, the verifier will be rerun automatically if rounds remain.",
		"",
		"Verifier report:",
		report,
	].join("\n");
}

async function chooseActiveChange(pi: ExtensionAPI, ctx: ExtensionContext, root: string): Promise<string | undefined> {
	const list = await runJson<{ changes?: Array<{ name?: unknown; status?: unknown }> }>((command, args, options) => pi.exec(command, args, options), root, ["list", "--json"]);
	const changes = (Array.isArray(list.changes) ? list.changes : []).filter((change) => typeof change.name === "string").map((change) => ({ name: change.name as string, status: typeof change.status === "string" ? change.status : undefined }));
	if (changes.length === 0) {
		ctx.ui.notify("No active OpenSpec changes found.", "warning");
		return undefined;
	}
	if (!ctx.hasUI) {
		ctx.ui.notify("Usage: /opsx-verify <change>", "warning");
		return undefined;
	}
	return await ctx.ui.select("Select OpenSpec change to verify", changes.map((change) => (change.status ? `${change.name} (${change.status})` : change.name))).then((value) => value?.replace(/\s+\(.+\)$/, ""));
}

async function runVerifierWorkflow(pi: ExtensionAPI, ctx: ExtensionContext, root: string, change: string, round = 1): Promise<VerificationVerdict | undefined> {
	const runner: ExecRunner = (command, args, options) => pi.exec(command, args, options);
	let packet: VerificationContextPacket;
	try {
		packet = await buildVerificationContextPacket(change, root, runner);
	} catch (error) {
		ctx.ui.notify(`OpenSpec verification could not start: ${(error as Error).message}`, "error");
		return { verdict: "fail", raw: (error as Error).message };
	}

	ctx.ui.notify(`Running OpenSpec verifier for ${change} (round ${round}/${MAX_VERIFIER_ROUNDS})`, "info");
	const result = await runVerifierAgent(packet, ctx);
	if (result.verdict === "pass") {
		await recordVerifierPass(packet);
		pendingVerifications.delete(stateKey(root, change));
		ctx.ui.notify(`OpenSpec verification passed for ${change}.`, "info");
		return result;
	}

	const label = result.verdict === "inconclusive" ? "inconclusive" : "failed";
	ctx.ui.notify(`OpenSpec verification ${label} for ${change}.`, "warning");
	if (round < MAX_VERIFIER_ROUNDS) {
		pendingVerifications.set(stateKey(root, change), { root, change, round: round + 1 });
		pi.sendUserMessage(verifierFailureFollowUp(change, result.raw, round), { deliverAs: "followUp" });
	} else {
		pendingVerifications.delete(stateKey(root, change));
		pi.sendMessage({ customType: "openspec-verifier", content: `Verifier reached maximum rounds for ${change}.\n\n${result.raw}`, display: true }, { deliverAs: "followUp", triggerTurn: false });
	}
	return result;
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("opsx-verify", {
		description: "Run the OpenSpec verifier for a change",
		handler: async (args, ctx) => {
			const root = await findOpenSpecRoot(ctx.cwd);
			if (!root) {
				ctx.ui.notify("No OpenSpec project was found. Run /opsx-verify from inside an initialized OpenSpec project.", "error");
				return;
			}
			const trimmed = args.trim();
			const change = trimmed.length > 0 ? trimmed.split(/\s+/)[0] : await chooseActiveChange(pi, ctx, root);
			if (!change) return;
			await runVerifierWorkflow(pi, ctx, root, change, 1);
		},
	});

	pi.on("agent_end", async (_event, ctx) => {
		for (const pending of [...pendingVerifications.values()]) {
			await runVerifierWorkflow(pi, ctx, pending.root, pending.change, pending.round);
		}
	});
}

export const __openspecVerifierTest = {
	VERIFIER_SYSTEM_PROMPT,
	buildVerificationContextPacket,
	contextPacketPrompt,
	findOpenSpecRoot,
	hasVerifierPolicies,
	isVerifierPassFresh,
	loadVerifierPolicies,
	parseVerifierVerdict,
	recordVerifierPass,
};
