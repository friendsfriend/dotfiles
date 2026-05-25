import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, copyFile, mkdir, readFile, readdir, realpath, rename, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const MEMORY_DIR = ".pi/memory";
const GLOBAL_MEMORY_ROOT = join(homedir(), ".pi", "agent", "memory");
const EXPORTS_DIR = "exports";
const ENTRIES_FILE = "entries.json";
const ENTRIES_BACKUP_FILE = "entries.json.bak";
const MEMORY_DB_FILE = "memory.sqlite";
const MEMORY_EXPORT_JSON_FILE = "memory.export.json";
const MEMORY_EXPORT_MARKDOWN_FILE = "memory.export.md";
const HEALTH_FILE = "health.json";
const STATS_FILE = "stats.jsonl";
const BENCHMARKS_DIR = "benchmarks";
const OPEN_SPEC_INDEX_FILE = "openspec-index.json";
const REPO_FILE = "repo.md";
const PREFERENCES_FILE = "preferences.md";
const DEFAULT_TOKEN_BUDGET = 900;
const MAX_ENTRY_TEXT = 1200;
const MAX_SESSION_MEMORY_TEXT = 500;
const INFERRED_TTL_DAYS = 30;
const MAX_STORED_ENTRIES = 300;

interface SourceRef {
	path?: string;
	mtimeMs?: number;
	sha256?: string;
	command?: string;
	commandHash?: string;
	resultHash?: string;
	dependencyHashes?: Record<string, string | undefined>;
}

type MemoryType = "preference" | "repo" | "openspec" | "session" | "tool";
type MemorySourceKind = "pinned" | "observed" | "inferred" | "rejected" | "forgotten";
type MemoryQuality = "high" | "medium" | "low" | "suspected-junk";
type MemoryLifecycle = "durable" | "temporary" | "expired";
type MemoryClassification = "preference" | "decision" | "blocker" | "assumption" | "next-step";
type MemoryScope = "global" | "repo" | "session";
type RepositoryDiscovery = "git" | "openspec" | "cwd" | "none";
type RecoveryState = "none" | "primary-valid" | "backup" | "subset" | "empty";

interface MemoryEntry {
	id: string;
	type: MemoryType;
	scope?: MemoryScope;
	repoKey?: string;
	originRepoKey?: string;
	migrationSource?: string;
	sourceKind: MemorySourceKind;
	text: string;
	createdAt: string;
	updatedAt: string;
	tags?: string[];
	source?: SourceRef;
	stale?: boolean;
	forgottenAt?: string;
	quality?: MemoryQuality;
	expiresAt?: string;
	dedupeKey?: string;
	hitCount?: number;
	lastUsedAt?: string;
	reasonRejected?: string;
	recoveryState?: RecoveryState;
	lifecycle?: MemoryLifecycle;
	classification?: MemoryClassification;
	duplicateOf?: string;
}

interface MemoryConfig {
	tokenBudget: number;
	maxEntriesPerCard: number;
}

interface RepositoryInfo {
	key: string;
	rootPath: string;
	displayName: string;
	discoveredBy: RepositoryDiscovery;
	lastSeenAt: string;
}

interface StorageHealth {
	exists: boolean;
	valid: boolean;
	recoveryState: RecoveryState;
	entryCount: number;
	backupExists: boolean;
	quarantineFiles: string[];
	dbPath?: string;
	schemaVersion?: number;
	journalMode?: string;
	migrationStatus?: string;
	message?: string;
}

interface DuplicateGroup {
	key: string;
	ids: string[];
	pinnedIds: string[];
}

interface MemoryHealthReport {
	generatedAt: string;
	storage: StorageHealth;
	counts: {
		total: number;
		active: number;
		pinned: number;
		stale: number;
		rejected: number;
		expired: number;
		forgotten: number;
		suspectedJunk: number;
	};
	duplicates: DuplicateGroup[];
	singletonProblems: DuplicateGroup[];
	suspectedJunk: { id: string; reason: string }[];
	remediationHints: string[];
	lastInjection?: { ids: string[]; estimatedTokens: number };
}

type MemoryTelemetryEventType = "memory_injection" | "turn_start" | "turn_end" | "message_end" | "tool_call" | "tool_result" | "provider_request" | "provider_response";

interface MemoryTelemetryBase {
	eventType: MemoryTelemetryEventType;
	timestamp: string;
	turnId: string;
	turnIndex?: number;
	benchmarkRunId?: string;
	benchmarkPass?: string;
	benchmarkRequestId?: string;
}

interface MemoryInjectionTelemetry extends MemoryTelemetryBase {
	eventType: "memory_injection";
	memoryEnabled: boolean;
	selectedMemoryIds: string[];
	memoryHitCount: number;
	cardCharacters: number;
	estimatedCardTokens: number;
	estimatedAvoidedTokens: number;
	estimatedNetSavedTokens: number;
	promptSummary?: string;
}

interface ProviderUsageTelemetry {
	provider?: string;
	model?: string;
	inputTokens?: number;
	outputTokens?: number;
	cacheReadTokens?: number;
	cacheWriteTokens?: number;
	cacheTokens?: number;
	totalTokens?: number;
	costUsd?: number;
}

interface ToolTelemetry {
	toolCallId?: string;
	toolName: string;
	argumentSummary?: string;
	resultSummary?: string;
	readPaths?: string[];
	commandSummary?: string;
	resultCharacters?: number;
	isError?: boolean;
	durationMs?: number;
}

interface TurnTelemetrySummary extends MemoryTelemetryBase {
	eventType: "turn_end";
	startedAt?: string;
	endedAt: string;
	durationMs?: number;
	selectedMemoryIds: string[];
	memoryHitCount: number;
	cardTokens?: number;
	estimatedAvoidedTokens?: number;
	estimatedNetSavedTokens?: number;
	toolCount: number;
	toolSummaries: string[];
	providerUsage?: ProviderUsageTelemetry;
}

interface MemoryTelemetryEvent extends MemoryTelemetryBase {
	memoryEnabled?: boolean;
	selectedMemoryIds?: string[];
	memoryHitCount?: number;
	cardCharacters?: number;
	estimatedCardTokens?: number;
	estimatedAvoidedTokens?: number;
	estimatedNetSavedTokens?: number;
	promptSummary?: string;
	providerUsage?: ProviderUsageTelemetry;
	tool?: ToolTelemetry;
	toolCount?: number;
	toolSummaries?: string[];
	payloadCharacters?: number;
	estimatedPayloadTokens?: number;
	status?: number;
	responseMetadata?: Record<string, string>;
	durationMs?: number;
	startedAt?: string;
	endedAt?: string;
}

interface MemoryBenchmarkRequest {
	id: string;
	title: string;
	prompt: string;
	expectedSubstrings: string[];
}

interface MemoryBenchmarkAssertionResult {
	expected: string;
	passed: boolean;
}

interface MemoryBenchmarkPassResult {
	requestId: string;
	passName: "baseline" | "memory-assisted";
	prompt: string;
	stdout: string;
	stderr: string;
	durationMs: number;
	exitCode: number | null;
	assertions: MemoryBenchmarkAssertionResult[];
	telemetryRecords: MemoryTelemetryEvent[];
	providerUsage?: ProviderUsageTelemetry;
	memoryHits: number;
	injectedTokens: number;
	estimatedAvoidedTokens: number;
	toolCalls: number;
}

interface MemoryBenchmarkReport {
	runId: string;
	createdAt: string;
	model: string;
	mode: string;
	requests: MemoryBenchmarkRequest[];
	results: MemoryBenchmarkPassResult[];
	summary: {
		baseline: Record<string, number | undefined>;
		memoryAssisted: Record<string, number | undefined>;
		deltas: Record<string, number | undefined>;
		quality: { passed: number; total: number };
	};
	warnings: string[];
}

const defaultConfig: MemoryConfig = { tokenBudget: DEFAULT_TOKEN_BUDGET, maxEntriesPerCard: 12 };

function globalMemoryRootPath(file = ""): string {
	return join(GLOBAL_MEMORY_ROOT, file);
}

function memoryPath(_ctx: ExtensionContext, file = ""): string {
	return globalMemoryRootPath(file);
}

function globalExportPath(file = ""): string {
	return globalMemoryRootPath(join(EXPORTS_DIR, "global", file));
}

function repoExportPath(repoKey: string, file = ""): string {
	return globalMemoryRootPath(join(EXPORTS_DIR, "repos", repoKey, file));
}

function legacyMemoryPath(ctx: ExtensionContext, file = ""): string {
	return join(ctx.cwd, MEMORY_DIR, file);
}

function entriesPath(ctx: ExtensionContext): string {
	return legacyMemoryPath(ctx, ENTRIES_FILE);
}

function entriesBackupPath(ctx: ExtensionContext): string {
	return legacyMemoryPath(ctx, ENTRIES_BACKUP_FILE);
}

function memoryDbPath(_ctx: ExtensionContext): string {
	return globalMemoryRootPath(MEMORY_DB_FILE);
}

function legacyMemoryDbPath(ctx: ExtensionContext): string {
	return legacyMemoryPath(ctx, MEMORY_DB_FILE);
}

function memoryExportJsonPath(ctx: ExtensionContext, repo?: RepositoryInfo): string {
	return repo ? repoExportPath(repo.key, "entries.export.json") : globalExportPath(MEMORY_EXPORT_JSON_FILE);
}

function memoryExportMarkdownPath(ctx: ExtensionContext, repo?: RepositoryInfo): string {
	return repo ? repoExportPath(repo.key, MEMORY_EXPORT_MARKDOWN_FILE) : globalExportPath(MEMORY_EXPORT_MARKDOWN_FILE);
}

function preferencesPath(_ctx: ExtensionContext): string {
	return globalExportPath(PREFERENCES_FILE);
}

function openSpecIndexPath(ctx: ExtensionContext, repo?: RepositoryInfo): string {
	return repo ? repoExportPath(repo.key, OPEN_SPEC_INDEX_FILE) : memoryPath(ctx, OPEN_SPEC_INDEX_FILE);
}

function repoFilePath(repo: RepositoryInfo): string {
	return repoExportPath(repo.key, REPO_FILE);
}

function quarantinePath(ctx: ExtensionContext, timestamp = Date.now()): string {
	return legacyMemoryPath(ctx, `entries.corrupt.${timestamp}.json`);
}

function healthPath(ctx: ExtensionContext, repo?: RepositoryInfo): string {
	return repo ? repoExportPath(repo.key, HEALTH_FILE) : globalExportPath(HEALTH_FILE);
}

function statsPath(ctx: ExtensionContext): string {
	return legacyMemoryPath(ctx, STATS_FILE);
}

function globalStatsPath(_ctx: ExtensionContext): string {
	return globalMemoryRootPath(STATS_FILE);
}

function benchmarksPath(ctx: ExtensionContext): string {
	return legacyMemoryPath(ctx, BENCHMARKS_DIR);
}

function globalBenchmarksPath(_ctx: ExtensionContext): string {
	return globalMemoryRootPath(BENCHMARKS_DIR);
}

function benchmarkRunPath(ctx: ExtensionContext, runId: string): string {
	return join(globalBenchmarksPath(ctx), runId);
}

function nowIso(): string {
	return new Date().toISOString();
}

