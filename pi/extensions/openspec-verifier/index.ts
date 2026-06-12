import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager } from "@earendil-works/pi-coding-agent";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

const STATE_PATH = join(homedir(), ".pi", "agent", "openspec-verifier-state.json");
const MAX_VERIFIER_ROUNDS = 3;

const DEFAULT_CODE_REVIEW_PROMPT = `## Default code review baseline

Review the current changed files as a senior code reviewer. Fail the verification only for concrete, actionable defects that are introduced by or materially affect this change.

Check at least:
- Correctness: implementation matches intended behavior, handles edge cases, and avoids regressions.
- Maintainability: changes fit existing architecture, naming, layering, and project conventions.
- Security and privacy: no secrets, unsafe logging, injection risks, authorization bypasses, or tenant/data leaks.
- API and compatibility: no unintended breaking changes; public contracts, schemas, migrations, and generated artifacts stay consistent.
- Tests and verification: relevant tests or equivalent validation exist; missing tests are a finding when the behavior is risky or externally visible.
- Operational safety: errors, retries, timeouts, large payloads, observability, and resource usage are reasonable for the touched code.

Prefer evidence from files, diffs, or command output. Do not fail for stylistic preferences unless they violate an established project convention or create a real risk.`;

const DEFAULT_OPENSPEC_VERIFICATION_PROMPT = `## Default OpenSpec verification baseline

Verify the implementation against the selected OpenSpec change, not against unrelated desired improvements.

Check at least:
- Accepted artifacts: proposal, design, spec deltas, and task list are internally consistent and describe the implemented behavior.
- Scope control: implementation satisfies the accepted change without adding unrelated behavior or broad refactors.
- Task completion: completed tasks are actually implemented; incomplete or unverifiable required tasks fail verification.
- Spec compliance: user-visible behavior, APIs, data models, errors, and edge cases match the OpenSpec requirements.
- Validation: safe project checks were run when useful, or skipped only with a clear reason; failing checks fail verification.
- Documentation/contracts: specs, generated contracts, and docs are updated when the change requires them.

If repository-specific verifier policies are present, apply them as additional stricter requirements on top of this default baseline.`;

const DEFAULT_VERIFIER_POLICY_TEXT = [
	"# Default verifier policy",
	"",
	DEFAULT_CODE_REVIEW_PROMPT,
	"",
	DEFAULT_OPENSPEC_VERIFICATION_PROMPT,
].join("\n");

const VERIFIER_SYSTEM_PROMPT = `You are the independent OpenSpec verifier agent.

You are a read-only verifier. Inspect files, search, and run safe verification commands when useful, but do not intentionally modify repository files. Do not use write/edit tools even if available.

Assess only the selected OpenSpec change, the default verifier baseline, and any repository verifier policies injected in the prompt. If findings are outside that scope, mention them only as context and do not fail the change for them.

Your final response MUST include exactly one machine-detectable verdict line:
VERDICT: PASS
or
VERDICT: FAIL

When you have file-specific findings, also include a machine-readable Hunk comments block so the verifier output can be shown directly in the user's live Hunk UI:
HUNK_COMMENTS_JSON:
\`\`\`json
{"comments":[{"filePath":"path/from/repo/root","hunk":1,"summary":"Concise finding","rationale":"Evidence and requested fix"}]}
\`\`\`
Use exactly one target per comment: hunk, hunkNumber, oldLine, or newLine. Keep summaries short. Do not invent paths or line numbers; omit the block if no file-specific comment can be anchored.

Use VERDICT: PASS only when the implementation satisfies the OpenSpec change, the default verifier baseline, and all injected repository policies for the current context. Use VERDICT: FAIL when there are concrete findings to fix, required context cannot be verified, or safe checks fail. Include concise findings and evidence before the verdict.`;

type ExecResult = { code: number; stdout: string; stderr: string };
type ExecRunner = (command: string, args: string[], options: { cwd: string; timeout: number }) => Promise<ExecResult>;

type VerdictKind = "pass" | "fail" | "inconclusive";

interface HunkVerifierComment {
	filePath: string;
	summary: string;
	rationale?: string;
	hunk?: number;
	hunkNumber?: number;
	oldLine?: number;
	newLine?: number;
	author?: string;
}

