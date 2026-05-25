import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, readdir, realpath, rename, stat, writeFile } from "node:fs/promises";
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
const STATS_FILE = "stats.jsonl";
const FILE_SUMMARIES_FILE = "file-summaries.json";
const OPEN_SPEC_INDEX_FILE = "openspec-index.json";
const REPO_FILE = "repo.md";
const PREFERENCES_FILE = "preferences.md";
const DEFAULT_TOKEN_BUDGET = 900;
const MAX_ENTRY_TEXT = 1200;
const INFERRED_TTL_DAYS = 30;
const MAX_STORED_ENTRIES = 300;

export interface SourceRef {
	path?: string;
	mtimeMs?: number;
	sha256?: string;
	command?: string;
	commandHash?: string;
	resultHash?: string;
	dependencyHashes?: Record<string, string | undefined>;
	relatedFiles?: string[];
	relatedChange?: string;
	savedBy?: string;
}

export type MemoryType = "preference" | "repo" | "openspec" | "session" | "tool";
export type MemorySourceKind = "pinned" | "agent-saved" | "observed" | "inferred" | "rejected" | "forgotten";
export type MemoryQuality = "high" | "medium" | "low" | "suspected-junk";
export type MemoryLifecycle = "durable" | "temporary" | "expired";
export type MemoryClassification = "preference" | "decision" | "blocker" | "assumption" | "next-step";
export type MemoryScope = "global" | "repo" | "session";
type RepositoryDiscovery = "git" | "openspec" | "cwd" | "none";
type RecoveryState = "none" | "primary-valid" | "backup" | "subset" | "empty";