function makeId(type: string): string {
	return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function hashText(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

function clip(text: string, max = MAX_ENTRY_TEXT): string {
	const normalized = text.replace(/\s+$/g, "").trim();
	return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

function addDaysIso(days: number): string {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function isExpired(entry: MemoryEntry, now = Date.now()): boolean {
	if (entry.sourceKind === "pinned") return false;
	return Boolean(entry.expiresAt && Date.parse(entry.expiresAt) <= now);
}

async function ensureMemoryDirs(ctx: ExtensionContext, repo?: RepositoryInfo): Promise<void> {
	await mkdir(memoryPath(ctx), { recursive: true });
	await mkdir(globalExportPath(), { recursive: true });
	await mkdir(globalMemoryRootPath("sessions"), { recursive: true });
	await mkdir(globalMemoryRootPath("files"), { recursive: true });
	if (repo) await mkdir(repoExportPath(repo.key), { recursive: true });
}

const execFileAsync = promisify(execFile);

async function canonicalPath(path: string): Promise<string> {
	try {
		return await realpath(path);
	} catch {
		return resolve(path);
	}
}

async function findOpenSpecRoot(start: string): Promise<string | undefined> {
	let current = await canonicalPath(start);
	while (true) {
		if (existsSync(join(current, "openspec"))) return current;
		const parent = dirname(current);
		if (parent === current) return undefined;
		current = parent;
	}
}

async function discoverRepository(ctx: ExtensionContext, options: { allowCwdFallback?: boolean } = {}): Promise<RepositoryInfo | undefined> {
	let rootPath: string | undefined;
	let discoveredBy: RepositoryDiscovery = "none";
	try {
		const result = await execFileAsync("git", ["-C", ctx.cwd, "rev-parse", "--show-toplevel"], { timeout: 3000 });
		rootPath = String(result.stdout).trim() || undefined;
		if (rootPath) discoveredBy = "git";
	} catch {
		// Not a git repository; try OpenSpec next.
	}
	if (!rootPath) {
		rootPath = await findOpenSpecRoot(ctx.cwd);
		if (rootPath) discoveredBy = "openspec";
	}
	if (!rootPath && options.allowCwdFallback !== false) {
		rootPath = ctx.cwd;
		discoveredBy = "cwd";
	}
	if (!rootPath) return undefined;
	const canonical = await canonicalPath(rootPath);
	return {
		key: hashText(canonical).slice(0, 16),
		rootPath: canonical,
		displayName: basename(canonical) || canonical,
		discoveredBy,
		lastSeenAt: nowIso(),
	};
}

function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.replace(/<!--.*?-->/g, " ")
		.replace(/\b(preference|decision|assumption|blocker|next step):/g, " ")
		.replace(/[`*_#>\[\](){}.,;:!?"']/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function semanticDedupeKey(entry: Pick<MemoryEntry, "type" | "text" | "tags" | "dedupeKey" | "source">): string {
	if (entry.dedupeKey && !entry.dedupeKey.startsWith("scope:")) return entry.dedupeKey;
	const singletonTag = entry.tags?.find((tag) => tag.startsWith("singleton:"));
	if (singletonTag) return singletonTag;
	if (entry.type === "tool" && entry.source?.command) return `tool:${entry.source.command}:${normalizeText(entry.text).slice(0, 120)}`;
	return `${entry.type}:${hashText(normalizeText(entry.text)).slice(0, 16)}`;
}

function scopedDedupeKey(entry: Pick<MemoryEntry, "type" | "text" | "tags" | "dedupeKey" | "source" | "scope" | "repoKey">): string {
	if (entry.dedupeKey?.startsWith("scope:")) return entry.dedupeKey;
	const base = semanticDedupeKey(entry);
	return `scope:${entry.scope ?? "repo"}:${entry.repoKey ?? "global"}:${base}`;
}

function withDerivedMetadata<T extends Omit<MemoryEntry, "id" | "createdAt" | "updatedAt">>(entry: T): T {
	const dedupeKey = scopedDedupeKey(entry);
	return { ...entry, dedupeKey };
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
	const tmp = `${path}.${process.pid}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}.tmp`;
	const serialized = `${JSON.stringify(value, null, 2)}\n`;
	JSON.parse(serialized);
	await writeFile(tmp, serialized, "utf8");
	JSON.parse(await readFile(tmp, "utf8"));
	await rename(tmp, path);
}

async function appendJsonlFile(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const line = JSON.stringify(value);
	JSON.parse(line);
	await appendFile(path, `${line}\n`, "utf8");
}

async function writeMarkdownFile(path: string, content: string): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${content.replace(/\s+$/g, "")}\n`, "utf8");
}

async function appendMarkdown(path: string, content: string): Promise<void> {
	let current = "";
	try {
		current = await readFile(path, "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
	await writeFile(path, `${current}${current.endsWith("\n") || current.length === 0 ? "" : "\n"}${content}`, "utf8");
}

function coerceEntries(value: unknown, recoveryState: RecoveryState = "none"): MemoryEntry[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((item): item is MemoryEntry => Boolean(item && typeof item === "object" && typeof (item as MemoryEntry).id === "string" && typeof (item as MemoryEntry).text === "string"))
		.map((entry) => ({ ...entry, dedupeKey: entry.dedupeKey ?? semanticDedupeKey(entry), recoveryState: entry.recoveryState ?? (recoveryState === "none" ? undefined : recoveryState) }));
}

function recoverArrayPrefix(raw: string): MemoryEntry[] | undefined {
	const first = raw.indexOf("[");
	const last = raw.lastIndexOf("}");
	if (first < 0 || last < first) return undefined;
	for (let end = last; end > first; end = raw.lastIndexOf("}", end - 1)) {
		const candidate = `${raw.slice(first, end + 1)}]`;
		try {
			const parsed = JSON.parse(candidate) as unknown;
			const entries = coerceEntries(parsed, "subset");
			if (entries.length > 0) return entries;
		} catch {
			// Try an earlier object boundary.
		}
	}
	return undefined;
}

async function listQuarantineFiles(ctx: ExtensionContext): Promise<string[]> {
	try {
		return (await readdir(legacyMemoryPath(ctx))).filter((name) => /^entries\.corrupt\..*\.json$/.test(name)).sort();
	} catch {
		return [];
	}
}

async function quarantineCorruptEntries(ctx: ExtensionContext, raw: string): Promise<string | undefined> {
	await ensureMemoryDirs(ctx);
	const target = quarantinePath(ctx);
	try {
		await writeFile(target, raw, "utf8");
		return target;
	} catch {
		return undefined;
	}
}

async function loadEntriesSafe(ctx: ExtensionContext, options: { quarantine?: boolean } = {}): Promise<{ entries: MemoryEntry[]; storage: StorageHealth }> {
	await ensureMemoryDirs(ctx);
	const path = entriesPath(ctx);
	const backup = entriesBackupPath(ctx);
	const backupExists = existsSync(backup);
	let raw = "";
	try {
		raw = await readFile(path, "utf8");
		const parsed = JSON.parse(raw) as unknown;
		const entries = coerceEntries(parsed, "primary-valid");
		return { entries, storage: { exists: true, valid: true, recoveryState: "primary-valid", entryCount: entries.length, backupExists, quarantineFiles: await listQuarantineFiles(ctx) } };
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return { entries: [], storage: { exists: false, valid: true, recoveryState: "empty", entryCount: 0, backupExists, quarantineFiles: await listQuarantineFiles(ctx), message: "No memory store exists yet." } };
		}
		if (options.quarantine) await quarantineCorruptEntries(ctx, raw);
		try {
			const backupEntries = coerceEntries(JSON.parse(await readFile(backup, "utf8")) as unknown, "backup");
			return { entries: backupEntries, storage: { exists: true, valid: false, recoveryState: "backup", entryCount: backupEntries.length, backupExists, quarantineFiles: await listQuarantineFiles(ctx), message: "Primary entries.json is invalid; recovered from backup." } };
		} catch {
			const subset = recoverArrayPrefix(raw);
			if (subset) {
				return { entries: subset, storage: { exists: true, valid: false, recoveryState: "subset", entryCount: subset.length, backupExists, quarantineFiles: await listQuarantineFiles(ctx), message: "Primary entries.json is invalid; recovered a parseable subset." } };
			}
			return { entries: [], storage: { exists: true, valid: false, recoveryState: "empty", entryCount: 0, backupExists, quarantineFiles: await listQuarantineFiles(ctx), message: "Primary entries.json is invalid; continuing with empty memory." } };
		}
	}
}

type SqliteDatabase = InstanceType<typeof DatabaseSync>;

type EntryRow = {
	id: string;
	type: MemoryType;
	scope: MemoryScope | null;
	repo_key: string | null;
	origin_repo_key: string | null;
	source_kind: MemorySourceKind;
	text: string;
	quality: MemoryQuality | null;
	lifecycle: MemoryLifecycle | null;
	classification: MemoryClassification | null;
	dedupe_key: string | null;
	duplicate_of: string | null;
	created_at: string;
	updated_at: string;
	expires_at: string | null;
	forgotten_at: string | null;
	stale: number;
	hit_count: number;
	last_used_at: string | null;
	reason_rejected: string | null;
	recovery_state: RecoveryState | null;
	source_json: string | null;
	metadata_json: string | null;
};

interface MemoryStore {
	listEntries(options?: { includeAll?: boolean; scope?: MemoryScope | "all" }): Promise<MemoryEntry[]>;
	addEntry(entry: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt">): Promise<MemoryEntry>;
	upsertSingletonEntry(keyTag: string, entry: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt">): Promise<MemoryEntry>;
	replaceEntries(entries: MemoryEntry[]): Promise<void>;
	forgetEntry(id: string): Promise<MemoryEntry | undefined>;
	recordUsage(ids: string[]): Promise<void>;
	storageHealth(): Promise<StorageHealth>;
	exportInspectionFiles(): Promise<void>;
}

class SqliteMemoryStore implements MemoryStore {
	private journalMode = "unknown";
	private readonly ctx: ExtensionContext;
	private readonly db: SqliteDatabase;
	private readonly repo?: RepositoryInfo;

	constructor(ctx: ExtensionContext, db: SqliteDatabase, repo?: RepositoryInfo) {
		this.ctx = ctx;
		this.db = db;
		this.repo = repo;
	}

	initialize(): void {
		this.db.exec("PRAGMA foreign_keys = ON");
		this.db.exec("PRAGMA busy_timeout = 5000");
		try {
			const mode = this.db.prepare("PRAGMA journal_mode = WAL").get() as { journal_mode?: string } | undefined;
			this.journalMode = mode?.journal_mode ?? "wal-requested";
		} catch {
			this.journalMode = "unsupported";
		}
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS memory_metadata (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS entries (
				id TEXT PRIMARY KEY,
				type TEXT NOT NULL,
				scope TEXT NOT NULL DEFAULT 'repo',
				repo_key TEXT,
				origin_repo_key TEXT,
				source_kind TEXT NOT NULL,
				text TEXT NOT NULL,
				quality TEXT,
				lifecycle TEXT,
				classification TEXT,
				dedupe_key TEXT,
				duplicate_of TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				expires_at TEXT,
				forgotten_at TEXT,
				stale INTEGER NOT NULL DEFAULT 0,
				hit_count INTEGER NOT NULL DEFAULT 0,
				last_used_at TEXT,
				reason_rejected TEXT,
				recovery_state TEXT,
				source_json TEXT,
				metadata_json TEXT,
				FOREIGN KEY (duplicate_of) REFERENCES entries(id) ON DELETE SET NULL
			);
			CREATE TABLE IF NOT EXISTS entry_tags (
				entry_id TEXT NOT NULL,
				tag TEXT NOT NULL,
				PRIMARY KEY (entry_id, tag),
				FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
			);
			CREATE TABLE IF NOT EXISTS memory_imports (
				source_path TEXT PRIMARY KEY,
				source_sha256 TEXT,
				recovery_state TEXT NOT NULL,
				imported_at TEXT NOT NULL,
				entry_count INTEGER NOT NULL,
				message TEXT
			);
			CREATE TABLE IF NOT EXISTS memory_repositories (
				repo_key TEXT PRIMARY KEY,
				root_path TEXT NOT NULL,
				display_name TEXT NOT NULL,
				discovered_by TEXT NOT NULL,
				last_seen_at TEXT NOT NULL
			);
			CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
			CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at DESC);
			CREATE INDEX IF NOT EXISTS idx_entries_expires_at ON entries(expires_at);
			CREATE INDEX IF NOT EXISTS idx_entries_forgotten_at ON entries(forgotten_at);
			CREATE INDEX IF NOT EXISTS idx_entries_stale ON entries(stale);
			CREATE INDEX IF NOT EXISTS idx_entries_dedupe_key ON entries(dedupe_key);
			CREATE INDEX IF NOT EXISTS idx_entries_source_kind ON entries(source_kind);
			CREATE INDEX IF NOT EXISTS idx_entries_quality ON entries(quality);
			CREATE INDEX IF NOT EXISTS idx_entries_lifecycle ON entries(lifecycle);
			CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag);
		`);
		this.ensureColumn("entries", "scope", "TEXT NOT NULL DEFAULT 'repo'");
		this.ensureColumn("entries", "repo_key", "TEXT");
		this.ensureColumn("entries", "origin_repo_key", "TEXT");
		this.db.exec("CREATE INDEX IF NOT EXISTS idx_entries_scope_repo ON entries(scope, repo_key)");
		this.db.exec("CREATE INDEX IF NOT EXISTS idx_entries_origin_repo ON entries(origin_repo_key)");
		const version = this.getSchemaVersion();
		if (version < 2) this.setMetadata("schema_version", "2");
		if (this.repo) this.updateRepositoryIndex(this.repo);
	}

	async importJsonIfNeeded(): Promise<void> {
		await this.importLegacyJsonIfNeeded();
		await this.importLegacySqliteIfNeeded();
	}

	private async importLegacyJsonIfNeeded(): Promise<void> {
		if (!this.repo) return;
		const sourcePath = entriesPath(this.ctx);
		if (!existsSync(sourcePath)) return;
		const imported = this.db.prepare("SELECT source_path FROM memory_imports WHERE source_path = ?").get(sourcePath);
		if (imported) return;
		const sourceSha = await hashFile(sourcePath);
		const loaded = await loadEntriesSafe(this.ctx, { quarantine: true });
		const entries = loaded.entries.map((entry) => this.normalizeEntryScope({
			...entry,
			recoveryState: entry.recoveryState ?? loaded.storage.recoveryState,
			migrationSource: sourcePath,
			source: { ...(entry.source ?? {}), path: entry.source?.path ?? sourcePath },
		}, "repo"));
		this.importEntries(sourcePath, sourceSha, loaded.storage.recoveryState, entries, loaded.storage.message);
	}

	private async importLegacySqliteIfNeeded(): Promise<void> {
		if (!this.repo) return;
		const sourcePath = legacyMemoryDbPath(this.ctx);
		if (!existsSync(sourcePath) || sourcePath === memoryDbPath(this.ctx)) return;
		const imported = this.db.prepare("SELECT source_path FROM memory_imports WHERE source_path = ?").get(sourcePath);
		if (imported) return;
		let sourceDb: SqliteDatabase | undefined;
		let entries: MemoryEntry[] = [];
		let message: string | undefined;
		try {
			sourceDb = new DatabaseSync(sourcePath, { readOnly: true });
			const table = sourceDb.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entries'").get();
			if (!table) return;
			const rows = sourceDb.prepare("SELECT * FROM entries ORDER BY datetime(created_at) DESC, id DESC").all() as EntryRow[];
			entries = rows.map((row) => this.normalizeEntryScope({ ...this.rowToEntry(row, []), migrationSource: sourcePath, recoveryState: row.recovery_state ?? "primary-valid" }, "repo"));
		} catch (error) {
			message = `Legacy SQLite import skipped: ${error instanceof Error ? error.message : String(error)}`;
		} finally {
			try { sourceDb?.close(); } catch { /* ignore close failures */ }
		}
		if (entries.length === 0 && !message) return;
		this.importEntries(sourcePath, await hashFile(sourcePath), message ? "empty" : "primary-valid", entries, message);
	}

	private importEntries(sourcePath: string, sourceSha: string | undefined, recoveryState: RecoveryState, entries: MemoryEntry[], message?: string): void {
		this.transaction(() => {
			const existing = this.selectEntries({ includeAll: true });
			const existingByKey = new Map(existing.filter((entry) => !entry.forgottenAt && entry.sourceKind !== "forgotten").map((entry) => [entry.dedupeKey ?? scopedDedupeKey(entry), entry]));
			for (const entry of entries) {
				const key = entry.dedupeKey ?? scopedDedupeKey(entry);
				const duplicate = existingByKey.get(key);
				const importedEntry: MemoryEntry = duplicate
					? { ...entry, duplicateOf: entry.duplicateOf ?? duplicate.id, reasonRejected: entry.reasonRejected ?? "Duplicate imported memory retained for inspection.", quality: entry.quality ?? "low", updatedAt: nowIso() }
					: entry;
				this.upsertEntry(importedEntry);
				if (!duplicate) existingByKey.set(key, importedEntry);
			}
			this.db.prepare("INSERT INTO memory_imports (source_path, source_sha256, recovery_state, imported_at, entry_count, message) VALUES (?, ?, ?, ?, ?, ?)").run(
				sourcePath,
				sourceSha ?? null,
				recoveryState,
				nowIso(),
				entries.length,
				message ?? null,
			);
		});
	}

	async listEntries(options: { includeAll?: boolean; scope?: MemoryScope | "all" } = {}): Promise<MemoryEntry[]> {
		return this.selectEntries(options);
	}

	async addEntry(entry: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt">): Promise<MemoryEntry> {
		const enriched = withDerivedMetadata(this.normalizeEntryScope(entry));
		const full: MemoryEntry = { ...enriched, id: makeId(entry.type), createdAt: nowIso(), updatedAt: nowIso() };
		this.transaction(() => {
			this.upsertEntry(full);
			this.pruneEntries();
		});
		await this.exportInspectionFiles();
		return full;
	}

	async upsertSingletonEntry(keyTag: string, entry: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt">): Promise<MemoryEntry> {
		let result: MemoryEntry;
		this.transaction(() => {
			const entries = this.selectEntries();
			const scopedProbe = this.normalizeEntryScope({ ...entry, tags: [...(entry.tags ?? []), keyTag], dedupeKey: keyTag });
			const dedupeKey = scopedDedupeKey(scopedProbe);
			const existing = entries.find((item) => !item.forgottenAt && item.sourceKind !== "forgotten" && (item.dedupeKey === dedupeKey || item.tags?.includes(keyTag)));
			const tags = [...new Set([...(entry.tags ?? []), keyTag])];
			if (existing) {
				result = this.normalizeEntryScope({ ...existing, ...entry, tags, dedupeKey, updatedAt: nowIso(), duplicateOf: undefined });
				this.upsertEntry(result);
				for (const duplicate of entries.filter((item) => item.id !== existing.id && !item.forgottenAt && (item.dedupeKey === dedupeKey || item.tags?.includes(keyTag)))) {
					this.upsertEntry({ ...duplicate, duplicateOf: existing.id, reasonRejected: "Duplicate singleton suppressed; retained for inspection.", quality: duplicate.quality ?? "low", updatedAt: nowIso() });
				}
				return;
			}
			const enriched = withDerivedMetadata(this.normalizeEntryScope({ ...entry, tags, dedupeKey }));
			result = { ...enriched, id: makeId(entry.type), createdAt: nowIso(), updatedAt: nowIso() };
			this.upsertEntry(result);
			this.pruneEntries();
		});
		await this.exportInspectionFiles();
		return result!;
	}

	async replaceEntries(entries: MemoryEntry[]): Promise<void> {
		this.transaction(() => {
			for (const entry of entries.map((item) => this.normalizeEntryScope({ ...item, dedupeKey: item.dedupeKey ?? scopedDedupeKey(item) })).slice(0, MAX_STORED_ENTRIES)) this.upsertEntry(entry);
			this.pruneEntries();
		});
		await this.exportInspectionFiles();
	}

	async forgetEntry(id: string): Promise<MemoryEntry | undefined> {
		let entry: MemoryEntry | undefined;
		this.transaction(() => {
			entry = this.selectEntries({ includeAll: true }).find((item) => item.id === id);
			if (!entry) return;
			entry = { ...entry, sourceKind: "forgotten", forgottenAt: nowIso(), updatedAt: nowIso(), reasonRejected: undefined };
			this.upsertEntry(entry);
		});
		if (entry) await this.exportInspectionFiles();
		return entry;
	}

	async recordUsage(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		const now = nowIso();
		this.transaction(() => {
			for (const id of ids) this.db.prepare("UPDATE entries SET hit_count = hit_count + 1, last_used_at = ?, updated_at = ? WHERE id = ?").run(now, now, id);
		});
	}

	async storageHealth(): Promise<StorageHealth> {
		const backupExists = existsSync(entriesBackupPath(this.ctx));
		const importRows = this.db.prepare("SELECT source_path, recovery_state, imported_at, entry_count FROM memory_imports ORDER BY imported_at DESC").all() as Array<{ source_path?: string; recovery_state?: RecoveryState; imported_at?: string; entry_count?: number }>;
		const importRow = importRows.find((row) => row.source_path === entriesPath(this.ctx) || row.source_path === legacyMemoryDbPath(this.ctx));
		let integrity = "ok";
		try {
			integrity = String((this.db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string }).integrity_check ?? "ok");
		} catch (error) {
			integrity = error instanceof Error ? error.message : String(error);
		}
		return {
			exists: existsSync(memoryDbPath(this.ctx)),
			valid: integrity === "ok",
			recoveryState: importRow?.recovery_state ?? (existsSync(entriesPath(this.ctx)) ? "none" : "empty"),
			entryCount: Number((this.db.prepare("SELECT COUNT(*) AS count FROM entries WHERE scope = 'global' OR (scope = 'repo' AND repo_key = ?) OR (scope = 'session' AND (repo_key = ? OR repo_key IS NULL))").get(this.repo?.key ?? null, this.repo?.key ?? null) as { count: number }).count),
			backupExists,
			quarantineFiles: await listQuarantineFiles(this.ctx),
			dbPath: memoryDbPath(this.ctx),
			schemaVersion: this.getSchemaVersion(),
			journalMode: this.journalMode,
			migrationStatus: `${importRows.length ? importRows.map((row) => `Imported ${row.entry_count ?? 0} entries from ${row.source_path} at ${row.imported_at}`).join("; ") : existsSync(entriesPath(this.ctx)) || existsSync(legacyMemoryDbPath(this.ctx)) ? "legacy local memory present but not imported" : "No legacy local memory detected"}; repo ${this.repo ? `${this.repo.displayName}/${this.repo.key}` : "none"}; integrity: ${integrity}`,
		};
	}

	async exportInspectionFiles(): Promise<void> {
		const entries = this.selectEntries({ includeAll: true });
		const payload = {
			generatedAt: nowIso(),
			note: "Memory is orientation, not authority. SQLite memory.sqlite is canonical; this JSON is an inspection export only.",
			databasePath: memoryDbPath(this.ctx),
			repository: this.repo,
			entries,
		};
		await ensureMemoryDirs(this.ctx, this.repo);
		await writeJsonFile(memoryExportJsonPath(this.ctx, this.repo), payload);
		const markdown = [
			"# Memory Export",
			`Generated: ${payload.generatedAt}`,
			"",
			"Memory is orientation, not authority. SQLite memory.sqlite is canonical; this Markdown is an inspection export only.",
			"",
			groupEntries(entries),
			"",
		].join("\n");
		await writeFile(memoryExportMarkdownPath(this.ctx, this.repo), markdown, "utf8");
	}

	private selectEntries(options: { includeAll?: boolean; scope?: MemoryScope | "all" } = {}): MemoryEntry[] {
		let rows: EntryRow[];
		if (options.includeAll || options.scope === "all") {
			rows = this.db.prepare("SELECT * FROM entries ORDER BY datetime(created_at) DESC, id DESC").all() as EntryRow[];
		} else if (options.scope === "global") {
			rows = this.db.prepare("SELECT * FROM entries WHERE scope = 'global' ORDER BY datetime(created_at) DESC, id DESC").all() as EntryRow[];
		} else if (options.scope === "repo") {
			if (!this.repo) rows = [];
			else rows = this.db.prepare("SELECT * FROM entries WHERE scope = 'repo' AND repo_key = ? ORDER BY datetime(created_at) DESC, id DESC").all(this.repo.key) as EntryRow[];
		} else if (options.scope === "session") {
			rows = this.db.prepare("SELECT * FROM entries WHERE scope = 'session' AND (repo_key = ? OR repo_key IS NULL) ORDER BY datetime(created_at) DESC, id DESC").all(this.repo?.key ?? null) as EntryRow[];
		} else {
			rows = this.db.prepare("SELECT * FROM entries WHERE scope = 'global' OR (scope = 'repo' AND repo_key = ?) OR (scope = 'session' AND (repo_key = ? OR repo_key IS NULL)) ORDER BY datetime(created_at) DESC, id DESC").all(this.repo?.key ?? null, this.repo?.key ?? null) as EntryRow[];
		}
		const tags = this.tagsByEntryId();
		return rows.map((row) => this.rowToEntry(row, tags.get(row.id) ?? []));
	}

	private tagsByEntryId(): Map<string, string[]> {
		const rows = this.db.prepare("SELECT entry_id, tag FROM entry_tags ORDER BY tag").all() as Array<{ entry_id: string; tag: string }>;
		const tags = new Map<string, string[]>();
		for (const row of rows) tags.set(row.entry_id, [...(tags.get(row.entry_id) ?? []), row.tag]);
		return tags;
	}

	private upsertEntry(entry: MemoryEntry): void {
		const normalized = this.normalizeEntryScope({ ...entry, dedupeKey: entry.dedupeKey ?? scopedDedupeKey(entry) });
		this.db.prepare(`
			INSERT INTO entries (id, type, scope, repo_key, origin_repo_key, source_kind, text, quality, lifecycle, classification, dedupe_key, duplicate_of, created_at, updated_at, expires_at, forgotten_at, stale, hit_count, last_used_at, reason_rejected, recovery_state, source_json, metadata_json)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				type = excluded.type,
				scope = excluded.scope,
				repo_key = excluded.repo_key,
				origin_repo_key = excluded.origin_repo_key,
				source_kind = excluded.source_kind,
				text = excluded.text,
				quality = excluded.quality,
				lifecycle = excluded.lifecycle,
				classification = excluded.classification,
				dedupe_key = excluded.dedupe_key,
				duplicate_of = excluded.duplicate_of,
				created_at = excluded.created_at,
				updated_at = excluded.updated_at,
				expires_at = excluded.expires_at,
				forgotten_at = excluded.forgotten_at,
				stale = excluded.stale,
				hit_count = excluded.hit_count,
				last_used_at = excluded.last_used_at,
				reason_rejected = excluded.reason_rejected,
				recovery_state = excluded.recovery_state,
				source_json = excluded.source_json,
				metadata_json = excluded.metadata_json
		`).run(
			normalized.id,
			normalized.type,
			normalized.scope ?? "repo",
			normalized.repoKey ?? null,
			normalized.originRepoKey ?? null,
			normalized.sourceKind,
			normalized.text,
			normalized.quality ?? null,
			normalized.lifecycle ?? null,
			normalized.classification ?? null,
			normalized.dedupeKey ?? null,
			normalized.duplicateOf ?? null,
			normalized.createdAt,
			normalized.updatedAt,
			normalized.expiresAt ?? null,
			normalized.forgottenAt ?? null,
			normalized.stale ? 1 : 0,
			normalized.hitCount ?? 0,
			normalized.lastUsedAt ?? null,
			normalized.reasonRejected ?? null,
			normalized.recoveryState ?? null,
			normalized.source ? JSON.stringify(normalized.source) : null,
			JSON.stringify({ migrationSource: normalized.migrationSource ?? null }),
		);
		this.db.prepare("DELETE FROM entry_tags WHERE entry_id = ?").run(normalized.id);
		for (const tag of [...new Set(normalized.tags ?? [])]) this.db.prepare("INSERT OR IGNORE INTO entry_tags (entry_id, tag) VALUES (?, ?)").run(normalized.id, tag);
	}

	private rowToEntry(row: EntryRow, tags: string[]): MemoryEntry {
		const source = row.source_json ? (JSON.parse(row.source_json) as SourceRef) : undefined;
		const metadata = row.metadata_json ? (JSON.parse(row.metadata_json) as { migrationSource?: string | null }) : {};
		return {
			id: row.id,
			type: row.type,
			scope: row.scope ?? "repo",
			repoKey: row.repo_key ?? undefined,
			originRepoKey: row.origin_repo_key ?? undefined,
			migrationSource: metadata.migrationSource ?? undefined,
			sourceKind: row.source_kind,
			text: row.text,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			tags: tags.length ? tags : undefined,
			source,
			stale: Boolean(row.stale),
			forgottenAt: row.forgotten_at ?? undefined,
			quality: row.quality ?? undefined,
			expiresAt: row.expires_at ?? undefined,
			dedupeKey: row.dedupe_key ?? undefined,
			hitCount: row.hit_count,
			lastUsedAt: row.last_used_at ?? undefined,
			reasonRejected: row.reason_rejected ?? undefined,
			recoveryState: row.recovery_state ?? undefined,
			lifecycle: row.lifecycle ?? undefined,
			classification: row.classification ?? undefined,
			duplicateOf: row.duplicate_of ?? undefined,
		};
	}

	private normalizeEntryScope<T extends Omit<MemoryEntry, "id" | "createdAt" | "updatedAt"> | MemoryEntry>(entry: T, forcedScope?: MemoryScope): T {
		let scope: MemoryScope = forcedScope ?? entry.scope ?? this.defaultScope(entry);
		let repoKey = entry.repoKey;
		if (scope === "repo") {
			if (this.repo) repoKey = this.repo.key;
			else scope = "session";
		}
		if (scope === "session" && !repoKey && this.repo) repoKey = this.repo.key;
		const originRepoKey = scope === "global" && this.repo ? entry.originRepoKey ?? this.repo.key : entry.originRepoKey;
		const scoped = { ...entry, scope, repoKey: scope === "repo" || scope === "session" ? repoKey : undefined, originRepoKey };
		return { ...scoped, dedupeKey: scopedDedupeKey(scoped) } as T;
	}

	private defaultScope(entry: Pick<MemoryEntry, "type" | "sourceKind" | "tags" | "classification" | "lifecycle">): MemoryScope {
		if (entry.type === "preference" && entry.sourceKind === "pinned" && (entry.classification === "preference" || entry.tags?.includes("preference"))) return "global";
		if (["repo", "openspec", "tool"].includes(entry.type)) return this.repo ? "repo" : "session";
		if (entry.type === "session") return this.repo ? "repo" : "session";
		return this.repo ? "repo" : "global";
	}

	private ensureColumn(table: string, column: string, definition: string): void {
		const rows = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
		if (!rows.some((row) => row.name === column)) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
	}

	private updateRepositoryIndex(repo: RepositoryInfo): void {
		this.db.prepare("INSERT INTO memory_repositories (repo_key, root_path, display_name, discovered_by, last_seen_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(repo_key) DO UPDATE SET root_path = excluded.root_path, display_name = excluded.display_name, discovered_by = excluded.discovered_by, last_seen_at = excluded.last_seen_at").run(repo.key, repo.rootPath, repo.displayName, repo.discoveredBy, repo.lastSeenAt);
		const rows = this.db.prepare("SELECT repo_key, root_path, display_name, discovered_by, last_seen_at FROM memory_repositories ORDER BY display_name").all();
		this.setMetadata("repository_index", JSON.stringify(rows));
	}

	private transaction<T>(fn: () => T): T {
		this.db.exec("BEGIN IMMEDIATE");
		try {
			const result = fn();
			this.db.exec("COMMIT");
			return result;
		} catch (error) {
			try {
				this.db.exec("ROLLBACK");
			} catch {
				// Ignore rollback failures so the original error is preserved.
			}
			throw error;
		}
	}

	private pruneEntries(): void {
		this.db.prepare("DELETE FROM entries WHERE id NOT IN (SELECT id FROM entries ORDER BY datetime(created_at) DESC, id DESC LIMIT ?)").run(MAX_STORED_ENTRIES);
	}

	private getSchemaVersion(): number {
		const row = this.db.prepare("SELECT value FROM memory_metadata WHERE key = 'schema_version'").get() as { value?: string } | undefined;
		return Number(row?.value ?? 0);
	}

	private setMetadata(key: string, value: string): void {
		this.db.prepare("INSERT INTO memory_metadata (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(key, value, nowIso());
	}
}

const stores = new Map<string, SqliteMemoryStore>();

async function getMemoryStore(ctx: ExtensionContext): Promise<MemoryStore> {
	const repo = await discoverRepository(ctx);
	await ensureMemoryDirs(ctx, repo);
	const key = `${memoryDbPath(ctx)}:${repo?.key ?? "no-repo"}`;
	let store = stores.get(key);
	if (!store) {
		store = new SqliteMemoryStore(ctx, new DatabaseSync(memoryDbPath(ctx)), repo);
		store.initialize();
		stores.set(key, store);
	}
	await store.importJsonIfNeeded();
	return store;
}

async function readEntries(ctx: ExtensionContext, options: { includeAll?: boolean; scope?: MemoryScope | "all" } = {}): Promise<MemoryEntry[]> {
	return (await getMemoryStore(ctx)).listEntries(options);
}

async function writeEntries(ctx: ExtensionContext, entries: MemoryEntry[]): Promise<void> {
	await (await getMemoryStore(ctx)).replaceEntries(entries);
}

async function addEntry(ctx: ExtensionContext, entry: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt">): Promise<MemoryEntry> {
	return (await getMemoryStore(ctx)).addEntry(entry);
}

async function upsertSingletonEntry(
	ctx: ExtensionContext,
	keyTag: string,
	entry: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt">,
): Promise<MemoryEntry> {
	return (await getMemoryStore(ctx)).upsertSingletonEntry(keyTag, entry);
}

async function forgetEntry(ctx: ExtensionContext, id: string): Promise<MemoryEntry | undefined> {
	return (await getMemoryStore(ctx)).forgetEntry(id);
}

async function recordEntryUsage(ctx: ExtensionContext, ids: string[]): Promise<void> {
	await (await getMemoryStore(ctx)).recordUsage(ids);
}

async function hashFile(path: string): Promise<string | undefined> {
	try {
		return createHash("sha256").update(await readFile(path)).digest("hex");
	} catch {
		return undefined;
	}
}

async function sourceFor(path: string): Promise<SourceRef> {
	const s = await stat(path);
	return { path, mtimeMs: s.mtimeMs, sha256: await hashFile(path) };
}

async function updateStaleness(ctx: ExtensionContext): Promise<MemoryEntry[]> {
	const entries = await readEntries(ctx);
	let changed = false;
	for (const entry of entries) {
		if (entry.sourceKind === "forgotten") continue;
		let stale = false;
		if (entry.source?.path && entry.sourceKind === "observed") {
			const currentHash = await hashFile(entry.source.path);
			stale = !currentHash || (entry.source.sha256 !== undefined && currentHash !== entry.source.sha256);
		}
		if (entry.source?.commandHash && entry.source.command) {
			// Command-derived memories are fresh only when their stored result hash is explicitly current.
			stale = stale || entry.source.commandHash !== entry.source.resultHash;
		}
		if (entry.type === "openspec" && entry.source?.command === "openspec list --json") {
			try {
				const index = JSON.parse(await readFile(openSpecIndexPath(ctx, await discoverRepository(ctx)), "utf8")) as { resultHash?: string };
				stale = stale || Boolean(entry.source.resultHash && index.resultHash && entry.source.resultHash !== index.resultHash);
			} catch {
				stale = true;
			}
		}
		const expired = isExpired(entry);
		if (expired && entry.lifecycle !== "expired") {
			entry.lifecycle = "expired";
			changed = true;
		}
		if (entry.stale !== stale) {
			entry.stale = stale;
			entry.updatedAt = nowIso();
			changed = true;
		}
	}
	if (changed) await writeEntries(ctx, entries);
	return entries;
}

function textFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((part) => (part && typeof part === "object" && "text" in part ? String((part as { text: unknown }).text) : ""))
			.filter(Boolean)
			.join("\n");
	}
	return "";
}

function messageText(message: unknown): string {
	if (!message || typeof message !== "object") return "";
	const maybe = message as { content?: unknown; message?: { content?: unknown }; role?: string; type?: string; customType?: string };
	if (maybe.customType === "memory-card" || maybe.type === "tool_result") return "";
	return textFromContent(maybe.content ?? maybe.message?.content);
}

async function writeHumanFiles(ctx: ExtensionContext, entries: MemoryEntry[]): Promise<void> {
	const prefs = entries
		.filter((e) => e.type === "preference" && e.sourceKind === "pinned" && !e.forgottenAt)
		.map((e) => `- ${e.text} <!-- id:${e.id} -->`)
		.join("\n");
	await ensureMemoryDirs(ctx, await discoverRepository(ctx));
	await writeFile(preferencesPath(ctx), `# Pinned Global Memory\n\n${prefs || "_No pinned memory._"}\n`, "utf8");
}

async function refreshOpenSpecIndex(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	await ensureMemoryDirs(ctx);
	const result = await pi.exec("openspec", ["list", "--json"], { timeout: 10_000 });
	const raw = result.stdout || result.stderr || "{}";
	let parsed: unknown = {};
	try {
		parsed = JSON.parse(raw);
	} catch {
		parsed = { error: "Failed to parse openspec list output", raw: clip(raw, 2000) };
	}
	const resultHash = hashText(raw);
	const sourcePath = join(ctx.cwd, "openspec", "config.yaml");
	const index = {
		generatedAt: nowIso(),
		command: "openspec list --json",
		cwd: ctx.cwd,
		resultHash,
		data: parsed,
		source: existsSync(sourcePath) ? await sourceFor(sourcePath) : undefined,
	};
	const repo = await discoverRepository(ctx);
	await ensureMemoryDirs(ctx, repo);
	await writeJsonFile(openSpecIndexPath(ctx, repo), index);
	await upsertSingletonEntry(ctx, "singleton:openspec-index", {
		type: "openspec",
		scope: "repo",
		sourceKind: "observed",
		text: `OpenSpec index refreshed. Active changes: ${Array.isArray((parsed as { changes?: unknown[] }).changes) ? (parsed as { changes: unknown[] }).changes.length : "unknown"}.`,
		tags: ["openspec", "index"],
		quality: "high",
		lifecycle: "durable",
		source: { command: "openspec list --json", resultHash, commandHash: resultHash, ...(index.source ?? {}) },
	});
}

async function refreshRepoOrientation(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	await ensureMemoryDirs(ctx);
	const command = "find repo orientation";
	const result = await pi.exec(
		"bash",
		[
			"-lc",
			"find . -maxdepth 2 -type f -o -maxdepth 2 -type d | sed 's#^./##' | sort | grep -E '^(\\.pi|openspec|README|[^/]+/README|package.json|tsconfig|src|scripts)' | head -120",
		],
		{ timeout: 10_000 },
	);
	const output = result.stdout || result.stderr || "No orientation output.";
	const repoText = `# Repo Orientation\n\nGenerated: ${nowIso()}\n\nThis memory is orientation only; read exact files before edits or exact claims.\n\n\`\`\`text\n${clip(output, 6000)}\n\`\`\`\n`;
	const repo = await discoverRepository(ctx);
	if (!repo) return;
	await ensureMemoryDirs(ctx, repo);
	await writeFile(repoFilePath(repo), repoText, "utf8");
	const resultHash = hashText(output);
	await upsertSingletonEntry(ctx, "singleton:repo-orientation", {
		type: "repo",
		scope: "repo",
		sourceKind: "observed",
		text: "Repo orientation refreshed for pi/OpenSpec-relevant project structure. See .pi/memory/repo.md.",
		tags: ["repo", "orientation"],
		quality: "high",
		lifecycle: "durable",
		source: { command, resultHash, commandHash: resultHash },
	});
}

async function refreshAll(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	await ensureMemoryDirs(ctx);
	await refreshOpenSpecIndex(pi, ctx);
	await refreshRepoOrientation(pi, ctx);
	await updateStaleness(ctx);
	await writeHumanFiles(ctx, await readEntries(ctx));
}

function isSuspectedJunkText(text: string, existingIds: Set<string>): string | undefined {
	const trimmed = text.trim();
	if (/Repo Memory \(orientation, not authority\)|orientation card only|read exact current files before edits/i.test(trimmed)) return "memory-card echo";
	if ([...existingIds].some((id) => id && trimmed.includes(id))) return "contains existing memory id";
	if (/^```|\n```|interface\s+\w+|type\s+\w+\s*=|function\s+\w+\s*\(|const\s+\w+\s*=|import\s+.*from\s+/.test(trimmed)) return "raw code or type snippet";
	if (/^\s*(at\s+\S+\s+\(|Error:|\w*Error:|Traceback \(most recent call last\))/.test(trimmed)) return "stack trace";
	if (/^(\/|\.\/|\.pi\/|openspec\/|src\/|docs\/)[^\s]+$/.test(trimmed) || /\/opt\/homebrew\/lib\/node_modules\//.test(trimmed)) return "raw path or docs location";
	if (/^(stdout|stderr|exit code|tool result|{\s*"|\[\s*{)/i.test(trimmed)) return "raw tool output";
	return undefined;
}

function groupDuplicateEntries(entries: MemoryEntry[]): DuplicateGroup[] {
	const groups = new Map<string, MemoryEntry[]>();
	for (const entry of entries.filter((e) => !e.forgottenAt && e.sourceKind !== "forgotten")) {
		const key = entry.dedupeKey ?? semanticDedupeKey(entry);
		groups.set(key, [...(groups.get(key) ?? []), entry]);
	}
	return [...groups.entries()]
		.filter(([, items]) => items.length > 1)
		.map(([key, items]) => ({ key, ids: items.map((item) => item.id), pinnedIds: items.filter((item) => item.sourceKind === "pinned").map((item) => item.id) }));
}

async function analyzeHealth(ctx: ExtensionContext, lastInjection?: { ids: string[]; estimatedTokens: number }): Promise<MemoryHealthReport> {
	const store = await getMemoryStore(ctx);
	const entries = await store.listEntries({ includeAll: true });
	const storage = await store.storageHealth();
	const existingIds = new Set(entries.map((entry) => entry.id));
	const suspectedJunk = entries
		.map((entry) => ({ id: entry.id, reason: entry.quality === "suspected-junk" ? entry.reasonRejected ?? "marked suspected junk" : isSuspectedJunkText(entry.text, existingIds) }))
		.filter((item): item is { id: string; reason: string } => Boolean(item.reason));
	const duplicates = groupDuplicateEntries(entries);
	const singletonProblems = duplicates.filter((group) => group.key.startsWith("singleton:"));
	const expiredCount = entries.filter((e) => isExpired(e) || e.lifecycle === "expired").length;
	const hints: string[] = [];
	if (!storage.exists) hints.push("No memory database exists yet; run /memory refresh or /memory pin when useful.");
	if (!storage.valid) hints.push("Inspect quarantined entries.corrupt.*.json files and keep entries.json.bak until satisfied with recovery.");
	if (duplicates.length > 0) hints.push("Duplicate groups are suppressed during injection; use /memory forget <id> for explicit cleanup.");
	if (suspectedJunk.length > 0) hints.push("Suspected junk is excluded or deprioritized; forget unwanted entries explicitly.");
	if (expiredCount > 0) hints.push("Expired inferred session entries remain inspectable but are excluded from injection.");
	const report: MemoryHealthReport = {
		generatedAt: nowIso(),
		storage,
		counts: {
			total: entries.length,
			active: entries.filter((e) => !e.forgottenAt && e.sourceKind !== "forgotten").length,
			pinned: entries.filter((e) => e.sourceKind === "pinned" && !e.forgottenAt).length,
			stale: entries.filter((e) => e.stale).length,
			rejected: entries.filter((e) => e.sourceKind === "rejected" || e.reasonRejected).length,
			expired: expiredCount,
			forgotten: entries.filter((e) => e.forgottenAt || e.sourceKind === "forgotten").length,
			suspectedJunk: suspectedJunk.length,
		},
		duplicates,
		singletonProblems,
		suspectedJunk,
		remediationHints: hints,
		lastInjection,
	};
	await writeJsonFile(healthPath(ctx), report);
	return report;
}

function renderHealthReport(report: MemoryHealthReport): string {
	const lines = [
		"# Memory Health",
		`Generated: ${report.generatedAt}`,
		"",
		"## Storage",
		"Memory is orientation, not authority; read exact files before edits or exact claims.",
		`- SQLite database: ${report.storage.dbPath ?? "unknown"}`,
		`- Store exists: ${report.storage.exists ? "yes" : "no"}`,
		`- Database valid: ${report.storage.valid ? "yes" : "no"}`,
		`- Schema version: ${report.storage.schemaVersion ?? "unknown"}`,
		`- Journal mode: ${report.storage.journalMode ?? "unknown"}`,
		`- Migration status: ${report.storage.migrationStatus ?? "unknown"}`,
		`- Legacy recovery state: ${report.storage.recoveryState}`,
		`- Legacy backup exists: ${report.storage.backupExists ? "yes" : "no"}`,
		`- Quarantine files: ${report.storage.quarantineFiles.length ? report.storage.quarantineFiles.join(", ") : "none"}`,
		report.storage.message ? `- Note: ${report.storage.message}` : "",
		"",
		"## Counts",
		`- Total: ${report.counts.total}`,
		`- Active: ${report.counts.active}`,
		`- Pinned: ${report.counts.pinned}`,
		`- Stale: ${report.counts.stale}`,
		`- Rejected: ${report.counts.rejected}`,
		`- Expired: ${report.counts.expired}`,
		`- Forgotten: ${report.counts.forgotten}`,
		`- Suspected junk: ${report.counts.suspectedJunk}`,
		"",
		"## Duplicate Groups",
		report.duplicates.length ? report.duplicates.map((group) => `- ${group.key}: ${group.ids.join(", ")}${group.pinnedIds.length ? ` (pinned: ${group.pinnedIds.join(", ")})` : ""}`).join("\n") : "No duplicate groups detected.",
		"",
		"## Singleton Consistency",
		report.singletonProblems.length ? report.singletonProblems.map((group) => `- ${group.key}: ${group.ids.join(", ")}`).join("\n") : "Generated singleton entries look consistent.",
		"",
		"## Suspected Junk",
		report.suspectedJunk.length ? report.suspectedJunk.map((item) => `- ${item.id}: ${item.reason}`).join("\n") : "No suspected junk detected.",
		"",
		"## Last Injection",
		report.lastInjection ? `- Selected entries: ${report.lastInjection.ids.length}\n- Approx tokens: ${report.lastInjection.estimatedTokens}\n- IDs: ${report.lastInjection.ids.join(", ") || "none"}` : "No injection recorded in this session.",
		"",
		"## Remediation Hints",
		report.remediationHints.length ? report.remediationHints.map((hint) => `- ${hint}`).join("\n") : "No remediation needed.",
	];
	return lines.filter((line) => line !== "").join("\n");
}

function groupEntries(entries: MemoryEntry[]): string {
	const groups = new Map<string, MemoryEntry[]>();
	for (const entry of entries) {
		const labels = [entry.scope ?? "repo", entry.repoKey ? `repo:${entry.repoKey}` : undefined, entry.type, entry.sourceKind, entry.stale ? "stale" : undefined, isExpired(entry) ? "expired" : undefined, entry.quality, entry.duplicateOf ? "duplicate" : undefined].filter(Boolean).join("/");
		groups.set(labels, [...(groups.get(labels) ?? []), entry]);
	}
	const lines: string[] = [];
	for (const [group, items] of groups) {
		lines.push(`## ${group}`);
		for (const item of items.slice(0, 25)) {
			lines.push(`- ${item.id}: ${item.text}${item.source?.path ? ` (source: ${relative(process.cwd(), item.source.path)})` : ""}${item.reasonRejected ? ` [${item.reasonRejected}]` : ""}`);
		}
		lines.push("");
	}
	return lines.join("\n").trim() || "No memory entries.";
}

function promptTerms(prompt: string): Set<string> {
	return new Set(prompt.toLowerCase().match(/[a-z0-9_.\/-]{3,}/g) ?? []);
}

function scoreEntry(prompt: string, entry: MemoryEntry): number {
	const lowerPrompt = prompt.toLowerCase();
	const terms = promptTerms(prompt);
	const entryText = `${entry.text} ${(entry.tags ?? []).join(" ")} ${entry.source?.path ?? ""} ${entry.source?.command ?? ""}`.toLowerCase();
	let score = 0;
	// Major weights are intentionally simple and inspectable: user-pinned durable context wins, then prompt overlap, freshness, source trust, and recency.
	if (entry.sourceKind === "pinned") score += 120;
	if (entry.quality === "high") score += 8;
	if (entry.quality === "medium" || !entry.quality) score += 4;
	if (entry.type === "openspec" && /openspec|opsx|change|proposal|design|task|archive|spec/.test(lowerPrompt)) score += 80;
	if (entry.type === "repo") score += 5;
	if (entry.type === "session") score += 10;
	for (const term of terms) {
		if (entryText.includes(term)) score += term.includes("/") || term.includes(".") ? 18 : 6;
	}
	if (entry.tags?.some((tag) => lowerPrompt.includes(tag.toLowerCase()))) score += 20;
	if (entry.sourceKind === "observed") score += 3;
	if (entry.sourceKind === "inferred") score += 2;
	if (entry.type === "tool") score -= 20;
	if (entry.type === "tool" && (entry.tags?.some((tag) => lowerPrompt.includes(tag.toLowerCase())) || (entry.source?.command && lowerPrompt.includes(entry.source.command.toLowerCase())))) score += 35;
	if (entry.hitCount) score += Math.min(entry.hitCount * 3, 15);
	const ageDays = Math.max(0, (Date.now() - Date.parse(entry.updatedAt || entry.createdAt)) / 86_400_000);
	score += Math.max(0, 12 - ageDays);
	return score;
}

function selectMemoryCard(prompt: string, entries: MemoryEntry[], config: MemoryConfig): { card: string; ids: string[]; estimatedTokens: number } {
	const duplicateGroups = groupDuplicateEntries(entries);
	const duplicateSuppressed = new Set<string>();
	for (const group of duplicateGroups) {
		const members = entries.filter((entry) => group.ids.includes(entry.id));
		const representative = members.sort((a, b) => Number(b.sourceKind === "pinned") - Number(a.sourceKind === "pinned") || b.updatedAt.localeCompare(a.updatedAt))[0];
		for (const member of members) if (member.id !== representative.id) duplicateSuppressed.add(member.id);
	}
	const live = entries.filter((e) => !e.forgottenAt && e.sourceKind !== "forgotten" && e.sourceKind !== "rejected" && !e.stale && !isExpired(e) && e.quality !== "suspected-junk" && e.quality !== "low" && !duplicateSuppressed.has(e.id));
	const scored = live
		.map((entry) => ({ entry, score: scoreEntry(prompt, entry) }))
		.filter((item) => item.entry.sourceKind === "pinned" || item.score >= 35)
		.sort((a, b) => b.score - a.score || b.entry.updatedAt.localeCompare(a.entry.updatedAt));

	let remainingChars = config.tokenBudget * 4;
	const lines = [
		"## Memory (orientation, not authority)",
		"Use this as a compact orientation card only. Read exact current files before edits or exact claims.",
	];
	const ids: string[] = [];
	const selectedByScope = [
		["Global Memory", scored.filter((item) => item.entry.scope === "global")],
		["Current Repository Memory", scored.filter((item) => (item.entry.scope ?? "repo") === "repo")],
		["Session Memory", scored.filter((item) => item.entry.scope === "session")],
	] as const;
	let selectedCount = 0;
	for (const [section, items] of selectedByScope) {
		let sectionRendered = false;
		for (const { entry } of items) {
			if (selectedCount >= config.maxEntriesPerCard) break;
			const label = `${entry.scope ?? "repo"}/${entry.sourceKind}/${entry.type}${entry.quality ? `/${entry.quality}` : ""}${entry.stale ? "/stale" : ""}`;
			const line = `- [${label}] ${entry.text} (id: ${entry.id})`;
			if (line.length > remainingChars) continue;
			if (!sectionRendered) {
				lines.push(`\n### ${section}`);
				sectionRendered = true;
			}
			lines.push(line);
			ids.push(entry.id);
			remainingChars -= line.length;
			selectedCount += 1;
		}
	}
	const card = lines.join("\n");
	return { card, ids, estimatedTokens: Math.ceil(card.length / 4) };
}
function stripCodeBlocks(text: string): string {
	return text.replace(/```[\s\S]*?```/g, "\n");
}

function classifyCandidate(line: string): MemoryClassification | undefined {
	if (/\b(prefer|preference)\b/i.test(line)) return "preference";
	if (/\b(decided|decision|settled|we will|approach is)\b/i.test(line)) return "decision";
	if (/\b(blocker|blocked|cannot|can't)\b/i.test(line)) return "blocker";
	if (/\b(assumption|assume)\b/i.test(line)) return "assumption";
	if (/\b(next step|todo|follow up|continue by)\b/i.test(line)) return "next-step";
	return undefined;
}

function isActionableCandidate(line: string): boolean {
	return line.length >= 30 && line.length <= MAX_SESSION_MEMORY_TEXT && /\b(repo|project|openspec|pi|memory|extension|change|task|implementation|design|spec|test|validation|dashboard|observability)\b/i.test(line);
}

function extractTurnMemory(messages: unknown[], existingEntries: MemoryEntry[] = []): Array<{ text: string; classification: MemoryClassification; quality: MemoryQuality; reasonRejected?: string }> {
	const existingIds = new Set(existingEntries.map((entry) => entry.id));
	const existingKeys = new Set(existingEntries.map((entry) => entry.dedupeKey ?? semanticDedupeKey(entry)));
	const text = stripCodeBlocks(messages.map(messageText).join("\n"));
	const lines = text.split("\n").map((line) => line.trim().replace(/^[-*]\s+/, "")).filter(Boolean);
	const accepted: Array<{ text: string; classification: MemoryClassification; quality: MemoryQuality; reasonRejected?: string }> = [];
	for (const line of lines) {
		if (!/\b(decided|decision|assumption|rejected|prefer|preference|blocker|next step|todo|follow up|we will|settled)\b/i.test(line)) continue;
		const text = clip(line, MAX_SESSION_MEMORY_TEXT);
		const classification = classifyCandidate(text);
		if (!classification) continue;
		const junkReason = isSuspectedJunkText(text, existingIds);
		const key = semanticDedupeKey({ type: "session", text, tags: ["session", classification] });
		if (junkReason || existingKeys.has(key) || !isActionableCandidate(text)) {
			accepted.push({ text, classification, quality: "suspected-junk", reasonRejected: junkReason ?? (existingKeys.has(key) ? "duplicate inferred memory" : "not durable or actionable") });
			continue;
		}
		accepted.push({ text, classification, quality: "medium" });
	}
	return accepted.slice(-5);
}

async function clearGeneratedMemory(ctx: ExtensionContext, scope?: MemoryScope | "all"): Promise<number> {
	const entries = await readEntries(ctx, { scope });
	let changed = 0;
	for (const entry of entries) {
		if (entry.sourceKind === "pinned") continue;
		if (["repo", "openspec", "session", "tool"].includes(entry.type) && !entry.forgottenAt) {
			entry.sourceKind = "forgotten";
			entry.forgottenAt = nowIso();
			entry.updatedAt = nowIso();
			entry.reasonRejected = undefined;
			changed += 1;
		}
	}
	await writeEntries(ctx, entries);
	return changed;
}


function parseScopeArg(args: string[]): { scope?: MemoryScope | "all"; rest: string[] } {
	const rest = [...args];
	const first = rest[0];
	if (first === "global" || first === "--global") return { scope: "global", rest: rest.slice(1) };
	if (first === "repo" || first === "repository" || first === "--repo" || first === "--repository") return { scope: "repo", rest: rest.slice(1) };
	if (first === "session" || first === "--session") return { scope: "session", rest: rest.slice(1) };
	if (first === "all" || first === "--all") return { scope: "all", rest: rest.slice(1) };
	return { rest };
}

function currentBenchmarkTags(): { benchmarkRunId?: string; benchmarkPass?: string; benchmarkRequestId?: string } {
	return {
		benchmarkRunId: process.env.PI_MEMORY_BENCHMARK_RUN_ID || undefined,
		benchmarkPass: process.env.PI_MEMORY_BENCHMARK_PASS || undefined,
		benchmarkRequestId: process.env.PI_MEMORY_BENCHMARK_REQUEST_ID || undefined,
	};
}

function memoryInjectionEnabled(): boolean {
	const raw = String(process.env.PI_MEMORY_INJECTION_ENABLED ?? process.env.PI_MEMORY_ENABLED ?? "1").toLowerCase();
	return !(raw === "0" || raw === "false" || raw === "off" || raw === "disabled");
}

function summarizePrompt(prompt: string, max = 240): string {
	return clip(prompt.replace(/```[\s\S]*?```/g, "[code block]").replace(/\s+/g, " "), max);
}

function safeJsonSummary(value: unknown, max = 360): string {
	try {
		return clip(JSON.stringify(value, (_key, nested) => {
			if (typeof nested === "string") {
				if (/api[_-]?key|token|secret|password/i.test(nested)) return "[redacted]";
				return clip(nested.replace(/[A-Za-z0-9_=-]{32,}/g, "[redacted]"), 180);
			}
			return nested;
		}), max);
	} catch {
		return clip(String(value), max);
	}
}

function summarizeToolInput(toolName: string, input: unknown): { argumentSummary: string; readPaths?: string[]; commandSummary?: string } {
	const object = input && typeof input === "object" ? input as Record<string, unknown> : {};
	const readPath = typeof object.path === "string" ? object.path : undefined;
	const command = typeof object.command === "string" ? object.command : undefined;
	return {
		argumentSummary: safeJsonSummary(input),
		readPaths: readPath ? [readPath] : undefined,
		commandSummary: command && toolName === "bash" ? clip(command.replace(/\s+/g, " "), 220) : undefined,
	};
}

function summarizeToolResult(content: unknown, max = 360): { resultSummary: string; resultCharacters: number } {
	const text = textFromContent(content) || safeJsonSummary(content, max);
	return { resultSummary: clip(text.replace(/\s+/g, " "), max), resultCharacters: text.length };
}

function estimateTokensFromText(text: string): number {
	return Math.max(0, Math.ceil(text.length / 4));
}

function estimateGrossAvoidedTokens(entry: MemoryEntry): number {
	// Heuristic: memory text stands in for re-reading source context. Source-backed memories receive
	// a floor for likely file/command lookup context; all estimates remain explicitly labeled.
	const textTokens = estimateTokensFromText(entry.text);
	const sourceTokens = entry.source?.path || entry.source?.command ? Math.max(textTokens, 120) : 0;
	return Math.max(20, textTokens * 4, sourceTokens);
}

function estimateSavings(entries: MemoryEntry[], selectedIds: string[], cardTokens: number): { estimatedAvoidedTokens: number; estimatedNetSavedTokens: number } {
	const byId = new Map(entries.map((entry) => [entry.id, entry]));
	const estimatedAvoidedTokens = selectedIds.reduce((sum, id) => sum + (byId.get(id) ? estimateGrossAvoidedTokens(byId.get(id)!) : 0), 0);
	return { estimatedAvoidedTokens, estimatedNetSavedTokens: estimatedAvoidedTokens - cardTokens };
}

function telemetryTurnId(turnIndex?: number, suffix = "current"): string {
	return `${process.pid}-${turnIndex ?? "agent"}-${suffix}`;
}

async function recordTelemetry(ctx: ExtensionContext, event: MemoryTelemetryEvent): Promise<void> {
	try {
		await appendJsonlFile(globalStatsPath(ctx), event);
	} catch {
		// Telemetry must never break memory injection or command handling.
	}
}

function extractProviderUsage(messageOrRecord: unknown): ProviderUsageTelemetry {
	const object = messageOrRecord && typeof messageOrRecord === "object" ? messageOrRecord as Record<string, unknown> : {};
	const usage = (object.usage && typeof object.usage === "object" ? object.usage as Record<string, unknown> : object) as Record<string, unknown>;
	const cost = usage.cost && typeof usage.cost === "object" ? usage.cost as Record<string, unknown> : usage;
	return {
		provider: typeof object.provider === "string" ? object.provider : typeof usage.provider === "string" ? usage.provider : undefined,
		model: typeof object.model === "string" ? object.model : typeof usage.model === "string" ? usage.model : undefined,
		inputTokens: firstNumber(usage.inputTokens, usage.promptTokens, usage.input_tokens, usage.prompt_tokens),
		outputTokens: firstNumber(usage.outputTokens, usage.completionTokens, usage.output_tokens, usage.completion_tokens),
		cacheReadTokens: firstNumber(usage.cacheReadTokens, usage.cache_read_tokens),
		cacheWriteTokens: firstNumber(usage.cacheWriteTokens, usage.cache_write_tokens),
		cacheTokens: firstNumber(usage.cacheTokens, usage.cachedTokens, usage.cache_tokens),
		totalTokens: firstNumber(usage.totalTokens, usage.total_tokens),
		costUsd: firstNumber(usage.costUsd, usage.totalCostUsd, usage.cost, cost.total, cost.totalUsd, cost.usd),
	};
}

function telemetryMetricSummary(records: MemoryTelemetryEvent[]): Record<string, number | undefined> {
	const provider = records.reduce((summary, record) => mergeProviderUsage(summary, record.providerUsage ?? {}), {} as ProviderUsageSummary);
	return {
		inputTokens: provider.inputTokens,
		outputTokens: provider.outputTokens,
		cacheTokens: provider.cacheTokens,
		totalTokens: provider.totalTokens,
		costUsd: provider.costUsd,
		latencyMs: records.reduce((sum, record) => sum + (record.durationMs ?? 0), 0) || undefined,
		toolCalls: records.filter((record) => record.eventType === "tool_call").length || undefined,
		memoryHits: records.reduce((sum, record) => sum + (record.memoryHitCount ?? 0), 0) || undefined,
		injectedTokens: records.reduce((sum, record) => sum + (record.estimatedCardTokens ?? 0), 0) || undefined,
		estimatedAvoidedTokens: records.reduce((sum, record) => sum + (record.estimatedAvoidedTokens ?? 0), 0) || undefined,
	};
}

function metricDelta(memory: Record<string, number | undefined>, baseline: Record<string, number | undefined>): Record<string, number | undefined> {
	const keys = [...new Set([...Object.keys(memory), ...Object.keys(baseline)])];
	return Object.fromEntries(keys.map((key) => [key, memory[key] === undefined || baseline[key] === undefined ? undefined : memory[key]! - baseline[key]!]));
}

function defaultBenchmarkRequests(): MemoryBenchmarkRequest[] {
	return [
		{ id: "memory-extension-path", title: "Locate memory extension", prompt: "Read the repository context and answer: which file implements the pi memory system extension? Include the exact path.", expectedSubstrings: ["pi/extensions/memory-system/index.ts"] },
		{ id: "observability-capability", title: "Summarize observability capability", prompt: "Read the OpenSpec change for memory observability and name the new capability plus one required stats command.", expectedSubstrings: ["pi-memory-observability", "/memory stats"] },
		{ id: "stats-storage", title: "Find stats storage", prompt: "Identify where runtime memory telemetry stats are stored. Include the exact JSONL path.", expectedSubstrings: [".pi/memory/stats.jsonl"] },
		{ id: "benchmark-storage", title: "Find benchmark storage", prompt: "Identify where memory benchmark run artifacts are stored and mention the run directory pattern.", expectedSubstrings: [".pi/memory/benchmarks", "run"] },
		{ id: "measurement-control", title: "Explain measurement control", prompt: "Explain how the baseline benchmark pass should treat memory injection without deleting stored memories.", expectedSubstrings: ["disabled", "stored memory"] },
		{ id: "default-model", title: "Default benchmark model", prompt: "What default cheap model should memory benchmarks use when no model override is provided?", expectedSubstrings: ["openai/gpt-4o-mini"] },
		{ id: "provider-usage-labeling", title: "Usage versus estimates", prompt: "Explain how reports should label actual provider usage versus estimated memory savings.", expectedSubstrings: ["actual", "estimated"] },
		{ id: "quality-assertions", title: "Quality assertions", prompt: "Describe the deterministic quality check approach for memory benchmark requests.", expectedSubstrings: ["assertions", "expected"] },
		{ id: "command-surface", title: "Command surface", prompt: "List the memory commands added by this change for observability and benchmarking.", expectedSubstrings: ["stats", "benchmark"] },
		{ id: "benchmark-isolation", title: "Benchmark memory isolation", prompt: "Explain how benchmark prompts and answers should be isolated from normal durable inferred session memory.", expectedSubstrings: ["benchmark", "durable"] },
	];
}

function parseBenchmarkArgs(args: string[]): { model: string; mode: "comparison" | "dry-run"; confirm: boolean; requestLimit?: number } {
	let model = process.env.PI_MEMORY_BENCHMARK_MODEL || "openai/gpt-4o-mini";
	let mode: "comparison" | "dry-run" = "comparison";
	let confirm = false;
	let requestLimit: number | undefined;
	for (let index = 0; index < args.length; index++) {
		const arg = args[index];
		if (arg === "--model" && args[index + 1]) model = args[++index];
		else if (arg.startsWith("--model=")) model = arg.slice("--model=".length);
		else if (arg === "--dry-run") mode = "dry-run";
		else if (arg === "--yes" || arg === "--confirm") confirm = true;
		else if (arg === "--limit" && args[index + 1]) requestLimit = Number(args[++index]);
		else if (arg.startsWith("--limit=")) requestLimit = Number(arg.slice("--limit=".length));
	}
	return { model, mode, confirm, requestLimit: Number.isFinite(requestLimit) ? Math.max(1, Math.min(10, requestLimit!)) : undefined };
}

async function readBenchmarkTelemetry(ctx: ExtensionContext, runId: string, passName?: string, requestId?: string): Promise<MemoryTelemetryEvent[]> {
	const loaded = await readJsonlFileTolerant(globalStatsPath(ctx));
	return loaded.records.filter((record) => record.benchmarkRunId === runId && (!passName || record.benchmarkPass === passName) && (!requestId || record.benchmarkRequestId === requestId)) as MemoryTelemetryEvent[];
}

function assertionResults(output: string, expected: string[]): MemoryBenchmarkAssertionResult[] {
	const lower = output.toLowerCase();
	return expected.map((item) => ({ expected: item, passed: lower.includes(item.toLowerCase()) }));
}

async function runBenchmarkRequest(ctx: ExtensionContext, runId: string, request: MemoryBenchmarkRequest, passName: "baseline" | "memory-assisted", model: string): Promise<MemoryBenchmarkPassResult> {
	const started = Date.now();
	let stdout = "";
	let stderr = "";
	let exitCode: number | null = 0;
	try {
		const extensionPath = resolve(ctx.cwd, "pi/extensions/memory-system/index.ts");
		const extensionArgs = existsSync(extensionPath) ? ["-e", extensionPath] : [];
		const result = await execFileAsync("pi", [...extensionArgs, "--model", model, "--tools", "read,grep,find", "--no-session", "--no-context-files", "--no-skills", "--no-prompt-templates", "--no-themes", "-p", `${request.prompt}\n\nThis is a read-only benchmark request. Do not edit files. Keep the answer concise.`], {
			cwd: ctx.cwd,
			timeout: 120_000,
			maxBuffer: 4 * 1024 * 1024,
			env: { ...process.env, PI_MEMORY_BENCHMARK_RUN_ID: runId, PI_MEMORY_BENCHMARK_PASS: passName, PI_MEMORY_BENCHMARK_REQUEST_ID: request.id, PI_MEMORY_INJECTION_ENABLED: passName === "baseline" ? "0" : "1" },
		});
		stdout = String(result.stdout ?? "");
		stderr = String(result.stderr ?? "");
	} catch (error) {
		const err = error as NodeJS.ErrnoException & { stdout?: string | Buffer; stderr?: string | Buffer; code?: number };
		stdout = String(err.stdout ?? "");
		stderr = String(err.stderr ?? err.message ?? error);
		exitCode = typeof err.code === "number" ? err.code : 1;
	}
	const durationMs = Date.now() - started;
	const telemetryRecords = await readBenchmarkTelemetry(ctx, runId, passName, request.id);
	const metrics = telemetryMetricSummary(telemetryRecords);
	const providerUsage = telemetryRecords.reduce((summary, record) => mergeProviderUsage(summary, record.providerUsage ?? {}), {} as ProviderUsageSummary);
	return {
		requestId: request.id,
		passName,
		prompt: request.prompt,
		stdout: clip(stdout, 12_000),
		stderr: clip(stderr, 4_000),
		durationMs,
		exitCode,
		assertions: assertionResults(stdout, request.expectedSubstrings),
		telemetryRecords,
		providerUsage,
		memoryHits: metrics.memoryHits ?? 0,
		injectedTokens: metrics.injectedTokens ?? 0,
		estimatedAvoidedTokens: metrics.estimatedAvoidedTokens ?? 0,
		toolCalls: metrics.toolCalls ?? 0,
	};
}

function summarizeBenchmarkPass(results: MemoryBenchmarkPassResult[]): Record<string, number | undefined> {
	const provider = results.reduce((summary, result) => mergeProviderUsage(summary, result.providerUsage ?? {}), {} as ProviderUsageSummary);
	return {
		inputTokens: provider.inputTokens,
		outputTokens: provider.outputTokens,
		cacheTokens: provider.cacheTokens,
		totalTokens: provider.totalTokens,
		costUsd: provider.costUsd,
		latencyMs: results.reduce((sum, result) => sum + result.durationMs, 0),
		toolCalls: results.reduce((sum, result) => sum + result.toolCalls, 0),
		memoryHits: results.reduce((sum, result) => sum + result.memoryHits, 0),
		injectedTokens: results.reduce((sum, result) => sum + result.injectedTokens, 0),
		estimatedAvoidedTokens: results.reduce((sum, result) => sum + result.estimatedAvoidedTokens, 0),
	};
}

function renderBenchmarkReport(report: MemoryBenchmarkReport): string {
	const value = (item: number | undefined, cost = false) => item === undefined ? "unknown" : cost ? `$${item.toFixed(4)}` : Math.round(item).toLocaleString();
	const metricRows = ["inputTokens", "outputTokens", "cacheTokens", "totalTokens", "costUsd", "latencyMs", "toolCalls", "memoryHits", "injectedTokens", "estimatedAvoidedTokens"];
	return [
		"# Memory Benchmark Report",
		`Generated: ${report.createdAt}`,
		`Run ID: ${report.runId}`,
		`Model: ${report.model}`,
		"",
		"Actual provider usage/cost values are shown only when reported by the provider. Estimated avoided tokens are heuristic estimates and are not actual provider billing data.",
		"",
		"## Summary",
		"| Metric | Baseline | Memory-assisted | Delta |",
		"| --- | ---: | ---: | ---: |",
		...metricRows.map((key) => `| ${key} | ${value(report.summary.baseline[key], key === "costUsd")} | ${value(report.summary.memoryAssisted[key], key === "costUsd")} | ${value(report.summary.deltas[key], key === "costUsd")} |`),
		"",
		`Quality assertions: ${report.summary.quality.passed}/${report.summary.quality.total} passed`,
		"",
		"## Requests",
		...report.requests.flatMap((request) => {
			const results = report.results.filter((result) => result.requestId === request.id);
			return [`### ${request.title}`, "", ...results.map((result) => `- ${result.passName}: exit ${result.exitCode ?? "unknown"}, ${result.durationMs}ms, assertions ${result.assertions.filter((item) => item.passed).length}/${result.assertions.length}, memory hits ${result.memoryHits}, tool calls ${result.toolCalls}`), ""];
		}),
		"## Warnings",
		report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "No warnings.",
		"",
	].join("\n");
}

async function runMemoryBenchmark(ctx: ExtensionContext, args: string[]): Promise<string> {
	const parsed = parseBenchmarkArgs(args);
	const runId = `run-${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
	const runDir = benchmarkRunPath(ctx, runId);
	const requests = defaultBenchmarkRequests().slice(0, parsed.requestLimit ?? 10);
	await mkdir(runDir, { recursive: true });
	await writeJsonFile(join(runDir, "config.json"), { runId, createdAt: nowIso(), model: parsed.model, mode: parsed.mode, requestCount: requests.length });
	await writeJsonFile(join(runDir, "requests.json"), requests);
	if (parsed.mode === "dry-run") {
		const dryReport: MemoryBenchmarkReport = { runId, createdAt: nowIso(), model: parsed.model, mode: parsed.mode, requests, results: [], summary: { baseline: {}, memoryAssisted: {}, deltas: {}, quality: { passed: 0, total: 0 } }, warnings: ["Dry run: child pi requests were not executed."] };
		await writeJsonFile(join(runDir, "report.json"), dryReport);
		await writeMarkdownFile(join(runDir, "report.md"), renderBenchmarkReport(dryReport));
		return join(runDir, "report.md");
	}
	const results: MemoryBenchmarkPassResult[] = [];
	for (const passName of ["baseline", "memory-assisted"] as const) {
		for (const [index, request] of requests.entries()) {
			if (ctx.hasUI) ctx.ui.setStatus("memory-benchmark", `benchmark ${passName} ${index + 1}/${requests.length}`);
			results.push(await runBenchmarkRequest(ctx, runId, request, passName, parsed.model));
			await appendJsonlFile(join(runDir, "results.jsonl"), results[results.length - 1]);
		}
	}
	const baseline = summarizeBenchmarkPass(results.filter((result) => result.passName === "baseline"));
	const memoryAssisted = summarizeBenchmarkPass(results.filter((result) => result.passName === "memory-assisted"));
	const quality = results.flatMap((result) => result.assertions);
	const report: MemoryBenchmarkReport = { runId, createdAt: nowIso(), model: parsed.model, mode: parsed.mode, requests, results, summary: { baseline, memoryAssisted, deltas: metricDelta(memoryAssisted, baseline), quality: { passed: quality.filter((item) => item.passed).length, total: quality.length } }, warnings: results.filter((result) => result.exitCode !== 0).map((result) => `${result.passName}/${result.requestId} exited ${result.exitCode}`) };
	await writeJsonFile(join(runDir, "report.json"), report);
	await writeMarkdownFile(join(runDir, "report.md"), renderBenchmarkReport(report));
	if (ctx.hasUI) ctx.ui.setStatus("memory-benchmark", `benchmark complete: ${runId}`);
	return join(runDir, "report.md");
}

async function renderMemoryStats(ctx: ExtensionContext): Promise<string> {
	const data = await loadDashboardData(ctx);
	const overview = data.overview;
	const topHits = data.memories.slice(0, 10);
	return [
		"# Memory Stats",
		`Generated: ${data.generatedAt}`,
		"",
		"Actual provider usage/cost is reported separately from estimated memory savings. Unknown means the provider or runtime did not expose that actual value.",
		"",
		"## Runtime Observability",
		`- Observed turns: ${formatInteger(overview.observedTurns)}`,
		`- Turns with memory hits: ${formatInteger(Math.round(overview.observedTurns * overview.memoryHitRate))}`,
		`- Hit rate: ${formatPercent(overview.memoryHitRate)}`,
		`- Injected memory tokens: ${formatInteger(overview.injectedTokens)}`,
		`- Estimated avoided tokens: ${formatInteger(overview.estimatedAvoidedTokens)} (estimate)` ,
		`- Estimated net saved tokens: ${formatDelta(overview.estimatedNetSavedTokens, " tokens")} (estimate)` ,
		"",
		"## Actual Provider Usage (when available)",
		`- Input tokens: ${formatInteger(overview.providerUsage.inputTokens)}`,
		`- Output tokens: ${formatInteger(overview.providerUsage.outputTokens)}`,
		`- Cache tokens: ${formatInteger(overview.providerUsage.cacheTokens)}`,
		`- Total tokens: ${formatInteger(overview.providerUsage.totalTokens)}`,
		`- Cost: ${formatCost(overview.providerUsage.costUsd)}`,
		"",
		"## Top-hit Memory Entries",
		topHits.length ? topHits.map((entry) => `- ${entry.id}: ${entry.hitCount} hits, ~${formatInteger(entry.estimatedAvoidedTokens)} estimated avoided tokens — ${entry.text}`).join("\n") : "No hit memory entries yet.",
		"",
		"## Latest Benchmark",
		overview.latestBenchmark ? `- ${overview.latestBenchmark.id}: token delta ${formatDelta(overview.latestBenchmark.deltas.totalTokens)}, cost delta ${formatCostDelta(overview.latestBenchmark.deltas.costUsd)}, quality ${overview.latestBenchmark.qualitySummary ?? "unknown"}` : "No benchmark report found. Run `/memory benchmark --dry-run` or `/memory benchmark --yes`.",
		"",
		data.warnings.length ? `## Warnings\n${data.warnings.map((warning) => `- ${warning}`).join("\n")}` : "",
	].filter(Boolean).join("\n");
}

type DashboardView = "overview" | "benchmarks" | "memories" | "turns";

type ProviderUsageSummary = {
	provider?: string;
	model?: string;
	inputTokens?: number;
	outputTokens?: number;
	cacheTokens?: number;
	totalTokens?: number;
	costUsd?: number;
};

interface DashboardOverview {
	observedTurns: number;
	memoryHitRate: number;
	totalMemoryHits: number;
	injectedTokens: number;
	estimatedAvoidedTokens: number;
	estimatedNetSavedTokens: number;
	providerUsage: ProviderUsageSummary;
	latestBenchmark?: BenchmarkRunSummary;
}

interface BenchmarkMetricSummary {
	inputTokens?: number;
	outputTokens?: number;
	cacheTokens?: number;
	totalTokens?: number;
	costUsd?: number;
	latencyMs?: number;
	toolCalls?: number;
	memoryHits?: number;
	injectedTokens?: number;
	estimatedAvoidedTokens?: number;
}

interface BenchmarkRunSummary {
	id: string;
	timestamp?: string;
	model?: string;
	reportJsonPath?: string;
	markdownReportPath?: string;
	baseline: BenchmarkMetricSummary;
	memoryAssisted: BenchmarkMetricSummary;
	deltas: BenchmarkMetricSummary;
	qualitySummary?: string;
	warnings: string[];
}

interface MemoryEntrySummary {
	id: string;
	type?: MemoryType;
	sourceKind?: MemorySourceKind;
	stale: boolean;
	hitCount: number;
	lastUsedAt?: string;
	estimatedAvoidedTokens: number;
	text: string;
	metadata: string[];
	source?: SourceRef;
	tags: string[];
}

interface RecentTurnSummary {
	id: string;
	timestamp?: string;
	promptSummary?: string;
	selectedMemoryIds: string[];
	memoryHitCount: number;
	cardTokens?: number;
	estimatedAvoidedTokens?: number;
	estimatedNetSavedTokens?: number;
	providerUsage: ProviderUsageSummary;
	toolCount?: number;
	toolSummaries: string[];
	durationMs?: number;
	costUsd?: number;
	warnings: string[];
}

interface DashboardData {
	generatedAt: string;
	overview: DashboardOverview;
	benchmarks: BenchmarkRunSummary[];
	memories: MemoryEntrySummary[];
	turns: RecentTurnSummary[];
	warnings: string[];
	empty: boolean;
}

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | undefined {
	return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : undefined;
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
	return undefined;
}

function firstString(...values: unknown[]): string | undefined {
	for (const value of values) {
		const stringValue = asString(value);
		if (stringValue) return stringValue;
	}
	return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
	for (const value of values) {
		const numericValue = asNumber(value);
		if (numericValue !== undefined) return numericValue;
	}
	return undefined;
}

function numberOrZero(value: unknown): number {
	return asNumber(value) ?? 0;
}

function sumDefined(values: Array<number | undefined>): number | undefined {
	const present = values.filter((value): value is number => value !== undefined);
	return present.length ? present.reduce((sum, value) => sum + value, 0) : undefined;
}

function addOptional(a?: number, b?: number): number | undefined {
	if (a === undefined) return b;
	if (b === undefined) return a;
	return a + b;
}

async function readJsonFileTolerant(path: string): Promise<{ value?: unknown; warning?: string; exists: boolean }> {
	try {
		return { value: JSON.parse(await readFile(path, "utf8")) as unknown, exists: true };
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return { exists: false };
		return { exists: true, warning: `${path}: ${error instanceof Error ? error.message : String(error)}` };
	}
}

async function readJsonlFileTolerant(path: string): Promise<{ records: JsonObject[]; warnings: string[]; exists: boolean }> {
	try {
		const raw = await readFile(path, "utf8");
		const records: JsonObject[] = [];
		const warnings: string[] = [];
		raw.split(/\r?\n/).forEach((line, index) => {
			const trimmed = line.trim();
			if (!trimmed) return;
			try {
				const parsed = JSON.parse(trimmed) as unknown;
				const object = asObject(parsed);
				if (object) records.push(object);
				else warnings.push(`${path}:${index + 1}: expected JSON object`);
			} catch (error) {
				warnings.push(`${path}:${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
			}
		});
		return { records, warnings, exists: true };
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return { records: [], warnings: [], exists: false };
		return { records: [], warnings: [`${path}: ${error instanceof Error ? error.message : String(error)}`], exists: true };
	}
}

async function existingPaths(paths: string[]): Promise<string[]> {
	const unique = [...new Set(paths)];
	const found: string[] = [];
	for (const path of unique) {
		try {
			await stat(path);
			found.push(path);
		} catch {
			// Missing optional dashboard data is an empty state, not an error.
		}
	}
	return found;
}

async function listFilesRecursive(root: string): Promise<string[]> {
	try {
		const entries = await readdir(root, { withFileTypes: true });
		const nested = await Promise.all(entries.map(async (entry) => {
			const path = join(root, entry.name);
			if (entry.isDirectory()) return listFilesRecursive(path);
			return [path];
		}));
		return nested.flat();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}
}

function objectAt(record: JsonObject, ...keys: string[]): JsonObject | undefined {
	for (const key of keys) {
		const object = asObject(record[key]);
		if (object) return object;
	}
	return undefined;
}

function arrayAt(record: JsonObject, ...keys: string[]): unknown[] {
	for (const key of keys) {
		const array = asArray(record[key]);
		if (array.length) return array;
	}
	return [];
}

function findNumberDeep(value: unknown, keyMatcher: RegExp): number | undefined {
	const object = asObject(value);
	if (!object) return undefined;
	for (const [key, nested] of Object.entries(object)) {
		if (keyMatcher.test(key)) {
			const numericValue = asNumber(nested);
			if (numericValue !== undefined) return numericValue;
		}
	}
	for (const nested of Object.values(object)) {
		const found = findNumberDeep(nested, keyMatcher);
		if (found !== undefined) return found;
	}
	return undefined;
}

function providerUsageFrom(record: JsonObject | undefined): ProviderUsageSummary {
	if (!record) return {};
	const usage = objectAt(record, "providerUsage", "usage", "tokenUsage") ?? objectAt(objectAt(record, "provider") ?? {}, "usage") ?? record;
	const inputTokens = firstNumber(usage.inputTokens, usage.promptTokens, usage.input_tokens, usage.prompt_tokens);
	const outputTokens = firstNumber(usage.outputTokens, usage.completionTokens, usage.output_tokens, usage.completion_tokens);
	const cacheTokens = firstNumber(usage.cacheTokens, usage.cacheReadTokens, usage.cacheWriteTokens, usage.cache_tokens, usage.cachedTokens);
	return {
		provider: firstString(record.provider, usage.provider, asObject(record.provider)?.name),
		model: firstString(record.model, usage.model, asObject(record.provider)?.model),
		inputTokens,
		outputTokens,
		cacheTokens,
		totalTokens: firstNumber(usage.totalTokens, usage.total_tokens, sumDefined([inputTokens, outputTokens, cacheTokens])),
		costUsd: firstNumber(usage.costUsd, usage.cost, usage.totalCostUsd, usage.total_cost_usd),
	};
}

function mergeProviderUsage(current: ProviderUsageSummary, next: ProviderUsageSummary): ProviderUsageSummary {
	return {
		provider: next.provider ?? current.provider,
		model: next.model ?? current.model,
		inputTokens: addOptional(current.inputTokens, next.inputTokens),
		outputTokens: addOptional(current.outputTokens, next.outputTokens),
		cacheTokens: addOptional(current.cacheTokens, next.cacheTokens),
		totalTokens: addOptional(current.totalTokens, next.totalTokens),
		costUsd: addOptional(current.costUsd, next.costUsd),
	};
}

function selectedMemoryIdsFrom(record: JsonObject): string[] {
	const memory = objectAt(record, "memory", "injection", "lastInjection") ?? {};
	const rawIds = [record.selectedMemoryIds, record.memoryIds, record.selectedIds, memory.selectedMemoryIds, memory.memoryIds, memory.ids, memory.selectedIds];
	for (const raw of rawIds) {
		const ids = asArray(raw).map((value) => asString(value)).filter((value): value is string => Boolean(value));
		if (ids.length) return ids;
	}
	return [];
}

function promptSummaryFrom(record: JsonObject): string | undefined {
	return firstString(record.promptSummary, record.prompt, record.requestSummary, objectAt(record, "turn")?.promptSummary, objectAt(record, "request")?.promptSummary);
}

function toolSummariesFrom(record: JsonObject): string[] {
	const summaries = asArray(record.toolSummaries).concat(arrayAt(record, "tools", "toolCalls"));
	return summaries.map((item) => {
		if (typeof item === "string") return item;
		const object = asObject(item);
		return object ? firstString(object.summary, object.name, object.toolName, object.command) : undefined;
	}).filter((value): value is string => Boolean(value)).slice(0, 8);
}

function turnSummaryFromRecords(id: string, records: JsonObject[]): RecentTurnSummary {
	let selectedMemoryIds: string[] = [];
	let providerUsage: ProviderUsageSummary = {};
	let warnings: string[] = [];
	let toolSummaries: string[] = [];
	let timestamp: string | undefined;
	let promptSummary: string | undefined;
	let memoryHitCount: number | undefined;
	let cardTokens: number | undefined;
	let estimatedAvoidedTokens: number | undefined;
	let estimatedNetSavedTokens: number | undefined;
	let toolCount: number | undefined;
	let durationMs: number | undefined;
	let costUsd: number | undefined;
	for (const record of records) {
		const memory = objectAt(record, "memory", "injection", "lastInjection") ?? {};
		timestamp = firstString(record.timestamp, record.endedAt, record.startedAt, record.createdAt, timestamp);
		promptSummary = promptSummaryFrom(record) ?? promptSummary;
		const ids = selectedMemoryIdsFrom(record);
		if (ids.length) selectedMemoryIds = ids;
		memoryHitCount = firstNumber(record.memoryHitCount, record.hitCount, memory.hitCount, ids.length || undefined, memoryHitCount);
		cardTokens = firstNumber(record.cardTokens, record.estimatedCardTokens, memory.cardTokens, memory.estimatedTokens, cardTokens);
		estimatedAvoidedTokens = firstNumber(record.estimatedAvoidedTokens, record.estimatedGrossSavedTokens, memory.estimatedAvoidedTokens, memory.estimatedGrossSavedTokens, estimatedAvoidedTokens);
		estimatedNetSavedTokens = firstNumber(record.estimatedNetSavedTokens, memory.estimatedNetSavedTokens, estimatedNetSavedTokens);
		providerUsage = mergeProviderUsage(providerUsage, providerUsageFrom(record));
		toolCount = firstNumber(record.toolCount, record.toolCalls, asArray(record.tools).length || undefined, asArray(record.toolSummaries).length || undefined, toolCount);
		durationMs = firstNumber(record.durationMs, record.latencyMs, record.elapsedMs, objectAt(record, "turn")?.durationMs, durationMs);
		costUsd = firstNumber(record.costUsd, record.cost, providerUsage.costUsd, costUsd);
		toolSummaries = [...toolSummaries, ...toolSummariesFrom(record)].slice(0, 8);
		warnings = [...warnings, ...asArray(record.warnings).map((value) => String(value))].slice(0, 8);
	}
	return { id, timestamp, promptSummary, selectedMemoryIds, memoryHitCount: memoryHitCount ?? selectedMemoryIds.length, cardTokens, estimatedAvoidedTokens, estimatedNetSavedTokens, providerUsage, toolCount, toolSummaries, durationMs, costUsd, warnings };
}

function aggregateTurns(records: JsonObject[]): RecentTurnSummary[] {
	const grouped = new Map<string, JsonObject[]>();
	records.forEach((record, index) => {
		const key = firstString(record.turnId, record.id, objectAt(record, "turn")?.id, objectAt(record, "request")?.id) ?? `record-${index}`;
		grouped.set(key, [...(grouped.get(key) ?? []), record]);
	});
	return [...grouped.entries()]
		.map(([id, items]) => turnSummaryFromRecords(id, items))
		.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""))
		.slice(0, 100);
}

async function loadTelemetryTurns(ctx: ExtensionContext): Promise<{ turns: RecentTurnSummary[]; warnings: string[]; exists: boolean }> {
	const paths = [statsPath(ctx), globalStatsPath(ctx)];
	const loaded = await Promise.all(paths.map((path) => readJsonlFileTolerant(path)));
	return {
		turns: aggregateTurns(loaded.flatMap((item) => item.records)),
		warnings: loaded.flatMap((item) => item.warnings),
		exists: loaded.some((item) => item.exists),
	};
}

async function loadDashboardEntries(ctx: ExtensionContext): Promise<{ entries: MemoryEntrySummary[]; warnings: string[]; exists: boolean }> {
	const warnings: string[] = [];
	let entries: MemoryEntry[] = [];
	let exists = false;
	try {
		entries = await readEntries(ctx, { includeAll: true });
		exists = entries.length > 0;
	} catch (error) {
		warnings.push(`SQLite memory entries unavailable: ${error instanceof Error ? error.message : String(error)}`);
	}
	if (entries.length === 0) {
		const repo = await discoverRepository(ctx);
		const paths = await existingPaths([entriesPath(ctx), memoryExportJsonPath(ctx, repo), memoryExportJsonPath(ctx)]);
		exists = paths.length > 0;
		for (const path of paths) {
			const loaded = await readJsonFileTolerant(path);
			if (loaded.warning) warnings.push(loaded.warning);
			const value = loaded.value;
			const rawEntries = Array.isArray(value) ? value : asArray(asObject(value)?.entries);
			if (rawEntries.length) entries = coerceEntries(rawEntries);
			if (entries.length) break;
		}
	}
	return {
		entries: entries
			.filter((entry) => !entry.forgottenAt && entry.sourceKind !== "forgotten")
			.map((entry) => ({
				id: entry.id,
				type: entry.type,
				sourceKind: entry.sourceKind,
				stale: Boolean(entry.stale) || isExpired(entry),
				hitCount: entry.hitCount ?? 0,
				lastUsedAt: entry.lastUsedAt,
				estimatedAvoidedTokens: Math.max(0, Math.round((entry.hitCount ?? 0) * Math.max(20, Math.ceil(entry.text.length / 4)))),
				text: entry.text,
				metadata: [entry.scope ? `scope:${entry.scope}` : undefined, entry.quality ? `quality:${entry.quality}` : undefined, entry.lifecycle ? `lifecycle:${entry.lifecycle}` : undefined, entry.classification ? `class:${entry.classification}` : undefined].filter((value): value is string => Boolean(value)),
				source: entry.source,
				tags: entry.tags ?? [],
			}))
			.sort((a, b) => b.hitCount - a.hitCount || b.estimatedAvoidedTokens - a.estimatedAvoidedTokens || (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))
			.slice(0, 200),
		warnings,
		exists,
	};
}

function metricSummaryFrom(value: unknown): BenchmarkMetricSummary {
	const object = asObject(value) ?? {};
	const usage = providerUsageFrom(object);
	return {
		inputTokens: firstNumber(object.inputTokens, object.promptTokens, usage.inputTokens, findNumberDeep(object, /^(input|prompt).*tokens$/i)),
		outputTokens: firstNumber(object.outputTokens, object.completionTokens, usage.outputTokens, findNumberDeep(object, /^(output|completion).*tokens$/i)),
		cacheTokens: firstNumber(object.cacheTokens, usage.cacheTokens, findNumberDeep(object, /^cache.*tokens$/i)),
		totalTokens: firstNumber(object.totalTokens, usage.totalTokens, findNumberDeep(object, /^total.*tokens$/i)),
		costUsd: firstNumber(object.costUsd, object.cost, usage.costUsd, findNumberDeep(object, /cost.*(usd)?$/i)),
		latencyMs: firstNumber(object.latencyMs, object.durationMs, object.elapsedMs, findNumberDeep(object, /(latency|duration|elapsed).*ms$/i)),
		toolCalls: firstNumber(object.toolCalls, object.toolCount, findNumberDeep(object, /^tool.*(calls|count)$/i)),
		memoryHits: firstNumber(object.memoryHits, object.memoryHitCount, findNumberDeep(object, /^memory.*(hits|hitCount)$/i)),
		injectedTokens: firstNumber(object.injectedTokens, object.cardTokens, object.estimatedCardTokens, findNumberDeep(object, /(injected|card).*tokens$/i)),
		estimatedAvoidedTokens: firstNumber(object.estimatedAvoidedTokens, object.estimatedGrossSavedTokens, findNumberDeep(object, /estimated.*(avoided|saved).*tokens$/i)),
	};
}

function subtractMetric(memory: BenchmarkMetricSummary, baseline: BenchmarkMetricSummary): BenchmarkMetricSummary {
	const delta = (a?: number, b?: number) => a === undefined || b === undefined ? undefined : a - b;
	return {
		inputTokens: delta(memory.inputTokens, baseline.inputTokens),
		outputTokens: delta(memory.outputTokens, baseline.outputTokens),
		cacheTokens: delta(memory.cacheTokens, baseline.cacheTokens),
		totalTokens: delta(memory.totalTokens, baseline.totalTokens),
		costUsd: delta(memory.costUsd, baseline.costUsd),
		latencyMs: delta(memory.latencyMs, baseline.latencyMs),
		toolCalls: delta(memory.toolCalls, baseline.toolCalls),
		memoryHits: delta(memory.memoryHits, baseline.memoryHits),
		injectedTokens: delta(memory.injectedTokens, baseline.injectedTokens),
		estimatedAvoidedTokens: delta(memory.estimatedAvoidedTokens, baseline.estimatedAvoidedTokens),
	};
}

function qualitySummaryFrom(value: unknown): string | undefined {
	const object = asObject(value) ?? {};
	const quality = asObject(object.quality) ?? asObject(object.assertions) ?? asObject(object.qualityAssertions);
	if (quality) {
		const passed = firstNumber(quality.passed, quality.pass, quality.successes);
		const total = firstNumber(quality.total, quality.count);
		const failed = firstNumber(quality.failed, quality.failures);
		if (passed !== undefined && total !== undefined) return `${passed}/${total} assertions`;
		if (failed !== undefined) return `${failed} failing assertions`;
	}
	return firstString(object.qualitySummary, object.assertionSummary, object.summary);
}

function benchmarkRunFromJson(path: string, value: unknown, markdownReportPath?: string): BenchmarkRunSummary {
	const object = asObject(value) ?? {};
	const config = asObject(object.config) ?? {};
	const summary = asObject(object.summary) ?? object;
	const baseline = metricSummaryFrom(object.baseline ?? object.baselinePass ?? asObject(summary).baseline);
	const memoryAssisted = metricSummaryFrom(object.memoryAssisted ?? object.memory ?? object.memoryPass ?? asObject(summary).memoryAssisted ?? asObject(summary).memory);
	const providedDeltas = metricSummaryFrom(object.deltas ?? object.delta ?? asObject(summary).deltas);
	const computedDeltas = subtractMetric(memoryAssisted, baseline);
	return {
		id: firstString(object.runId, object.id, config.runId, basename(dirname(path))) ?? basename(dirname(path)),
		timestamp: firstString(object.timestamp, object.generatedAt, object.createdAt, config.createdAt, basename(dirname(path))),
		model: firstString(object.model, config.model, asObject(summary).model),
		reportJsonPath: path,
		markdownReportPath,
		baseline,
		memoryAssisted,
		deltas: { ...computedDeltas, ...Object.fromEntries(Object.entries(providedDeltas).filter(([, value]) => value !== undefined)) },
		qualitySummary: qualitySummaryFrom(summary) ?? qualitySummaryFrom(object),
		warnings: asArray(object.warnings).map((value) => String(value)),
	};
}

async function loadBenchmarkRuns(ctx: ExtensionContext): Promise<{ benchmarks: BenchmarkRunSummary[]; warnings: string[]; exists: boolean }> {
	const roots = await existingPaths([benchmarksPath(ctx), globalBenchmarksPath(ctx)]);
	const files = (await Promise.all(roots.map((root) => listFilesRecursive(root)))).flat();
	const markdownByDir = new Map(files.filter((path) => /(^|\/)report\.md$/i.test(path)).map((path) => [dirname(path), path]));
	const jsonFiles = files.filter((path) => /(^|\/)(report|summary|results)\.json$/i.test(path));
	const warnings: string[] = [];
	const benchmarks: BenchmarkRunSummary[] = [];
	for (const path of jsonFiles) {
		const loaded = await readJsonFileTolerant(path);
		if (loaded.warning) {
			warnings.push(loaded.warning);
			continue;
		}
		benchmarks.push(benchmarkRunFromJson(path, loaded.value, markdownByDir.get(dirname(path))));
	}
	return { benchmarks: benchmarks.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? "")).slice(0, 100), warnings, exists: roots.length > 0 || files.length > 0 };
}

function aggregateOverview(turns: RecentTurnSummary[], benchmarks: BenchmarkRunSummary[]): DashboardOverview {
	const observedTurns = turns.length;
	const turnsWithHits = turns.filter((turn) => turn.memoryHitCount > 0).length;
	const providerUsage = turns.reduce((summary, turn) => mergeProviderUsage(summary, turn.providerUsage), {} as ProviderUsageSummary);
	return {
		observedTurns,
		memoryHitRate: observedTurns ? turnsWithHits / observedTurns : 0,
		totalMemoryHits: turns.reduce((sum, turn) => sum + turn.memoryHitCount, 0),
		injectedTokens: turns.reduce((sum, turn) => sum + (turn.cardTokens ?? 0), 0),
		estimatedAvoidedTokens: turns.reduce((sum, turn) => sum + (turn.estimatedAvoidedTokens ?? 0), 0),
		estimatedNetSavedTokens: turns.reduce((sum, turn) => sum + (turn.estimatedNetSavedTokens ?? ((turn.estimatedAvoidedTokens ?? 0) - (turn.cardTokens ?? 0))), 0),
		providerUsage,
		latestBenchmark: benchmarks[0],
	};
}

async function loadDashboardData(ctx: ExtensionContext): Promise<DashboardData> {
	const [telemetry, entryData, benchmarkData] = await Promise.all([loadTelemetryTurns(ctx), loadDashboardEntries(ctx), loadBenchmarkRuns(ctx)]);
	const warnings = [...telemetry.warnings, ...entryData.warnings, ...benchmarkData.warnings].slice(0, 12);
	const empty = telemetry.turns.length === 0 && entryData.entries.length === 0 && benchmarkData.benchmarks.length === 0;
	return { generatedAt: nowIso(), overview: aggregateOverview(telemetry.turns, benchmarkData.benchmarks), benchmarks: benchmarkData.benchmarks, memories: entryData.entries, turns: telemetry.turns, warnings, empty };
}

function formatInteger(value?: number): string {
	return value === undefined ? "unknown" : Math.round(value).toLocaleString();
}

function formatCost(value?: number): string {
	return value === undefined ? "unknown" : `$${value.toFixed(value >= 1 ? 2 : 4)}`;
}

function formatPercent(value: number): string {
	return `${Math.round(value * 100)}%`;
}

function formatDuration(value?: number): string {
	if (value === undefined) return "unknown";
	return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

function formatDelta(value?: number, suffix = ""): string {
	if (value === undefined) return "unknown";
	const sign = value > 0 ? "+" : "";
	return `${sign}${Math.round(value).toLocaleString()}${suffix}`;
}

function formatCostDelta(value?: number): string {
	if (value === undefined) return "unknown";
	const sign = value > 0 ? "+" : "";
	return `${sign}${formatCost(value)}`;
}

function asciiBar(value: number, width: number): string {
	const safeWidth = Math.max(4, width);
	const filled = Math.max(0, Math.min(safeWidth, Math.round(value * safeWidth)));
	return `${"█".repeat(filled)}${"░".repeat(safeWidth - filled)}`;
}

function badge(text: string): string {
	return `‹${text}›`;
}

function stripUnsafeControlText(text: string): string {
	return text
		.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

function oneLineText(text: string): string {
	return stripUnsafeControlText(text).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trimEnd();
}

function line(width: number, text: string): string {
	return truncateToWidth(oneLineText(text), Math.max(1, width));
}

function wrapLines(width: number, text: string): string[] {
	return stripUnsafeControlText(text)
		.split(/\r?\n/)
		.flatMap((part) => wrapTextWithAnsi(part, Math.max(1, width)))
		.map((item) => line(width, item));
}

function summaryRow(width: number, label: string, value: string, extra = ""): string {
	const left = `${label}:`.padEnd(24, " ");
	const text = extra ? `${left} ${value} ${extra}` : `${left} ${value}`;
	return line(width, text);
}

function sectionTitle(width: number, title: string): string {
	return line(width, `┄ ${title} ${"┄".repeat(Math.max(0, width - title.length - 4))}`);
}

function pageHeader(width: number, label: string, page: { page: number; totalPages: number; pageStart: number; pageEnd: number }, total: number): string {
	return line(width, `${label}  ${badge(`page ${page.page + 1}/${page.totalPages}`)}  ${page.pageStart + 1}-${page.pageEnd} of ${total}`);
}

function selectedPrefix(selected: boolean): string {
	return selected ? "▸" : " ";
}

function compactCard(width: number, title: string, value: string, note = ""): string {
	const body = note ? `${title} ${value} · ${note}` : `${title} ${value}`;
	return line(width, `│ ${body}`);
}

function cardLines(width: number, cards: Array<[string, string, string?]>): string[] {
	if (width < 76) return cards.map(([title, value, note]) => compactCard(width, title.padEnd(17, " "), value, note));
	const colWidth = Math.floor((width - 2) / 2);
	const lines: string[] = [];
	for (let index = 0; index < cards.length; index += 2) {
		const left = compactCard(colWidth, cards[index][0].padEnd(17, " "), cards[index][1], cards[index][2]).padEnd(colWidth, " ");
		const rightCard = cards[index + 1];
		const right = rightCard ? compactCard(colWidth, rightCard[0].padEnd(17, " "), rightCard[1], rightCard[2]) : "";
		lines.push(line(width, `${left} ${right}`));
	}
	return lines;
}

function viewLabel(view: DashboardView): string {
	return view === "overview" ? "Overview" : view === "benchmarks" ? "Benchmarks" : view === "memories" ? "Memories" : "Turns";
}

function viewIcon(view: DashboardView): string {
	return view === "overview" ? "◆" : view === "benchmarks" ? "◇" : view === "memories" ? "◈" : "○";
}

function paginateItems<T>(items: T[], selectedIndex: number, maxLines: number): { pageItems: Array<{ item: T; index: number }>; pageStart: number; pageEnd: number; page: number; totalPages: number } {
	const pageSize = Math.max(1, maxLines - 1);
	const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
	const safeSelected = Math.max(0, Math.min(items.length - 1, selectedIndex));
	const page = Math.floor(safeSelected / pageSize);
	const pageStart = page * pageSize;
	const pageEnd = Math.min(items.length, pageStart + pageSize);
	return { pageItems: items.slice(pageStart, pageEnd).map((item, offset) => ({ item, index: pageStart + offset })), pageStart, pageEnd, page, totalPages };
}

class MemoryDashboardComponent {
	private readonly views: DashboardView[] = ["overview", "benchmarks", "memories", "turns"];
	private viewIndex = 0;
	private selected: Record<DashboardView, number> = { overview: 0, benchmarks: 0, memories: 0, turns: 0 };
	private detail: { view: DashboardView; index: number } | undefined;
	private cachedWidth?: number;
	private cachedLines?: string[];
	private loadingMessage?: string;
	private lastRefreshMessage?: string;

	constructor(
		private data: DashboardData,
		private readonly refreshData: () => Promise<DashboardData>,
		private readonly openReport: (path: string) => void,
		private readonly close: () => void,
	) {}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			if (this.detail) {
				this.detail = undefined;
				this.invalidate();
				return;
			}
			this.close();
			return;
		}
		if (matchesKey(data, "r")) {
			void this.refresh();
			return;
		}
		if (this.detail) {
			if (matchesKey(data, "o")) {
				const benchmark = this.data.benchmarks[this.detail.index];
				if (this.detail.view === "benchmarks" && benchmark?.markdownReportPath) this.openReport(benchmark.markdownReportPath);
			}
			return;
		}
		if (matchesKey(data, "left") || matchesKey(data, "shift+tab")) {
			this.viewIndex = (this.viewIndex + this.views.length - 1) % this.views.length;
			this.invalidate();
			return;
		}
		if (matchesKey(data, "right") || matchesKey(data, "tab")) {
			this.viewIndex = (this.viewIndex + 1) % this.views.length;
			this.invalidate();
			return;
		}
		const view = this.currentView();
		const count = this.itemCount(view);
		if ((matchesKey(data, "up") || matchesKey(data, "k")) && count > 0) {
			this.selected[view] = Math.max(0, this.selected[view] - 1);
			this.invalidate();
			return;
		}
		if ((matchesKey(data, "down") || matchesKey(data, "j")) && count > 0) {
			this.selected[view] = Math.min(count - 1, this.selected[view] + 1);
			this.invalidate();
			return;
		}
		if (matchesKey(data, "enter") && count > 0 && view !== "overview") {
			this.detail = { view, index: this.selected[view] };
			this.invalidate();
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) return this.cachedLines;
		const safeWidth = Math.max(20, width);
		const lines: string[] = [];
		lines.push(line(safeWidth, `╭─ Memory Dashboard ${"─".repeat(Math.max(0, safeWidth - 21))}`));
		lines.push(line(safeWidth, this.views.map((view, index) => index === this.viewIndex ? ` ${viewIcon(view)} ${viewLabel(view)} ` : ` · ${viewLabel(view)} `).join("")));
		lines.push(line(safeWidth, `╰─ ${this.detail ? "detail" : "browse"} · ${this.data.generatedAt}${this.loadingMessage ? ` · ${this.loadingMessage}` : ""}${this.lastRefreshMessage ? ` · ${this.lastRefreshMessage}` : ""}`));
		if (this.data.warnings.length) {
			lines.push(line(safeWidth, `⚠ ${this.data.warnings.length} warning${this.data.warnings.length === 1 ? "" : "s"} · open details or inspect files for malformed data`));
		}
		lines.push(sectionTitle(safeWidth, this.detail ? "Detail" : viewLabel(this.currentView())));
		if (this.data.empty) {
			lines.push(...wrapLines(safeWidth, "No memory telemetry, entries, or benchmark reports are available yet. Data will appear after observed turns, `/memory stats`, or `/memory benchmark` runs."));
			lines.push(line(safeWidth, "Tip: run `/memory stats` or `/memory benchmark` to generate dashboard data."));
			this.cachedLines = lines;
			this.cachedWidth = width;
			return lines;
		}
		if (this.detail) lines.push(...this.renderDetail(safeWidth, this.detail));
		else lines.push(...this.renderView(safeWidth, this.currentView()));
		lines.push(sectionTitle(safeWidth, "Keys"));
		lines.push(line(safeWidth, "←/→ tabs · ↑/↓ select · Enter details · Esc back/close · r refresh · o open report"));
		this.cachedLines = lines.map((item) => line(safeWidth, item));
		this.cachedWidth = width;
		return this.cachedLines;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}

	private async refresh(): Promise<void> {
		this.loadingMessage = "refreshing…";
		this.invalidate();
		try {
			this.data = await this.refreshData();
			this.lastRefreshMessage = `refreshed ${new Date().toLocaleTimeString()}`;
		} catch (error) {
			this.lastRefreshMessage = `refresh failed: ${error instanceof Error ? error.message : String(error)}`;
		} finally {
			this.loadingMessage = undefined;
			this.detail = undefined;
			this.invalidate();
		}
	}

	private currentView(): DashboardView {
		return this.views[this.viewIndex];
	}

	private itemCount(view: DashboardView): number {
		if (view === "benchmarks") return this.data.benchmarks.length;
		if (view === "memories") return this.data.memories.length;
		if (view === "turns") return this.data.turns.length;
		return 0;
	}

	private renderView(width: number, view: DashboardView): string[] {
		if (view === "overview") return this.renderOverview(width);
		const maxLines = this.renderOverview(width).length;
		if (view === "benchmarks") return this.renderBenchmarkList(width, maxLines);
		if (view === "memories") return this.renderMemoryList(width, maxLines);
		return this.renderTurnList(width, maxLines);
	}

	private renderOverview(width: number): string[] {
		const overview = this.data.overview;
		const barWidth = Math.min(22, Math.max(8, width - 36));
		const lines = [
			sectionTitle(width, "Memory effectiveness"),
			...cardLines(width, [
				["Observed turns", formatInteger(overview.observedTurns)],
				["Hit rate", formatPercent(overview.memoryHitRate), asciiBar(overview.memoryHitRate, barWidth)],
				["Total hits", formatInteger(overview.totalMemoryHits)],
				["Injected tokens", formatInteger(overview.injectedTokens)],
				["Avoided tokens", formatInteger(overview.estimatedAvoidedTokens), "estimated"],
				["Net savings", formatDelta(overview.estimatedNetSavedTokens, " tokens"), "estimated"],
			]),
			sectionTitle(width, "Provider usage"),
			...cardLines(width, [
				["Input tokens", formatInteger(overview.providerUsage.inputTokens)],
				["Output tokens", formatInteger(overview.providerUsage.outputTokens)],
				["Cache tokens", formatInteger(overview.providerUsage.cacheTokens)],
				["Total tokens", formatInteger(overview.providerUsage.totalTokens)],
				["Cost", formatCost(overview.providerUsage.costUsd)],
			]),
			sectionTitle(width, "Latest benchmark"),
		];
		if (overview.latestBenchmark) {
			lines.push(...cardLines(width, [
				["Run", overview.latestBenchmark.id, overview.latestBenchmark.model ? badge(overview.latestBenchmark.model) : ""],
				["Token delta", formatDelta(overview.latestBenchmark.deltas.totalTokens, " tokens")],
				["Cost delta", formatCostDelta(overview.latestBenchmark.deltas.costUsd)],
				["Quality", overview.latestBenchmark.qualitySummary ?? "unknown"],
			]));
		} else {
			lines.push(line(width, "│ No benchmark reports found."));
		}
		return lines;
	}

	private renderBenchmarkList(width: number, maxLines: number): string[] {
		if (!this.data.benchmarks.length) return wrapLines(width, "No benchmark runs found. Run `/memory benchmark` to generate local reports.").slice(0, maxLines);
		const page = paginateItems(this.data.benchmarks, this.selected.benchmarks, maxLines);
		return [
			pageHeader(width, "Benchmark runs", page, this.data.benchmarks.length),
			...page.pageItems.map(({ item: benchmark, index }) => {
				const selected = index === this.selected.benchmarks;
				return line(width, `${selectedPrefix(selected)} ${benchmark.timestamp ?? benchmark.id}  ${benchmark.model ? badge(benchmark.model) : ""}  Δtokens ${formatDelta(benchmark.deltas.totalTokens)}  Δcost ${formatCostDelta(benchmark.deltas.costUsd)}  Δtools ${formatDelta(benchmark.deltas.toolCalls)}  ${benchmark.qualitySummary ?? "quality unknown"}`);
			}),
		];
	}

	private renderMemoryList(width: number, maxLines: number): string[] {
		if (!this.data.memories.length) return wrapLines(width, "No memory entries found in SQLite or inspection exports yet.").slice(0, maxLines);
		const page = paginateItems(this.data.memories, this.selected.memories, maxLines);
		return [
			pageHeader(width, "Useful memories", page, this.data.memories.length),
			...page.pageItems.map(({ item: memory, index }) => {
				const selected = index === this.selected.memories;
				const stale = memory.stale ? badge("stale") : badge("fresh");
				return line(width, `${selectedPrefix(selected)} ${memory.id}  ${badge(`${memory.type ?? "memory"}/${memory.sourceKind ?? "unknown"}`)} ${stale}  hits ${memory.hitCount}  avoided ~${formatInteger(memory.estimatedAvoidedTokens)}t  ${memory.text}`);
			}),
		];
	}

	private renderTurnList(width: number, maxLines: number): string[] {
		if (!this.data.turns.length) return wrapLines(width, "No recent turn telemetry found. Turns will appear after stats telemetry is recorded.").slice(0, maxLines);
		const page = paginateItems(this.data.turns, this.selected.turns, maxLines);
		return [
			pageHeader(width, "Recent turns", page, this.data.turns.length),
			...page.pageItems.map(({ item: turn, index }) => {
				const selected = index === this.selected.turns;
				return line(width, `${selectedPrefix(selected)} ${turn.timestamp ?? turn.id}  hits ${turn.memoryHitCount}  card ${formatInteger(turn.cardTokens)}t  provider ${formatInteger(turn.providerUsage.totalTokens)}t  tools ${formatInteger(turn.toolCount)}  ${formatDuration(turn.durationMs)}  ${formatCost(turn.costUsd ?? turn.providerUsage.costUsd)}  ${turn.promptSummary ?? "no prompt summary"}`);
			}),
		];
	}

	private renderDetail(width: number, detail: { view: DashboardView; index: number }): string[] {
		if (detail.view === "benchmarks") return this.renderBenchmarkDetail(width, this.data.benchmarks[detail.index]);
		if (detail.view === "memories") return this.renderMemoryDetail(width, this.data.memories[detail.index]);
		if (detail.view === "turns") return this.renderTurnDetail(width, this.data.turns[detail.index]);
		return this.renderOverview(width);
	}

	private renderBenchmarkDetail(width: number, benchmark?: BenchmarkRunSummary): string[] {
		if (!benchmark) return [line(width, "Benchmark not found.")];
		const metric = (label: string, key: keyof BenchmarkMetricSummary, formatter: (value?: number) => string = formatInteger) => line(width, `${label}: baseline ${formatter(benchmark.baseline[key])} · memory ${formatter(benchmark.memoryAssisted[key])} · delta ${key === "costUsd" ? formatCostDelta(benchmark.deltas[key]) : formatDelta(benchmark.deltas[key])}`);
		return [
			line(width, `Benchmark ${benchmark.id} ${benchmark.model ? badge(benchmark.model) : ""}`),
			line(width, `Timestamp: ${benchmark.timestamp ?? "unknown"}`),
			metric("Input tokens", "inputTokens"),
			metric("Output tokens", "outputTokens"),
			metric("Cache tokens", "cacheTokens"),
			metric("Total tokens", "totalTokens"),
			metric("Cost", "costUsd", formatCost),
			metric("Latency", "latencyMs", formatDuration),
			metric("Tool calls", "toolCalls"),
			metric("Memory hits", "memoryHits"),
			metric("Injected tokens", "injectedTokens"),
			metric("Estimated avoided", "estimatedAvoidedTokens"),
			line(width, `Quality: ${benchmark.qualitySummary ?? "unknown"}`),
			line(width, benchmark.markdownReportPath ? `Press o to open Markdown report: ${benchmark.markdownReportPath}` : "No Markdown report found for this run."),
			...benchmark.warnings.flatMap((warning) => wrapLines(width, `Warning: ${warning}`)),
		];
	}

	private renderMemoryDetail(width: number, memory?: MemoryEntrySummary): string[] {
		if (!memory) return [line(width, "Memory entry not found.")];
		return [
			line(width, `Memory ${memory.id} ${memory.type ? badge(memory.type) : ""} ${memory.sourceKind ? badge(memory.sourceKind) : ""} ${memory.stale ? badge("stale") : ""}`),
			summaryRow(width, "Hit count", formatInteger(memory.hitCount)),
			summaryRow(width, "Estimated avoided", `${formatInteger(memory.estimatedAvoidedTokens)} tokens`),
			summaryRow(width, "Last used", memory.lastUsedAt ?? "never"),
			summaryRow(width, "Tags", memory.tags.join(", ") || "none"),
			summaryRow(width, "Metadata", memory.metadata.join(", ") || "none"),
			summaryRow(width, "Source", memory.source?.path ?? memory.source?.command ?? "unknown"),
			"",
			...wrapLines(width, memory.text),
		];
	}

	private renderTurnDetail(width: number, turn?: RecentTurnSummary): string[] {
		if (!turn) return [line(width, "Turn not found.")];
		return [
			line(width, `Turn ${turn.id}`),
			summaryRow(width, "Timestamp", turn.timestamp ?? "unknown"),
			summaryRow(width, "Prompt", turn.promptSummary ?? "not recorded"),
			summaryRow(width, "Selected memory IDs", turn.selectedMemoryIds.join(", ") || "none"),
			summaryRow(width, "Memory hits", formatInteger(turn.memoryHitCount)),
			summaryRow(width, "Card tokens", formatInteger(turn.cardTokens)),
			summaryRow(width, "Provider", [turn.providerUsage.provider, turn.providerUsage.model].filter(Boolean).join("/") || "unknown"),
			summaryRow(width, "Provider tokens", `${formatInteger(turn.providerUsage.inputTokens)} in / ${formatInteger(turn.providerUsage.outputTokens)} out / ${formatInteger(turn.providerUsage.totalTokens)} total`),
			summaryRow(width, "Tool count", formatInteger(turn.toolCount)),
			summaryRow(width, "Latency", formatDuration(turn.durationMs)),
			summaryRow(width, "Cost", formatCost(turn.costUsd ?? turn.providerUsage.costUsd)),
			summaryRow(width, "Estimated avoided", `${formatInteger(turn.estimatedAvoidedTokens)} tokens`),
			summaryRow(width, "Estimated net savings", formatDelta(turn.estimatedNetSavedTokens, " tokens")),
			"",
			line(width, "Tools"),
			...(turn.toolSummaries.length ? turn.toolSummaries.flatMap((tool) => wrapLines(width, `- ${tool}`)) : [line(width, "No tool summaries recorded.")]),
			...turn.warnings.flatMap((warning) => wrapLines(width, `Warning: ${warning}`)),
		];
	}
}

async function showMemoryDashboard(ctx: ExtensionContext): Promise<void> {
	if (!ctx.hasUI) {
		console.log("/memory dashboard requires an interactive pi UI. For non-interactive inspection, use /memory stats or inspect .pi/memory/benchmarks reports.");
		return;
	}
	let data = await loadDashboardData(ctx);
	await ctx.ui.custom((_tui, _theme, _keybindings, done) => new MemoryDashboardComponent(
		data,
		async () => {
			data = await loadDashboardData(ctx);
			return data;
		},
		(path) => {
			void readFile(path, "utf8")
				.then((content) => ctx.ui.editor(`Benchmark Report: ${basename(dirname(path))}`, content))
				.catch((error) => ctx.ui.notify(`Could not open benchmark report: ${error instanceof Error ? error.message : String(error)}`, "warning"));
		},
		() => done(undefined),
	));
}

export default function memorySystem(pi: ExtensionAPI) {
	let lastInjection: { ids: string[]; estimatedTokens: number; estimatedAvoidedTokens?: number; estimatedNetSavedTokens?: number; enabled?: boolean } = { ids: [], estimatedTokens: 0, enabled: true };
	let activeTurnId = telemetryTurnId(undefined);
	const turnStarts = new Map<string, number>();
	const turnTools = new Map<string, ToolTelemetry[]>();
	const turnProviderUsage = new Map<string, ProviderUsageTelemetry>();

	pi.on("session_start", async (event, ctx) => {
		try {
			await ensureMemoryDirs(ctx);
			await readEntries(ctx);
			if (event.reason === "startup" || event.reason === "reload") await refreshAll(pi, ctx);
			ctx.ui.setStatus("memory", "memory: ready");
		} catch (error) {
			ctx.ui.notify(`Memory startup failed open: ${error instanceof Error ? error.message : String(error)}`, "warning");
		}
	});

	pi.registerCommand("memory", {
		description: "Inspect, pin, forget, refresh, diagnose, show status, stats, dashboard, or benchmark global and repository memory",
		getArgumentCompletions: (prefix) => ["show", "global", "repo", "session", "all", "status", "stats", "benchmark", "pin", "forget", "refresh", "doctor", "health", "export", "clear-generated", "dashboard"].filter((s) => s.startsWith(prefix)).map((value) => ({ value, label: value })),
		handler: async (args, ctx) => {
			const tokens = args.trim() ? args.trim().split(/\s+/) : [];
			const [subcommand = "show", ...rest] = tokens;
			await ensureMemoryDirs(ctx);
			if (subcommand === "dashboard") {
				await showMemoryDashboard(ctx);
				return;
			}
			if (subcommand === "stats") {
				const output = await renderMemoryStats(ctx);
				if (ctx.hasUI && output.length > 900) await ctx.ui.editor("Memory stats", output);
				else if (ctx.hasUI) ctx.ui.notify(output.replace(/\n+/g, " ").slice(0, 700), "info");
				else console.log(output);
				return;
			}
			if (subcommand === "benchmark") {
				const parsed = parseBenchmarkArgs(rest);
				if (ctx.hasUI && parsed.mode !== "dry-run" && !parsed.confirm) {
					ctx.ui.notify(`Memory benchmark will run ${parsed.requestLimit ?? 10} requests twice with model ${parsed.model}. Re-run /memory benchmark --yes to confirm, or /memory benchmark --dry-run to only create artifacts.`, "warning");
					return;
				}
				const reportPath = await runMemoryBenchmark(ctx, rest);
				if (ctx.hasUI) {
					ctx.ui.notify(`Memory benchmark report written: ${reportPath}`, "info");
					await ctx.ui.editor(`Memory benchmark ${basename(dirname(reportPath))}`, await readFile(reportPath, "utf8"));
				} else {
					console.log(`Memory benchmark report written: ${reportPath}`);
				}
				return;
			}
			if (subcommand === "pin") {
				const parsed = parseScopeArg(rest);
				const text = parsed.rest.join(" ").trim();
				if (!text) {
					const usage = "Usage: /memory pin [global|repo] <preference or durable note>";
					if (ctx.hasUI) ctx.ui.notify(usage, "warning");
					else console.log(usage);
					return;
				}
				const scope = parsed.scope === "repo" ? "repo" : parsed.scope === "session" ? "session" : "global";
				const entry = await addEntry(ctx, { type: "preference", scope, sourceKind: "pinned", text, tags: ["preference", scope], quality: "high", lifecycle: "durable", classification: "preference" });
				if (scope === "global") await appendMarkdown(preferencesPath(ctx), `\n- ${text} <!-- id:${entry.id} -->\n`);
				if (ctx.hasUI) ctx.ui.notify(`Pinned ${scope} memory ${entry.id}`, "info");
				else console.log(`Pinned ${scope} memory ${entry.id}`);
				return;
			}
			if (subcommand === "forget") {
				const id = rest[0];
				if (!id) {
					const usage = "Usage: /memory forget <entry-id>";
					if (ctx.hasUI) ctx.ui.notify(usage, "warning");
					else console.log(usage);
					return;
				}
				const entry = await forgetEntry(ctx, id);
				if (!entry) {
					if (ctx.hasUI) ctx.ui.notify(`Memory entry not found: ${id}`, "warning");
					else console.log(`Memory entry not found: ${id}`);
					return;
				}
				await writeHumanFiles(ctx, await readEntries(ctx));
				if (ctx.hasUI) ctx.ui.notify(`Forgot memory ${id}`, "info");
				else console.log(`Forgot memory ${id}`);
				return;
			}
			if (subcommand === "refresh") {
				await refreshAll(pi, ctx);
				if (ctx.hasUI) ctx.ui.notify("Memory refreshed", "info");
				else console.log("Memory refreshed");
				return;
			}
			if (subcommand === "clear-generated") {
				const parsed = parseScopeArg(rest);
				if (!parsed.rest.includes("--confirm")) {
					const usage = "Usage: /memory clear-generated [global|repo|session|all] --confirm (marks generated entries forgotten in the selected scope; pinned preferences are preserved)";
					if (ctx.hasUI) ctx.ui.notify(usage, "warning");
					else console.log(usage);
					return;
				}
				const count = await clearGeneratedMemory(ctx, parsed.scope);
				if (ctx.hasUI) ctx.ui.notify(`Marked ${count} generated memory entries forgotten`, "info");
				else console.log(`Marked ${count} generated memory entries forgotten`);
				return;
			}
			if (subcommand === "export") {
				const store = await getMemoryStore(ctx);
				await store.exportInspectionFiles();
				const message = `Memory export written for inspection only (SQLite remains canonical): ${memoryExportJsonPath(ctx)} and ${memoryExportMarkdownPath(ctx)}`;
				if (ctx.hasUI) ctx.ui.notify(message, "info");
				else console.log(message);
				return;
			}
			if (subcommand === "doctor" || subcommand === "health") {
				const report = await analyzeHealth(ctx, lastInjection);
				const output = renderHealthReport(report);
				if (ctx.hasUI && output.length > 800) await ctx.ui.editor("Memory health", output);
				else if (ctx.hasUI) ctx.ui.notify(`Memory health: ${report.counts.active} active, ${report.counts.suspectedJunk} junk, ${report.duplicates.length} duplicate groups`, report.storage.valid ? "info" : "warning");
				else console.log(output);
				return;
			}
			const scopeSelection = parseScopeArg(subcommand === "show" || subcommand === "status" ? rest : subcommand === "global" || subcommand === "repo" || subcommand === "session" || subcommand === "all" ? [subcommand, ...rest] : []);
			const entries = subcommand === "show" || subcommand === "status" || ["global", "repo", "session", "all"].includes(subcommand) ? await (await getMemoryStore(ctx)).listEntries({ scope: scopeSelection.scope }) : await updateStaleness(ctx);
			if (subcommand === "status") {
				const storage = await (await getMemoryStore(ctx)).storageHealth();
				const telemetry = await loadTelemetryTurns(ctx);
				const benchmarks = await loadBenchmarkRuns(ctx);
				const latestReport = benchmarks.benchmarks[0]?.markdownReportPath;
				const status = `Memory: ${entries.filter((e) => !e.forgottenAt && e.sourceKind !== "forgotten").length} active entries visible in current scope; global ${entries.filter((e) => e.scope === "global").length}, repo ${entries.filter((e) => e.scope === "repo").length}, session ${entries.filter((e) => e.scope === "session").length}; SQLite ${storage.dbPath ?? memoryDbPath(ctx)}; schema ${storage.schemaVersion ?? "unknown"}; migration ${storage.migrationStatus ?? "unknown"}; last injection ${lastInjection.ids.length} entries/~${lastInjection.estimatedTokens} tokens (enabled ${lastInjection.enabled !== false ? "yes" : "no"}); recent telemetry ${telemetry.exists ? `${telemetry.turns.length} turns available` : "not available"}; use /memory stats${latestReport ? `; latest benchmark ${latestReport}` : " or /memory benchmark"}`;
				if (ctx.hasUI) ctx.ui.notify(status, "info");
				else console.log(status);
				return;
			}
			const output = groupEntries(entries);
			if (ctx.hasUI) await ctx.ui.editor(`Memory (${scopeSelection.scope ?? "current"})`, output);
			else console.log(output);
		},
	});

	pi.on("before_agent_start", async (event, ctx) => {
		try {
			const entries = await updateStaleness(ctx);
			const enabled = memoryInjectionEnabled();
			const selected = enabled ? selectMemoryCard(event.prompt, entries, defaultConfig) : { card: "", ids: [], estimatedTokens: 0 };
			const savings = estimateSavings(entries, selected.ids, selected.estimatedTokens);
			lastInjection = { ids: selected.ids, estimatedTokens: selected.estimatedTokens, ...savings, enabled };
			const telemetry: MemoryInjectionTelemetry = { eventType: "memory_injection", timestamp: nowIso(), turnId: activeTurnId, ...currentBenchmarkTags(), memoryEnabled: enabled, selectedMemoryIds: selected.ids, memoryHitCount: selected.ids.length, cardCharacters: selected.card.length, estimatedCardTokens: selected.estimatedTokens, ...savings, promptSummary: summarizePrompt(event.prompt) };
			await recordTelemetry(ctx, telemetry);
			if (enabled && selected.ids.length > 0) {
				await recordEntryUsage(ctx, selected.ids);
			}
			ctx.ui.setStatus("memory", enabled ? `memory: ${selected.ids.length}/~${selected.estimatedTokens}t` : "memory: disabled");
			if (!enabled || selected.ids.length === 0) return;
			return { message: { customType: "memory-card", content: selected.card, display: true, details: { ...selected, ...savings, memoryEnabled: enabled } } };
		} catch (error) {
			ctx.ui.notify(`Memory injection skipped: ${error instanceof Error ? error.message : String(error)}`, "warning");
			return;
		}
	});

	pi.on("turn_start", async (event, ctx) => {
		const turnIndex = (event as { turnIndex?: number }).turnIndex;
		activeTurnId = telemetryTurnId(turnIndex, Date.now().toString(36));
		turnStarts.set(activeTurnId, Date.now());
		turnTools.set(activeTurnId, []);
		await recordTelemetry(ctx, { eventType: "turn_start", timestamp: nowIso(), turnId: activeTurnId, turnIndex, ...currentBenchmarkTags() });
	});

	pi.on("message_end", async (event, ctx) => {
		const message = (event as { message?: unknown }).message as { role?: string } | undefined;
		if (message?.role !== "assistant") return;
		const providerUsage = extractProviderUsage(message);
		turnProviderUsage.set(activeTurnId, mergeProviderUsage(turnProviderUsage.get(activeTurnId) ?? {}, providerUsage));
		await recordTelemetry(ctx, { eventType: "message_end", timestamp: nowIso(), turnId: activeTurnId, ...currentBenchmarkTags(), providerUsage });
	});

	pi.on("before_provider_request", async (event, ctx) => {
		const payload = (event as { payload?: unknown }).payload;
		const payloadCharacters = safeJsonSummary(payload, 20_000).length;
		await recordTelemetry(ctx, { eventType: "provider_request", timestamp: nowIso(), turnId: activeTurnId, ...currentBenchmarkTags(), payloadCharacters, estimatedPayloadTokens: Math.ceil(payloadCharacters / 4) });
	});

	pi.on("after_provider_response", async (event, ctx) => {
		const e = event as { status?: number; headers?: Record<string, string> };
		await recordTelemetry(ctx, { eventType: "provider_response", timestamp: nowIso(), turnId: activeTurnId, ...currentBenchmarkTags(), status: e.status, responseMetadata: e.headers ? Object.fromEntries(Object.entries(e.headers).slice(0, 8)) : undefined });
	});

	pi.on("tool_call", async (event, ctx) => {
		const e = event as { toolCallId?: string; toolName: string; input?: unknown };
		const tool = { toolCallId: e.toolCallId, toolName: e.toolName, ...summarizeToolInput(e.toolName, e.input) };
		turnTools.set(activeTurnId, [...(turnTools.get(activeTurnId) ?? []), tool]);
		await recordTelemetry(ctx, { eventType: "tool_call", timestamp: nowIso(), turnId: activeTurnId, ...currentBenchmarkTags(), tool });
	});

	pi.on("turn_end", async (event, ctx) => {
		const e = event as { turnIndex?: number };
		const started = turnStarts.get(activeTurnId);
		const tools = turnTools.get(activeTurnId) ?? [];
		const providerUsage = turnProviderUsage.get(activeTurnId);
		const summary: TurnTelemetrySummary = { eventType: "turn_end", timestamp: nowIso(), turnId: activeTurnId, turnIndex: e.turnIndex, ...currentBenchmarkTags(), startedAt: started ? new Date(started).toISOString() : undefined, endedAt: nowIso(), durationMs: started ? Date.now() - started : undefined, selectedMemoryIds: lastInjection.ids, memoryHitCount: lastInjection.ids.length, cardTokens: lastInjection.estimatedTokens, estimatedAvoidedTokens: lastInjection.estimatedAvoidedTokens, estimatedNetSavedTokens: lastInjection.estimatedNetSavedTokens, toolCount: tools.length, toolSummaries: tools.map((tool) => `${tool.toolName}${tool.commandSummary ? `: ${tool.commandSummary}` : tool.readPaths?.length ? `: ${tool.readPaths.join(", ")}` : ""}`).slice(0, 12), providerUsage };
		await recordTelemetry(ctx, summary);
	});

	pi.on("tool_result", async (event, ctx) => {
		const text = textFromContent(event.content);
		const e = event as { toolCallId?: string; toolName: string; content?: unknown; isError?: boolean };
		const tool = { toolCallId: e.toolCallId, toolName: e.toolName, isError: e.isError, ...summarizeToolResult(e.content) };
		turnTools.set(activeTurnId, [...(turnTools.get(activeTurnId) ?? []), tool]);
		await recordTelemetry(ctx, { eventType: "tool_result", timestamp: nowIso(), turnId: activeTurnId, ...currentBenchmarkTags(), tool });
		if (text.length < 2000 || currentBenchmarkTags().benchmarkRunId) return;
		const summary = clip(`Tool ${event.toolName} produced a large result: ${text.slice(0, 700)}`);
		await addEntry(ctx, {
			type: "tool",
			scope: "repo",
			sourceKind: "observed",
			text: summary,
			tags: ["tool", event.toolName],
			quality: "medium",
			lifecycle: "temporary",
			expiresAt: addDaysIso(14),
			source: { command: event.toolName, resultHash: hashText(text), commandHash: hashText(text), dependencyHashes: {} },
		});
	});

	pi.on("agent_end", async (event, ctx) => {
		try {
			if (currentBenchmarkTags().benchmarkRunId) return;
			const entries = await readEntries(ctx);
			const candidates = extractTurnMemory((event as { messages?: unknown[] }).messages ?? [], entries);
			for (const candidate of candidates) {
				if (candidate.quality === "suspected-junk") {
					await addEntry(ctx, {
						type: "session",
						scope: "repo",
						sourceKind: "rejected",
						text: candidate.text,
						tags: ["session", "rejected", candidate.classification],
						quality: "suspected-junk",
						reasonRejected: candidate.reasonRejected,
						classification: candidate.classification,
						lifecycle: "temporary",
						expiresAt: addDaysIso(7),
					});
					continue;
				}
				await addEntry(ctx, {
					type: "session",
					scope: "repo",
					sourceKind: "inferred",
					text: candidate.text,
					tags: ["session", "inferred", candidate.classification],
					quality: candidate.quality,
					classification: candidate.classification,
					lifecycle: "temporary",
					expiresAt: addDaysIso(INFERRED_TTL_DAYS),
				});
			}
		} catch (error) {
			ctx.ui.notify(`Memory extraction skipped: ${error instanceof Error ? error.message : String(error)}`, "warning");
		}
	});

	pi.on("session_before_compact", async (event, ctx) => {
		const entries = await updateStaleness(ctx);
		const selected = selectMemoryCard("openspec compaction active change current task decisions blockers validation next steps", entries, {
			...defaultConfig,
			tokenBudget: 1400,
		});
		const prep = event.preparation;
		const summary = [
			"## OpenSpec-aware Compaction Summary",
			"Memory is orientation, not authority; read exact files before edits or exact claims.",
			prep.previousSummary ? `\n## Previous Summary\n${prep.previousSummary}` : "",
			`\n## Preserved Workflow Memory\n${selected.card}`,
			`\n## Validation and Files\n- Tokens before compaction: ${prep.tokensBefore}\n- Read files: ${(prep.fileOps?.readFiles ?? []).join(", ") || "unknown"}\n- Modified files: ${(prep.fileOps?.modifiedFiles ?? []).join(", ") || "unknown"}`,
			"\n## Next Steps\nContinue from the latest user request, verify current files with tools, and preserve active OpenSpec change/task state.",
		]
			.filter(Boolean)
			.join("\n");
		return { compaction: { summary, firstKeptEntryId: prep.firstKeptEntryId, tokensBefore: prep.tokensBefore, details: { memoryIds: selected.ids } } };
	});
}