interface VerificationVerdict {
	verdict: VerdictKind;
	raw: string;
	hunkComments: HunkVerifierComment[];
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

type VerifierModel = NonNullable<ExtensionContext["model"]>;

interface PendingVerification {
	root: string;
	change: string;
	round: number;
	verifierModel?: VerifierModel;
}

interface ParsedVerifyArgs {
	change?: string;
	modelRef?: string;
	selectModel: boolean;
}

interface HunkPublishResult {
	commentsCreated: number;
	commentsPublished: number;
	hunkSessionAvailable: boolean;
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

	const repositoryPolicyText = files.map((file) => [`## Policy file: ${file.relativePath}`, "", file.content.trimEnd()].join("\n")).join("\n\n---\n\n");
	const text = repositoryPolicyText ? [DEFAULT_VERIFIER_POLICY_TEXT, "", "# Repository verifier policy extensions", "", repositoryPolicyText].join("\n") : DEFAULT_VERIFIER_POLICY_TEXT;
	return { files, text, hash: hashText(text) };
}

async function hasVerifierPolicies(root: string): Promise<boolean> {
	return (await loadVerifierPolicies(root)).files.length > 0;
}

async function buildVerificationContextPacket(change: string, root: string, runner: ExecRunner): Promise<VerificationContextPacket> {
	const policyBundle = await loadVerifierPolicies(root);

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
		"# Verifier policy baseline and extensions",
		packet.policyBundle.text,
		packet.policyBundle.files.length > 0 ? "" : "\nNo repository-specific verifier policy files were found under `.pi/verifier/*.md`; using only the default baseline above.",
		"",
		"# Changed files",
		packet.changedFiles && packet.changedFiles.length > 0 ? packet.changedFiles.map((file) => `- ${file}`).join("\n") : "No changed-file list is available or no git diff files are currently reported.",
		"",
		"# Git diff context",
		packet.gitDiff ? `\`\`\`diff\n${packet.gitDiff}\n\`\`\`` : "No git diff is available.",
		"",
		"Remember: do not edit files. Finish with exactly one verdict line: VERDICT: PASS or VERDICT: FAIL. Include HUNK_COMMENTS_JSON when findings can be anchored to changed files/hunks.",
	].join("\n");
}

function normalizeHunkComment(value: unknown): HunkVerifierComment | undefined {
	if (!value || typeof value !== "object") return undefined;
	const record = value as Record<string, unknown>;
	if (typeof record.filePath !== "string" || typeof record.summary !== "string") return undefined;
	const comment: HunkVerifierComment = {
		filePath: record.filePath,
		summary: record.summary,
		author: typeof record.author === "string" ? record.author : "openspec-verifier",
	};
	if (typeof record.rationale === "string") comment.rationale = record.rationale;
	for (const key of ["hunk", "hunkNumber", "oldLine", "newLine"] as const) {
		if (Number.isInteger(record[key])) comment[key] = record[key] as number;
	}
	const targets = [comment.hunk, comment.hunkNumber, comment.oldLine, comment.newLine].filter((target) => typeof target === "number");
	return targets.length === 1 ? comment : undefined;
}

/** Extract the first complete JSON object or array from raw text (stops at balanced close). */
function extractFirstJson(text: string): string {
	const trimmed = text.trim();
	const open = trimmed[0];
	if (open !== "{" && open !== "[") return trimmed;
	const close = open === "{" ? "}" : "]";
	let depth = 0;
	let inString = false;
	let escape = false;
	for (let i = 0; i < trimmed.length; i++) {
		const ch = trimmed[i];
		if (escape) { escape = false; continue; }
		if (ch === "\\" && inString) { escape = true; continue; }
		if (ch === '"') { inString = !inString; continue; }
		if (inString) continue;
		if (ch === open) depth++;
		else if (ch === close) { depth--; if (depth === 0) return trimmed.slice(0, i + 1); }
	}
	return trimmed;
}