export interface MemoryEntry {
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

export interface MemoryConfig {
	tokenBudget: number;
	maxEntriesPerCard: number;
}

interface FileSummaryRecord {
	repoKey: string;
	repoRoot: string;
	path: string;
	contentHash: string;
	summary: string;
	source: "read-derived";
	createdAt: string;
	updatedAt: string;
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

type MemoryTelemetryEventType = "memory_injection" | "memory_query" | "memory_save" | "turn_start" | "turn_end" | "message_end" | "tool_call" | "tool_result" | "provider_request" | "provider_response";

interface MemoryTelemetryBase {
	eventType: MemoryTelemetryEventType;
	timestamp: string;
	turnId: string;
	turnIndex?: number;
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
	effectiveIntentSummary?: string;
	selectionReason?: string;
	injectionPhase?: "session_start_boot" | "per_turn_skipped" | "disabled";
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
	effectiveIntentSummary?: string;
	selectionReason?: string;
	injectionPhase?: "session_start_boot" | "per_turn_skipped" | "disabled";
	query?: Record<string, unknown>;
	resultCount?: number;
	savedMemoryId?: string;
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

interface MemoryActivityCounters {
	queries: number;
	results: number;
	writes: number;
}

function renderMemoryActivityStatus(counters: MemoryActivityCounters): string {
	return `mem q${counters.queries}/r${counters.results}/w${counters.writes}`;
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

function globalStatsPath(_ctx: ExtensionContext): string {
	return globalMemoryRootPath(STATS_FILE);
}

function fileSummariesPath(_ctx: ExtensionContext): string {
	return globalMemoryRootPath(FILE_SUMMARIES_FILE);
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

function isExpired(entry: MemoryEntry, now = Date.now()): boolean {
	if (entry.sourceKind === "pinned") return false;
	return Boolean(entry.expiresAt && Date.parse(entry.expiresAt) <= now);
}

export function isProtectedMemoryEntry(entry: MemoryEntry): boolean {
	if (entry.forgottenAt || entry.sourceKind === "forgotten" || entry.lifecycle === "expired" || isExpired(entry)) return false;
	if (entry.scope === "global" && entry.sourceKind === "pinned") return true;
	return entry.sourceKind === "agent-saved" && entry.lifecycle === "durable" && entry.quality === "high";
}

function prunePriority(entry: MemoryEntry): number {
	if (entry.sourceKind === "forgotten" || entry.forgottenAt) return 100;
	if (entry.lifecycle === "expired" || isExpired(entry)) return 95;
	if (entry.sourceKind === "rejected" || entry.reasonRejected) return 90;
	if (entry.duplicateOf) return 85;
	if (entry.quality === "suspected-junk") return 80;
	if (entry.stale) return 75;
	if (entry.quality === "low") return 65;
	if (entry.sourceKind === "observed" || entry.sourceKind === "inferred") return 50;
	if (entry.type === "tool") return 45;
	return 10;
}

export function planPrunedMemoryEntryIds(entries: MemoryEntry[], maxEntries = MAX_STORED_ENTRIES): string[] {
	if (entries.length <= maxEntries) return [];
	const createdAscending = (a: MemoryEntry, b: MemoryEntry) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id);
	const byPruneValue = (a: MemoryEntry, b: MemoryEntry) => prunePriority(b) - prunePriority(a) || createdAscending(a, b);
	const protectedIds = new Set(entries.filter(isProtectedMemoryEntry).map((entry) => entry.id));
	const selected = new Set<string>();
	const choose = (candidates: MemoryEntry[]) => {
		for (const entry of candidates) {
			if (entries.length - selected.size <= maxEntries) break;
			selected.add(entry.id);
		}
	};
	choose(entries.filter((entry) => !protectedIds.has(entry.id) && prunePriority(entry) >= 45).sort(byPruneValue));
	choose(entries.filter((entry) => !protectedIds.has(entry.id) && !selected.has(entry.id)).sort(createdAscending));
	choose(entries.filter((entry) => !selected.has(entry.id)).sort(createdAscending));
	return [...selected];
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

async function findInitializedOpenSpecRoot(start: string): Promise<string | undefined> {
	let current = await canonicalPath(start);
	while (true) {
		if (existsSync(join(current, "openspec", "config.yaml"))) return current;
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
	close(): void;
}

class SqliteMemoryStore implements MemoryStore {
	private journalMode = "unknown";
	private closed = false;
	private readonly ctx: ExtensionContext;
	private readonly db: SqliteDatabase;
	private readonly repo?: RepositoryInfo;

	constructor(ctx: ExtensionContext, db: SqliteDatabase, repo?: RepositoryInfo) {
		this.ctx = ctx;
		this.db = db;
		this.repo = repo;
	}

	initialize(): void {
		this.assertOpen();
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
		this.assertOpen();
		await this.importLegacyJsonIfNeeded();
		await this.importLegacySqliteIfNeeded();
	}

	close(): void {
		if (this.closed) return;
		this.closed = true;
		try {
			this.db.close();
		} catch {
			// Shutdown cleanup is best-effort and must tolerate repeated or racing teardown.
		}
	}

	isClosed(): boolean {
		return this.closed;
	}

	private assertOpen(): void {
		if (this.closed) throw new Error("Memory store is closed");
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
		const prunedIds = planPrunedMemoryEntryIds(this.selectEntries({ includeAll: true }), MAX_STORED_ENTRIES);
		if (prunedIds.length === 0) return;
		const deleteEntry = this.db.prepare("DELETE FROM entries WHERE id = ?");
		for (const id of prunedIds) deleteEntry.run(id);
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

function closeMemoryStores(): void {
	for (const store of stores.values()) store.close();
	stores.clear();
}

async function getMemoryStore(ctx: ExtensionContext): Promise<MemoryStore> {
	const repo = await discoverRepository(ctx);
	await ensureMemoryDirs(ctx, repo);
	const key = `${memoryDbPath(ctx)}:${repo?.key ?? "no-repo"}`;
	let store = stores.get(key);
	if (!store || store.isClosed()) {
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

async function writeHumanFiles(ctx: ExtensionContext, entries: MemoryEntry[]): Promise<void> {
	const prefs = entries
		.filter((e) => e.type === "preference" && e.sourceKind === "pinned" && !e.forgottenAt)
		.map((e) => `- ${e.text} <!-- id:${e.id} -->`)
		.join("\n");
	await ensureMemoryDirs(ctx, await discoverRepository(ctx));
	await writeFile(preferencesPath(ctx), `# Pinned Global Memory\n\n${prefs || "_No pinned memory._"}\n`, "utf8");
}

async function refreshOpenSpecIndex(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	const openSpecRoot = await findInitializedOpenSpecRoot(ctx.cwd);
	if (!openSpecRoot) return;
	await ensureMemoryDirs(ctx);
	const result = await pi.exec("openspec", ["list", "--json"], { cwd: openSpecRoot, timeout: 10_000 });
	const raw = result.stdout || result.stderr || "{}";
	let parsed: unknown = {};
	try {
		parsed = JSON.parse(raw);
	} catch {
		parsed = { error: "Failed to parse openspec list output", raw: clip(raw, 2000) };
	}
	const resultHash = hashText(raw);
	const sourcePath = join(openSpecRoot, "openspec", "config.yaml");
	const index = {
		generatedAt: nowIso(),
		command: "openspec list --json",
		cwd: openSpecRoot,
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

async function shouldRefreshRepoOrientation(repo: RepositoryInfo): Promise<boolean> {
	try {
		const info = await stat(repoFilePath(repo));
		return Date.now() - info.mtimeMs > 24 * 60 * 60 * 1000;
	} catch {
		return true;
	}
}

async function refreshRepoOrientation(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	const repo = await discoverRepository(ctx, { allowCwdFallback: false });
	if (!repo || !(await shouldRefreshRepoOrientation(repo))) return;
	await ensureMemoryDirs(ctx, repo);
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

function groupEntries(entries: MemoryEntry[]): string {
	const groups = new Map<string, MemoryEntry[]>();
	for (const entry of entries) {
		const derivedLabel = entry.migrationSource ? "legacy" : entry.tags?.some((tag) => /telemetry|stats|benchmark/i.test(tag)) ? "telemetry-derived" : entry.sourceKind === "observed" || entry.sourceKind === "inferred" ? "generated" : undefined;
		const labels = [entry.scope ?? "repo", entry.repoKey ? `repo:${entry.repoKey}` : undefined, entry.type, entry.sourceKind, derivedLabel, entry.stale ? "stale" : undefined, isExpired(entry) ? "expired" : undefined, entry.reasonRejected ? "rejected" : undefined, entry.forgottenAt || entry.sourceKind === "forgotten" ? "forgotten" : undefined, entry.quality, entry.duplicateOf ? "duplicate" : undefined].filter(Boolean).join("/");
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

export interface EffectiveIntent {
	query: string;
	fallbackUsed: boolean;
	removedBoilerplate: boolean;
}

export interface MemorySelectionResult {
	card: string;
	ids: string[];
	estimatedTokens: number;
	effectiveIntentSummary: string;
	selectionReason: string;
	eligibleCount: number;
}

const GENERIC_INTENT_TERMS = new Set([
	"tool", "tools", "read", "bash", "grep", "find", "file", "files", "command", "commands", "output", "result", "results", "workflow", "instructions", "guardrails", "context", "artifact", "artifacts", "schema", "status", "json", "implementation", "implement", "tasks", "task", "change", "openspec", "opsx", "memory", "repo", "repository",
]);

function usefulPromptTerms(prompt: string): Set<string> {
	return new Set((prompt.toLowerCase().match(/[a-z0-9_.\/-]{3,}/g) ?? []).filter((term) => !GENERIC_INTENT_TERMS.has(term) && !/^\d+$/.test(term)));
}

function stripMemoryCardEchoes(text: string): string {
	const lines = text.split("\n");
	const kept: string[] = [];
	let inMemoryCard = false;
	for (const line of lines) {
		if (/^\s*##\s+Memory \(orientation, not authority\)/i.test(line) || /^\s*###\s+(Global Memory|Current Repository Memory|Session Memory)\s*$/i.test(line)) {
			inMemoryCard = true;
			continue;
		}
		if (inMemoryCard && /^\s*#{1,2}\s+/.test(line) && !/^\s*##\s+Memory/i.test(line)) inMemoryCard = false;
		if (inMemoryCard) continue;
		if (/orientation card only|Read exact current files before edits|\(id:\s*(global|repo|session|tool|openspec)-[a-z0-9-]+\)/i.test(line)) continue;
		kept.push(line);
	}
	return kept.join("\n");
}

function isObviousBoilerplateLine(line: string): boolean {
	const trimmed = line.trim();
	if (!trimmed) return true;
	if (/^(```|<{1,2}\/?[a-z_-]+>|#{1,3}\s*(Tools|Guidelines|Guardrails|Steps|Output|Memory Integration|Fluid Workflow|Tool definitions|Available tools|Valid channels)\b)/i.test(trimmed)) return true;
	if (/^(You are an AI|You are an expert coding assistant|Current date:|Current working directory:|Knowledge cutoff:|Token Budget|Channel must|Tool calls|Use bash|Use read|Use edit|Use repo_graph|Treat repo_graph|Always read|Prefer repo_graph|Pause if:)/i.test(trimmed)) return true;
	if (/^(type|namespace)\s+[a-z0-9_.-]+|^\/\/|^[-*]\s+(Use|Read|Make|Keep|Run|Parse|Display|Show|Mark|Continue|Pause|Always|Prefer|Treat|Update|Preserve)\b/i.test(trimmed)) return true;
	if (/^(Input|Provided arguments|Steps|Output During Implementation|Output On Completion|Output On Pause)\b/i.test(trimmed)) return false;
	return false;
}

export function extractEffectiveIntent(prompt: string, max = 900): EffectiveIntent {
	const withoutCode = stripCodeBlocks(prompt);
	const withoutMemory = stripMemoryCardEchoes(withoutCode);
	const lines = withoutMemory.split("\n").map((line) => line.replace(/^\s*>\s?/, "").trim()).filter((line) => !isObviousBoilerplateLine(line));
	let query = lines.join(" ").replace(/\s+/g, " ").trim();
	query = query.replace(/\*\*Provided arguments\*\*:\s*/gi, "change ").replace(/Provided arguments:\s*/gi, "change ");
	const terms = usefulPromptTerms(query);
	if (query.length >= 12 && terms.size >= 1) {
		return { query: clip(query, max), fallbackUsed: false, removedBoilerplate: query.length < prompt.length };
	}
	const compact = summarizePrompt(withoutMemory || withoutCode || prompt, max);
	return { query: compact, fallbackUsed: true, removedBoilerplate: compact.length < prompt.length };
}

function automaticInjectionColdReason(entry: MemoryEntry): string | undefined {
	if (entry.forgottenAt || entry.sourceKind === "forgotten") return "forgotten";
	if (entry.sourceKind === "rejected" || entry.reasonRejected) return "rejected";
	if (entry.stale) return "stale";
	if (isExpired(entry) || entry.lifecycle === "expired") return "expired";
	if (entry.quality === "low" || entry.quality === "suspected-junk") return "low confidence";
	if (entry.sourceKind !== "pinned" && entry.type === "tool") return "tool-result summary";
	if (entry.type === "repo" && (entry.tags?.includes("orientation") || entry.source?.command === "find repo orientation")) return "repo-orientation scan";
	if (entry.tags?.some((tag) => /telemetry|stats|benchmark|tool-result|command-output/i.test(tag))) return "observability artifact";
	if (entry.sourceKind === "observed" && entry.source?.command && /^(bash|read|grep|rg|find|tool|command)/i.test(entry.source.command) && entry.type !== "openspec") return "command output summary";
	if (entry.sourceKind === "inferred" && entry.quality !== "high" && entry.quality !== "medium") return "low-confidence inferred";
	return undefined;
}

function memoryAgeDays(iso: string): number {
	const parsed = Date.parse(iso);
	if (!Number.isFinite(parsed)) return INFERRED_TTL_DAYS + 1;
	return Math.max(0, (Date.now() - parsed) / 86_400_000);
}

function isLikelyActiveWorkflowState(entry: MemoryEntry, intentQuery: string): boolean {
	return entry.type === "openspec" && /openspec|opsx|change|proposal|design|task|archive|spec|validation/i.test(intentQuery);
}

function isContinuationRelevant(entry: MemoryEntry): boolean {
	if (entry.type !== "session") return false;
	if (!entry.classification || !["decision", "blocker", "assumption", "next-step"].includes(entry.classification)) return false;
	return memoryAgeDays(entry.updatedAt || entry.createdAt) <= INFERRED_TTL_DAYS;
}

export function isAutomaticInjectionCandidate(entry: MemoryEntry, intentQuery = ""): boolean {
	if (automaticInjectionColdReason(entry)) return false;
	if (entry.sourceKind === "pinned") return true;
	if (entry.classification === "decision" && (entry.quality === "high" || entry.quality === "medium")) return true;
	if (isLikelyActiveWorkflowState(entry, intentQuery)) return true;
	if (isContinuationRelevant(entry)) return true;
	return false;
}

function scoreEntry(intent: EffectiveIntent, entry: MemoryEntry): number {
	const lowerIntent = intent.query.toLowerCase();
	const terms = usefulPromptTerms(intent.query);
	const entryText = `${entry.text} ${(entry.tags ?? []).join(" ")} ${entry.source?.path ?? ""} ${entry.source?.command ?? ""}`.toLowerCase();
	let score = 0;
	if (entry.sourceKind === "pinned") score += 140;
	if (entry.quality === "high") score += 12;
	if (entry.quality === "medium" || !entry.quality) score += 5;
	if (entry.classification === "decision") score += 45;
	if (entry.classification === "blocker" || entry.classification === "next-step") score += 25;
	if (isLikelyActiveWorkflowState(entry, intent.query)) score += 70;
	if (isContinuationRelevant(entry)) score += 18;
	for (const term of terms) {
		if (entryText.includes(term)) score += term.includes("/") || term.includes(".") ? 20 : 8;
	}
	if (entry.tags?.some((tag) => lowerIntent.includes(tag.toLowerCase()) && !GENERIC_INTENT_TERMS.has(tag.toLowerCase()))) score += 12;
	if (entry.hitCount) score += Math.min(entry.hitCount * 2, 10);
	score += Math.max(0, 10 - memoryAgeDays(entry.updatedAt || entry.createdAt));
	if (intent.fallbackUsed && entry.sourceKind !== "pinned" && !entry.classification && !isLikelyActiveWorkflowState(entry, intent.query)) score -= 30;
	return score;
}

export function selectMemoryCard(prompt: string, entries: MemoryEntry[], config: MemoryConfig): MemorySelectionResult {
	const intent = extractEffectiveIntent(prompt);
	const duplicateGroups = groupDuplicateEntries(entries);
	const duplicateSuppressed = new Set<string>();
	for (const group of duplicateGroups) {
		const members = entries.filter((entry) => group.ids.includes(entry.id));
		const representative = members.sort((a, b) => Number(b.sourceKind === "pinned") - Number(a.sourceKind === "pinned") || b.updatedAt.localeCompare(a.updatedAt))[0];
		for (const member of members) if (member.id !== representative.id) duplicateSuppressed.add(member.id);
	}
	const eligible = entries.filter((entry) => !duplicateSuppressed.has(entry.id) && isAutomaticInjectionCandidate(entry, intent.query));
	const scored = eligible
		.map((entry) => ({ entry, score: scoreEntry(intent, entry) }))
		.filter((item) => item.entry.sourceKind === "pinned" || item.score >= 45)
		.sort((a, b) => b.score - a.score || b.entry.updatedAt.localeCompare(a.entry.updatedAt));

	if (scored.length === 0) {
		const coldCount = entries.filter((entry) => automaticInjectionColdReason(entry)).length;
		const selectionReason = eligible.length === 0 ? (coldCount ? "intentionally skipped: only cold or ineligible memory matched policy" : "intentionally skipped: no high-confidence relevant memory") : "intentionally skipped: no eligible memory met relevance threshold";
		return { card: "", ids: [], estimatedTokens: 0, effectiveIntentSummary: summarizePrompt(intent.query), selectionReason, eligibleCount: eligible.length };
	}

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
	if (ids.length === 0) return { card: "", ids, estimatedTokens: 0, effectiveIntentSummary: summarizePrompt(intent.query), selectionReason: "intentionally skipped: eligible memory exceeded token budget", eligibleCount: eligible.length };
	const card = lines.join("\n");
	return { card, ids, estimatedTokens: Math.ceil(card.length / 4), effectiveIntentSummary: summarizePrompt(intent.query), selectionReason: "selected relevant hot memory", eligibleCount: eligible.length };
}
function stripCodeBlocks(text: string): string {
	return text.replace(/```[\s\S]*?```/g, "\n");
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

function containsUnsafeSummaryText(text: string): boolean {
	return /(?:api[_-]?key|secret|password|token)\s*[:=]/i.test(text) || /[`{};]/.test(text) || /[A-Za-z0-9_=-]{48,}/.test(text);
}

function fileKindLabel(path: string): string {
	const ext = path.split(".").pop();
	return ext && ext !== path ? ext : "text";
}

function deriveOneLineFileSummary(path: string, content: string): string | undefined {
	const base = basename(path);
	const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	if (/\.md$/i.test(path)) {
		const headings = lines.filter((line) => /^#{1,3}\s+/.test(line)).slice(0, 2).map((line) => line.replace(/^#{1,3}\s+/, ""));
		if (headings.length) return clip(`${base} documents ${headings.join(" and ")}.`, 180);
	}
	if (/package\.json$/i.test(path)) {
		try {
			const parsed = JSON.parse(content) as { scripts?: Record<string, unknown> };
			const scripts = Object.keys(parsed.scripts ?? {}).slice(0, 4);
			return clip(`${base} defines package metadata${scripts.length ? ` and scripts ${scripts.join(", ")}` : ""}.`, 180);
		} catch { /* fall through */ }
	}
	const symbols = lines.flatMap((line) => [...line.matchAll(/^(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const)\s+([A-Za-z0-9_]+)/g)].map((match) => match[1])).slice(0, 4);
	if (symbols.length) return clip(`${base} defines ${symbols.join(", ")}.`, 180);
	const imports = lines.filter((line) => /^(import|from|require\()/.test(line)).length;
	if (imports) return clip(`${base} is a ${fileKindLabel(path)} source/config file with ${imports} imports or dependencies.`, 180);
	if (lines.length) return clip(`${base} is a ${fileKindLabel(path)} file in ${dirname(path)}.`, 180);
	return undefined;
}

async function readFileSummaryRecords(ctx: ExtensionContext): Promise<FileSummaryRecord[]> {
	return readJsonFile<FileSummaryRecord[]>(fileSummariesPath(ctx), []);
}

async function upsertReadDerivedFileSummary(ctx: ExtensionContext, path: string): Promise<FileSummaryRecord | undefined> {
	const repo = await discoverRepository(ctx);
	if (!repo) return undefined;
	const absolute = resolve(ctx.cwd, path);
	let content = "";
	try {
		content = await readFile(absolute, "utf8");
	} catch {
		return undefined;
	}
	const summary = deriveOneLineFileSummary(path, content);
	if (!summary || containsUnsafeSummaryText(summary)) return undefined;
	const contentHash = hashText(content);
	const relPath = relative(repo.rootPath, absolute).split("/").join("/");
	if (relPath.startsWith("..")) return undefined;
	const existing = await readFileSummaryRecords(ctx);
	const now = nowIso();
	const prior = existing.find((record) => record.repoKey === repo.key && record.path === relPath && record.contentHash === contentHash);
	const record: FileSummaryRecord = { repoKey: repo.key, repoRoot: repo.rootPath, path: relPath, contentHash, summary, source: "read-derived", createdAt: prior?.createdAt ?? now, updatedAt: now };
	const next = [record, ...existing.filter((item) => !(item.repoKey === repo.key && item.path === relPath && item.contentHash === contentHash))].slice(0, 1000);
	await writeJsonFile(fileSummariesPath(ctx), next);
	return record;
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


function asNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
	return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
	for (const value of values) {
		const numericValue = asNumber(value);
		if (numericValue !== undefined) return numericValue;
	}
	return undefined;
}

function addOptional(a?: number, b?: number): number | undefined {
	if (a === undefined) return b;
	if (b === undefined) return a;
	return a + b;
}

function mergeProviderUsage(current: ProviderUsageTelemetry, next: ProviderUsageTelemetry): ProviderUsageTelemetry {
	return {
		provider: next.provider ?? current.provider,
		model: next.model ?? current.model,
		inputTokens: addOptional(current.inputTokens, next.inputTokens),
		outputTokens: addOptional(current.outputTokens, next.outputTokens),
		cacheReadTokens: addOptional(current.cacheReadTokens, next.cacheReadTokens),
		cacheWriteTokens: addOptional(current.cacheWriteTokens, next.cacheWriteTokens),
		cacheTokens: addOptional(current.cacheTokens, next.cacheTokens),
		totalTokens: addOptional(current.totalTokens, next.totalTokens),
		costUsd: addOptional(current.costUsd, next.costUsd),
	};
}

export interface MemoryQueryOptions {
	query?: string;
	type?: string;
	scope?: MemoryScope | "all";
	relatedFile?: string;
	change?: string;
	sinceDays?: number;
	includeFileSummaries?: boolean;
	limit?: number;
}

const memoryQueryParameters = Type.Object({
	query: Type.Optional(Type.String({ description: "Text to search for in past-work memory." })),
	type: Type.Optional(Type.String({ description: "Memory type or classification such as decision, blocker, assumption, next-step, preference, repo, openspec, session, or tool." })),
	scope: Type.Optional(Type.String({ description: "Scope filter: global, repo, session, or all." })),
	relatedFile: Type.Optional(Type.String({ description: "Only return memories related to this file path when metadata exists." })),
	change: Type.Optional(Type.String({ description: "Only return memories related to this OpenSpec change when metadata exists." })),
	sinceDays: Type.Optional(Type.Number({ description: "Only return memories updated within this many days." })),
	includeFileSummaries: Type.Optional(Type.Boolean({ description: "Include file-summary cache records in diagnostic output." })),
	limit: Type.Optional(Type.Number({ description: "Maximum results, default 10, max 50." })),
});

const memorySaveParameters = Type.Object({
	text: Type.String({ description: "Concise durable note to save." }),
	type: Type.Optional(Type.String({ description: "decision, blocker, assumption, next-step, preference, workflow-state, investigation, or note." })),
	scope: Type.Optional(Type.String({ description: "Scope: global, repo, or session. Defaults to repo when a repo is detected." })),
	relatedFiles: Type.Optional(Type.Array(Type.String(), { description: "Related file paths." })),
	change: Type.Optional(Type.String({ description: "Related OpenSpec change name." })),
});

function clampMemoryLimit(limit: number | undefined): number {
	if (!Number.isFinite(limit ?? NaN)) return 10;
	return Math.max(1, Math.min(50, Math.floor(limit!)));
}

function classifySavedMemory(type: string | undefined): MemoryClassification | undefined {
	if (type === "decision" || type === "blocker" || type === "assumption" || type === "next-step" || type === "preference") return type;
	return undefined;
}

export function memoryMatchesQuery(entry: MemoryEntry, options: MemoryQueryOptions): boolean {
	if (entry.forgottenAt || entry.sourceKind === "forgotten") return false;
	if (!options.includeFileSummaries && entry.tags?.includes("file-summary")) return false;
	if (options.type) {
		const wanted = options.type.toLowerCase();
		if (![entry.type, entry.classification, entry.sourceKind, ...(entry.tags ?? [])].filter(Boolean).some((value) => String(value).toLowerCase() === wanted)) return false;
	}
	if (options.relatedFile) {
		const wanted = options.relatedFile.toLowerCase();
		const related = [entry.source?.path, ...(entry.source?.relatedFiles ?? []), ...(entry.tags ?? []).filter((tag) => tag.startsWith("file:")).map((tag) => tag.slice(5))].filter(Boolean).join(" ").toLowerCase();
		if (!related.includes(wanted)) return false;
	}
	if (options.change) {
		const wanted = options.change.toLowerCase();
		const related = [entry.source?.relatedChange, ...(entry.tags ?? []).filter((tag) => tag.startsWith("change:")).map((tag) => tag.slice(7)), entry.text].filter(Boolean).join(" ").toLowerCase();
		if (!related.includes(wanted)) return false;
	}
	if (Number.isFinite(options.sinceDays ?? NaN)) {
		const cutoff = Date.now() - Math.max(0, options.sinceDays!) * 86_400_000;
		if (Date.parse(entry.updatedAt || entry.createdAt) < cutoff) return false;
	}
	if (options.query) {
		const terms = usefulPromptTerms(options.query);
		const haystack = `${entry.text} ${(entry.tags ?? []).join(" ")} ${entry.source?.path ?? ""} ${(entry.source?.relatedFiles ?? []).join(" ")} ${entry.source?.relatedChange ?? ""}`.toLowerCase();
		for (const term of terms) if (!haystack.includes(term.toLowerCase())) return false;
	}
	return true;
}

async function queryMemory(ctx: ExtensionContext, options: MemoryQueryOptions): Promise<{ entries: MemoryEntry[]; fileSummaries: FileSummaryRecord[] }> {
	const entries = (await readEntries(ctx, { scope: options.scope })).filter((entry) => memoryMatchesQuery(entry, options)).slice(0, clampMemoryLimit(options.limit));
	const fileSummaries = options.includeFileSummaries ? (await readFileSummaryRecords(ctx)).slice(0, clampMemoryLimit(options.limit)) : [];
	await recordTelemetry(ctx, { eventType: "memory_query", timestamp: nowIso(), turnId: telemetryTurnId(undefined, "query"), query: options as Record<string, unknown>, resultCount: entries.length + fileSummaries.length });
	return { entries, fileSummaries };
}

function renderMemoryQueryResults(result: { entries: MemoryEntry[]; fileSummaries: FileSummaryRecord[] }): string {
	const lines = ["# Memory Query Results", "Memory results are advisory orientation; read current files/commands for authoritative facts.", ""];
	if (result.entries.length) {
		lines.push("## Past-work notes");
		for (const entry of result.entries) lines.push(`- ${entry.id} [${entry.scope ?? "repo"}/${entry.sourceKind}/${entry.classification ?? entry.type}${entry.stale ? "/stale" : ""}${isExpired(entry) ? "/expired" : ""}${entry.duplicateOf ? "/duplicate" : ""}]: ${entry.text}`);
	} else lines.push("No matching past-work notes.");
	if (result.fileSummaries.length) {
		lines.push("", "## File summary cache (diagnostic)");
		for (const summary of result.fileSummaries) lines.push(`- ${summary.path} [${summary.source}, ${summary.contentHash.slice(0, 8)}]: ${summary.summary}`);
	}
	return lines.join("\n");
}

async function saveMemory(ctx: ExtensionContext, input: { text: string; type?: string; scope?: MemoryScope; relatedFiles?: string[]; change?: string }): Promise<MemoryEntry> {
	const classification = classifySavedMemory(input.type);
	const memoryType: MemoryType = classification === "preference" ? "preference" : input.change ? "openspec" : "session";
	const entry = await addEntry(ctx, {
		type: memoryType,
		scope: input.scope,
		sourceKind: "agent-saved",
		text: clip(input.text, MAX_ENTRY_TEXT),
		tags: ["agent-saved", input.type, input.change ? `change:${input.change}` : undefined, ...(input.relatedFiles ?? []).map((file) => `file:${file}`)].filter((value): value is string => Boolean(value)),
		quality: "high",
		lifecycle: "durable",
		classification,
		source: { relatedFiles: input.relatedFiles, relatedChange: input.change, savedBy: "agent" },
	});
	await recordTelemetry(ctx, { eventType: "memory_save", timestamp: nowIso(), turnId: telemetryTurnId(undefined, "save"), savedMemoryId: entry.id, query: { type: input.type, scope: input.scope, relatedFiles: input.relatedFiles, change: input.change } });
	return entry;
}

function bootContextIncludesPinnedPreferences(): boolean {
	const raw = String(process.env.PI_MEMORY_BOOT_PINNED_PREFERENCES ?? "0").toLowerCase();
	return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function buildSessionBootContext(entries: MemoryEntry[]): MemorySelectionResult {
	const lines = [
		"## Memory Boot Context (orientation, not authority)",
		"Memory is tool-queried after session start: use memory_query for prior decisions/history and memory_save for durable decisions, blockers, assumptions, next steps, or preferences.",
		"Read exact current files and run current commands before edits or exact claims.",
	];
	const ids: string[] = [];
	if (bootContextIncludesPinnedPreferences()) {
		const pinned = entries.filter((entry) => entry.scope === "global" && entry.sourceKind === "pinned" && !entry.forgottenAt && !isExpired(entry)).slice(0, 5);
		if (pinned.length) {
			lines.push("", "### Pinned Global Preferences");
			for (const entry of pinned) {
				lines.push(`- ${clip(entry.text, 180)} (id: ${entry.id})`);
				ids.push(entry.id);
			}
		}
	}
	const card = lines.join("\n");
	return { card, ids, estimatedTokens: Math.ceil(card.length / 4), effectiveIntentSummary: "session-start boot context", selectionReason: "session-start boot context only; per-turn memory injection disabled", eligibleCount: ids.length };
}

export default function memorySystem(pi: ExtensionAPI) {
	let lastInjection: { ids: string[]; estimatedTokens: number; estimatedAvoidedTokens?: number; estimatedNetSavedTokens?: number; enabled?: boolean; reason?: string; effectiveIntentSummary?: string; phase?: string } = { ids: [], estimatedTokens: 0, enabled: true, reason: "not recorded yet" };
	let memoryActivity: MemoryActivityCounters = { queries: 0, results: 0, writes: 0 };
	const updateMemoryFooter = (ctx: ExtensionContext): void => ctx.ui.setStatus("memory", renderMemoryActivityStatus(memoryActivity));
	let bootContextDelivered = false;
	let activeTurnId = telemetryTurnId(undefined);
	const turnStarts = new Map<string, number>();
	const turnTools = new Map<string, ToolTelemetry[]>();
	const turnProviderUsage = new Map<string, ProviderUsageTelemetry>();
	const readToolPaths = new Map<string, string[]>();

	pi.on("session_start", async (event, ctx) => {
		try {
			bootContextDelivered = false;
			memoryActivity = { queries: 0, results: 0, writes: 0 };
			updateMemoryFooter(ctx);
			await ensureMemoryDirs(ctx);
			await readEntries(ctx);
			if (event.reason === "startup" || event.reason === "reload") await refreshAll(pi, ctx);
			updateMemoryFooter(ctx);
		} catch (error) {
			ctx.ui.notify(`Memory startup failed open: ${error instanceof Error ? error.message : String(error)}`, "warning");
		}
	});

	pi.on("session_shutdown", async () => {
		closeMemoryStores();
	});

	pi.registerTool({
		name: "memory_query",
		label: "Memory Query",
		description: "Query scoped past-work memory explicitly for prior decisions, investigations, blockers, assumptions, preferences, related files, or OpenSpec changes.",
		promptSnippet: "Explicit advisory lookup for saved past-work memory; exact files and commands remain authoritative.",
		promptGuidelines: [
			"Use memory_query when prior decisions, continuation history, blockers, preferences, or saved workflow state are relevant.",
			"Treat results as orientation only; verify current files, OpenSpec artifacts, or command output before exact claims.",
		],
		parameters: memoryQueryParameters,
		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			onUpdate?.({ content: [{ type: "text", text: "Querying advisory memory..." }] });
			const result = await queryMemory(ctx, params as MemoryQueryOptions);
			memoryActivity = { ...memoryActivity, queries: memoryActivity.queries + 1, results: memoryActivity.results + result.entries.length + result.fileSummaries.length };
			updateMemoryFooter(ctx);
			const output = renderMemoryQueryResults(result);
			return { content: [{ type: "text", text: output }], details: { advisory: true, authoritative: false } };
		},
	});

	pi.registerTool({
		name: "memory_save",
		label: "Memory Save",
		description: "Explicitly save a concise durable memory note with scope, type, related files, and OpenSpec change metadata.",
		promptSnippet: "Explicit save for durable decisions/history/blockers/preferences; not automatic transcript inference.",
		promptGuidelines: [
			"Save selectively: durable decisions, completed investigations, blockers, assumptions, next steps, preferences, or workflow state.",
			"Do not save raw tool output, secrets, large literals, or facts that should be re-read from source files.",
		],
		parameters: memorySaveParameters,
		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			onUpdate?.({ content: [{ type: "text", text: "Saving explicit durable memory..." }] });
			const entry = await saveMemory(ctx, params as { text: string; type?: string; scope?: MemoryScope; relatedFiles?: string[]; change?: string });
			memoryActivity = { ...memoryActivity, writes: memoryActivity.writes + 1 };
			updateMemoryFooter(ctx);
			return { content: [{ type: "text", text: `Saved ${entry.scope ?? "repo"} memory ${entry.id}. Memory is advisory and will be queryable later.` }], details: { id: entry.id, scope: entry.scope, sourceKind: entry.sourceKind } };
		},
	});

	pi.on("before_agent_start", async (event, ctx) => {
		try {
			const entries = await updateStaleness(ctx);
			const enabled = memoryInjectionEnabled();
			const phase: "session_start_boot" | "per_turn_skipped" | "disabled" = !enabled ? "disabled" : bootContextDelivered ? "per_turn_skipped" : "session_start_boot";
			const selected = phase === "session_start_boot" ? buildSessionBootContext(entries) : { card: "", ids: [], estimatedTokens: 0, effectiveIntentSummary: "per-turn memory injection disabled", selectionReason: phase === "disabled" ? "disabled" : "per-turn memory injection disabled; query memory explicitly when needed", eligibleCount: 0 };
			const savings = estimateSavings(entries, selected.ids, selected.estimatedTokens);
			lastInjection = { ids: selected.ids, estimatedTokens: selected.estimatedTokens, ...savings, enabled, reason: selected.selectionReason, effectiveIntentSummary: selected.effectiveIntentSummary, phase };
			const telemetry: MemoryInjectionTelemetry = { eventType: "memory_injection", timestamp: nowIso(), turnId: activeTurnId, memoryEnabled: enabled, selectedMemoryIds: selected.ids, memoryHitCount: selected.ids.length, cardCharacters: selected.card.length, estimatedCardTokens: selected.estimatedTokens, ...savings, promptSummary: summarizePrompt(event.prompt), effectiveIntentSummary: selected.effectiveIntentSummary, selectionReason: selected.selectionReason, injectionPhase: phase };
			await recordTelemetry(ctx, telemetry);
			if (phase === "session_start_boot") bootContextDelivered = true;
			if (phase === "session_start_boot" && selected.ids.length > 0) await recordEntryUsage(ctx, selected.ids);
			updateMemoryFooter(ctx);
			if (phase !== "session_start_boot") return;
			return { message: { customType: "memory-card", content: selected.card, display: true, details: { ...selected, ...savings, memoryEnabled: enabled, injectionPhase: phase } } };
		} catch (error) {
			ctx.ui.notify(`Memory boot context skipped: ${error instanceof Error ? error.message : String(error)}`, "warning");
			return;
		}
	});

	pi.on("turn_start", async (event, ctx) => {
		const turnIndex = (event as { turnIndex?: number }).turnIndex;
		activeTurnId = telemetryTurnId(turnIndex, Date.now().toString(36));
		turnStarts.set(activeTurnId, Date.now());
		turnTools.set(activeTurnId, []);
		await recordTelemetry(ctx, { eventType: "turn_start", timestamp: nowIso(), turnId: activeTurnId, turnIndex });
	});

	pi.on("message_end", async (event, ctx) => {
		const message = (event as { message?: unknown }).message as { role?: string } | undefined;
		if (message?.role !== "assistant") return;
		const providerUsage = extractProviderUsage(message);
		turnProviderUsage.set(activeTurnId, mergeProviderUsage(turnProviderUsage.get(activeTurnId) ?? {}, providerUsage));
		await recordTelemetry(ctx, { eventType: "message_end", timestamp: nowIso(), turnId: activeTurnId, providerUsage });
	});

	pi.on("before_provider_request", async (event, ctx) => {
		const payload = (event as { payload?: unknown }).payload;
		const payloadCharacters = safeJsonSummary(payload, 20_000).length;
		await recordTelemetry(ctx, { eventType: "provider_request", timestamp: nowIso(), turnId: activeTurnId, payloadCharacters, estimatedPayloadTokens: Math.ceil(payloadCharacters / 4) });
	});

	pi.on("after_provider_response", async (event, ctx) => {
		const e = event as { status?: number; headers?: Record<string, string> };
		await recordTelemetry(ctx, { eventType: "provider_response", timestamp: nowIso(), turnId: activeTurnId, status: e.status, responseMetadata: e.headers ? Object.fromEntries(Object.entries(e.headers).slice(0, 8)) : undefined });
	});

	pi.on("tool_call", async (event, ctx) => {
		const e = event as { toolCallId?: string; toolName: string; input?: unknown };
		const tool = { toolCallId: e.toolCallId, toolName: e.toolName, ...summarizeToolInput(e.toolName, e.input) };
		if (e.toolCallId && e.toolName === "read" && tool.readPaths?.length) readToolPaths.set(e.toolCallId, tool.readPaths);
		turnTools.set(activeTurnId, [...(turnTools.get(activeTurnId) ?? []), tool]);
		await recordTelemetry(ctx, { eventType: "tool_call", timestamp: nowIso(), turnId: activeTurnId, tool });
	});

	pi.on("turn_end", async (event, ctx) => {
		const e = event as { turnIndex?: number };
		const started = turnStarts.get(activeTurnId);
		const tools = turnTools.get(activeTurnId) ?? [];
		const providerUsage = turnProviderUsage.get(activeTurnId);
		const summary: TurnTelemetrySummary = { eventType: "turn_end", timestamp: nowIso(), turnId: activeTurnId, turnIndex: e.turnIndex, startedAt: started ? new Date(started).toISOString() : undefined, endedAt: nowIso(), durationMs: started ? Date.now() - started : undefined, selectedMemoryIds: lastInjection.ids, memoryHitCount: lastInjection.ids.length, cardTokens: lastInjection.estimatedTokens, estimatedAvoidedTokens: lastInjection.estimatedAvoidedTokens, estimatedNetSavedTokens: lastInjection.estimatedNetSavedTokens, toolCount: tools.length, toolSummaries: tools.map((tool) => `${tool.toolName}${tool.commandSummary ? `: ${tool.commandSummary}` : tool.readPaths?.length ? `: ${tool.readPaths.join(", ")}` : ""}`).slice(0, 12), providerUsage };
		await recordTelemetry(ctx, summary);
	});

	pi.on("tool_result", async (event, ctx) => {
		const e = event as { toolCallId?: string; toolName: string; content?: unknown; isError?: boolean };
		const tool = { toolCallId: e.toolCallId, toolName: e.toolName, isError: e.isError, ...summarizeToolResult(e.content) };
		turnTools.set(activeTurnId, [...(turnTools.get(activeTurnId) ?? []), tool]);
		await recordTelemetry(ctx, { eventType: "tool_result", timestamp: nowIso(), turnId: activeTurnId, tool });
		if (e.toolName === "read" && e.toolCallId && !e.isError) {
			const paths = readToolPaths.get(e.toolCallId) ?? [];
			for (const path of paths) await upsertReadDerivedFileSummary(ctx, path);
			readToolPaths.delete(e.toolCallId);
		}
	});

	pi.on("agent_end", async () => {
		// Durable semantic memory is explicit-only. Turn transcripts are not inferred into
		// semantic memory; turn/tool/provider telemetry is recorded by dedicated events.
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