function parseHunkComments(output: string): HunkVerifierComment[] {
	// Find the HUNK_COMMENTS_JSON: marker, then extract the JSON that follows.
	// The previous lazy regex with `$` (no `m` flag) matched an empty string
	// immediately after the marker, causing all comment blocks to be silently dropped.
	const markerIndex = output.search(/HUNK_COMMENTS_JSON:/i);
	if (markerIndex === -1) return [];
	const afterMarker = output.slice(markerIndex).replace(/^HUNK_COMMENTS_JSON:\s*/i, "");
	// Prefer a fenced ```json ... ``` block; fall back to extracting the first JSON value.
	const fencedMatch = /^```(?:json)?\s*([\s\S]*?)```/i.exec(afterMarker);
	const jsonText = fencedMatch ? fencedMatch[1].trim() : extractFirstJson(afterMarker.trim());
	if (!jsonText) return [];
	try {
		const parsed = JSON.parse(jsonText) as unknown;
		const comments = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" && Array.isArray((parsed as { comments?: unknown }).comments) ? (parsed as { comments: unknown[] }).comments : []);
		return comments.map(normalizeHunkComment).filter((comment): comment is HunkVerifierComment => Boolean(comment));
	} catch {
		return [];
	}
}

function parseVerifierVerdict(output: string): VerificationVerdict {
	const pass = /^VERDICT:\s*PASS\s*$/im.test(output);
	const fail = /^VERDICT:\s*FAIL\s*$/im.test(output);
	const hunkComments = parseHunkComments(output);
	if (pass && !fail) return { verdict: "pass", raw: output, hunkComments };
	if (fail && !pass) return { verdict: "fail", raw: output, hunkComments };
	return { verdict: "inconclusive", raw: output, hunkComments };
}

function formatVerifierModel(model: VerifierModel | undefined): string {
	return model ? `${model.provider}/${model.id}` : "pi default model";
}

async function runVerifierAgent(packet: VerificationContextPacket, ctx: ExtensionContext, verifierModel: VerifierModel | undefined): Promise<VerificationVerdict> {
	const agentDir = getAgentDir();
	const loader = new DefaultResourceLoader({ cwd: packet.root, agentDir, systemPromptOverride: () => VERIFIER_SYSTEM_PROMPT });
	await loader.reload();
	const { session } = await createAgentSession({
		cwd: packet.root,
		agentDir,
		model: verifierModel,
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

function verifierFailureReport(change: string, report: string, round: number): string {
	return [
		`The OpenSpec verifier failed for change \`${change}\` on round ${round}.`,
		"",
		"Automatic fix application was not started. Review the findings below and rerun verification or ask pi to fix them when ready.",
		"",
		"Verifier report:",
		report,
	].join("\n");
}

async function confirmVerifierFixApplication(ctx: ExtensionContext, change: string, round: number): Promise<boolean> {
	if (!ctx.hasUI) return false;
	return await ctx.ui.confirm(
		"Apply OpenSpec verifier fixes?",
		`The verifier found findings for ${change} in review round ${round}. Should pi start an automatic fix turn for these verifier findings?`,
	);
}

function truncateText(text: string, maxLength: number): string {
	return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function hunkCommentsForResult(packet: VerificationContextPacket, result: VerificationVerdict): HunkVerifierComment[] {
	const changedFileSet = new Set(packet.changedFiles ?? []);
	const anchoredComments = result.hunkComments.filter((comment) => changedFileSet.size === 0 || changedFileSet.has(comment.filePath));
	if (anchoredComments.length > 0) return anchoredComments;
	const firstChangedFile = packet.changedFiles?.[0];
	if (!firstChangedFile) return [];
	return [{
		filePath: firstChangedFile,
		hunk: 1,
		author: "openspec-verifier",
		summary: result.verdict === "pass" ? `OpenSpec verifier passed for ${packet.change}` : `OpenSpec verifier ${result.verdict === "inconclusive" ? "was inconclusive" : "failed"} for ${packet.change}`,
		rationale: truncateText(result.raw, 4_000),
	}];
}

async function publishVerifierOutputToHunk(pi: ExtensionAPI, ctx: ExtensionContext, packet: VerificationContextPacket, result: VerificationVerdict): Promise<HunkPublishResult> {
	const comments = hunkCommentsForResult(packet, result);
	if (comments.length === 0) return { commentsCreated: 0, commentsPublished: 0, hunkSessionAvailable: false };

	const session = await runOptional((command, args, options) => pi.exec(command, args, options), packet.root, "hunk", ["session", "get", "--repo", packet.root, "--json"], 5_000);
	if (!session) {
		ctx.ui.notify(`OpenSpec verifier created ${comments.length} Hunk comment${comments.length === 1 ? "" : "s"}, but no Hunk session is active. Start \`hunk diff\` in another terminal to view/apply them.`, "info");
		return { commentsCreated: comments.length, commentsPublished: 0, hunkSessionAvailable: false };
	}

	await runOptional((command, args, options) => pi.exec(command, args, options), packet.root, "hunk", ["session", "reload", "--repo", packet.root, "--", "diff"], 10_000);
	const payloadDir = join(packet.root, ".pi", "verifier");
	await mkdir(payloadDir, { recursive: true });
	const payloadPath = join(payloadDir, `.hunk-comments-${process.pid}-${Date.now()}.json`);
	await writeFile(payloadPath, `${JSON.stringify({ comments }, null, 2)}\n`, "utf8");
	try {
		const apply = await pi.exec("bash", ["-lc", `hunk session comment apply --repo ${shellQuote(packet.root)} --stdin --focus < ${shellQuote(payloadPath)}`], { cwd: packet.root, timeout: 10_000 });
		if (apply.code === 0) {
			ctx.ui.notify(`Hunk comments created: ${comments.length}; published to active Hunk session: ${comments.length}.`, "info");
			return { commentsCreated: comments.length, commentsPublished: comments.length, hunkSessionAvailable: true };
		}
		ctx.ui.notify(`Hunk comments created: ${comments.length}; published: 0. Could not publish verifier output to Hunk: ${(apply.stderr || apply.stdout).trim()}`, "warning");
		return { commentsCreated: comments.length, commentsPublished: 0, hunkSessionAvailable: true };
	} finally {
		await unlink(payloadPath).catch(() => undefined);
	}
}

function parseVerifyArgs(args: string): ParsedVerifyArgs {
	const tokens = args.trim().split(/\s+/).filter(Boolean);
	const parsed: ParsedVerifyArgs = { selectModel: false };
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (token === "--select-model") {
			parsed.selectModel = true;
			continue;
		}
		if (token === "--model") {
			const next = tokens[index + 1];
			if (next && !next.startsWith("--")) {
				parsed.modelRef = next;
				index += 1;
			} else {
				parsed.selectModel = true;
			}
			continue;
		}
		if (token.startsWith("--model=")) {
			parsed.modelRef = token.slice("--model=".length);
			continue;
		}
		if (!parsed.change) parsed.change = token;
	}
	return parsed;
}

function resolveVerifierModel(ctx: ExtensionContext, modelRef: string): VerifierModel | undefined {
	const [provider, ...modelParts] = modelRef.split("/");
	const modelId = modelParts.join("/");
	if (!provider || !modelId) return undefined;
	return ctx.modelRegistry.find(provider, modelId) as VerifierModel | undefined;
}

async function selectVerifierModel(ctx: ExtensionContext): Promise<VerifierModel | undefined> {
	const currentModel = ctx.model as VerifierModel | undefined;
	if (!ctx.hasUI) return currentModel;
	const models = ctx.modelRegistry.getAvailable() as VerifierModel[];
	if (models.length === 0) {
		ctx.ui.notify("No authenticated verification models are available for selection. Falling back to the current model.", "warning");
		return currentModel;
	}
	const labels = models.map(formatVerifierModel).sort((a, b) => a.localeCompare(b));
	const selected = await ctx.ui.select("Select verification model", labels);
	if (!selected) {
		ctx.ui.notify(`No verification model selected. Falling back to ${formatVerifierModel(currentModel)}.`, "info");
		return currentModel;
	}
	return resolveVerifierModel(ctx, selected) ?? currentModel;
}

async function chooseVerifierModel(ctx: ExtensionContext, parsed: ParsedVerifyArgs): Promise<VerifierModel | undefined> {
	const currentModel = ctx.model as VerifierModel | undefined;
	if (parsed.modelRef) {
		const model = resolveVerifierModel(ctx, parsed.modelRef);
		if (!model) ctx.ui.notify(`Verification model not found: ${parsed.modelRef}. Falling back to ${formatVerifierModel(currentModel)}.`, "warning");
		return model ?? currentModel;
	}
	return await selectVerifierModel(ctx);
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

async function runVerifierWorkflow(pi: ExtensionAPI, ctx: ExtensionContext, root: string, change: string, round = 1, verifierModel?: VerifierModel): Promise<VerificationVerdict | undefined> {
	const runner: ExecRunner = (command, args, options) => pi.exec(command, args, options);
	let packet: VerificationContextPacket;
	try {
		packet = await buildVerificationContextPacket(change, root, runner);
	} catch (error) {
		ctx.ui.notify(`OpenSpec verification could not start: ${(error as Error).message}`, "error");
		return { verdict: "fail", raw: (error as Error).message, hunkComments: [] };
	}

	ctx.ui.notify(`Running OpenSpec verifier for ${change} (round ${round}/${MAX_VERIFIER_ROUNDS}); model: ${formatVerifierModel(verifierModel)}; policies: ${packet.policyBundle.files.length}; changed files: ${packet.changedFiles?.length ?? 0}.`, "info");
	const result = await runVerifierAgent(packet, ctx, verifierModel);
	const hunkResult = await publishVerifierOutputToHunk(pi, ctx, packet, result);
	ctx.ui.notify(`OpenSpec verifier verdict: ${result.verdict.toUpperCase()}; Hunk comments created: ${hunkResult.commentsCreated}; published: ${hunkResult.commentsPublished}.`, result.verdict === "pass" ? "info" : "warning");
	if (result.verdict === "pass") {
		await recordVerifierPass(packet);
		pendingVerifications.delete(stateKey(root, change));
		ctx.ui.notify(`OpenSpec verification passed for ${change}.`, "info");
		return result;
	}

	const label = result.verdict === "inconclusive" ? "inconclusive" : "failed";
	ctx.ui.notify(`OpenSpec verification ${label} for ${change}.`, "warning");
	if (round < MAX_VERIFIER_ROUNDS) {
		// Show the full verifier report BEFORE asking whether to apply fixes so the user
		// has context when the confirm dialog appears.
		pi.sendMessage(
			{ customType: "openspec-verifier", content: verifierFailureReport(change, result.raw, round), display: true },
			{ deliverAs: "followUp", triggerTurn: false },
		);
		const shouldApplyFixes = round === 1 ? await confirmVerifierFixApplication(ctx, change, round) : true;
		if (shouldApplyFixes) {
			pendingVerifications.set(stateKey(root, change), { root, change, round: round + 1, verifierModel });
			pi.sendUserMessage(verifierFailureFollowUp(change, result.raw, round), { deliverAs: "followUp" });
		} else {
			pendingVerifications.delete(stateKey(root, change));
			ctx.ui.notify(`OpenSpec verifier fixes were not started for ${change}.`, "info");
		}
	} else {
		pendingVerifications.delete(stateKey(root, change));
		pi.sendMessage({ customType: "openspec-verifier", content: `Verifier reached maximum rounds for ${change}.\n\n${result.raw}`, display: true }, { deliverAs: "followUp", triggerTurn: false });
	}
	return result;
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("opsx-verify", {
		description: "Run the OpenSpec verifier for a change. Usage: /opsx-verify [change] [--model provider/model-id|--model|--select-model]",
		handler: async (args, ctx) => {
			const root = await findOpenSpecRoot(ctx.cwd);
			if (!root) {
				ctx.ui.notify("No OpenSpec project was found. Run /opsx-verify from inside an initialized OpenSpec project.", "error");
				return;
			}
			const parsed = parseVerifyArgs(args);
			const change = parsed.change ?? await chooseActiveChange(pi, ctx, root);
			if (!change) return;
			const verifierModel = await chooseVerifierModel(ctx, parsed);
			ctx.ui.notify(`OpenSpec verifier will use model: ${formatVerifierModel(verifierModel)}.`, "info");
			await runVerifierWorkflow(pi, ctx, root, change, 1, verifierModel);
		},
	});

	pi.on("agent_end", async (_event, ctx) => {
		for (const pending of [...pendingVerifications.values()]) {
			await runVerifierWorkflow(pi, ctx, pending.root, pending.change, pending.round, pending.verifierModel);
		}
	});
}

export const __openspecVerifierTest = {
	DEFAULT_CODE_REVIEW_PROMPT,
	DEFAULT_OPENSPEC_VERIFICATION_PROMPT,
	VERIFIER_SYSTEM_PROMPT,
	buildVerificationContextPacket,
	contextPacketPrompt,
	findOpenSpecRoot,
	formatVerifierModel,
	hasVerifierPolicies,
	isVerifierPassFresh,
	loadVerifierPolicies,
	parseVerifierVerdict,
	parseVerifyArgs,
	recordVerifierPass,
};
