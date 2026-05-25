import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";

const MAX_FILES = 2500;
const MAX_FILE_BYTES = 256 * 1024;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_DEPTH = 4;
const FILE_SUMMARIES_PATH = join(homedir(), ".pi", "agent", "memory", "file-summaries.json");

const BUILTIN_IGNORES = new Set([
	".git",
	"node_modules",
	".next",
	"dist",
	"build",
	"target",
	"coverage",
	".cache",
	".turbo",
	".venv",
	"__pycache__",
	"openspec",
]);

function StringEnum<T extends readonly string[]>(values: T, options?: { description?: string; default?: T[number] }) {
	return Type.Unsafe<T[number]>({
		type: "string",
		enum: values,
		...(options?.description ? { description: options.description } : {}),
		...(options?.default ? { default: options.default } : {}),
	});
}

const TEXT_EXTENSIONS = new Set([
	".c",
	".conf",
	".css",
	".go",
	".h",
	".html",
	".js",
	".json",
	".jsonc",
	".jsx",
	".lua",
	".md",
	".mjs",
	".ps1",
	".py",
	".rb",
	".rs",
	".sh",
	".toml",
	".ts",
	".tsx",
	".txt",
	".vim",
	".yaml",
	".yml",
	".zsh",
]);

type NodeKind =
	| "repo"
	| "directory"
	| "file"
	| "file-type"
	| "markdown-heading"
	| "markdown-link"
	| "symbol"
	| "package-script"
	| "config-key";

type EdgeKind =
	| "contains"
	| "has-type"
	| "defines"
	| "links-to"
	| "references"
	| "imports"
	| "exports"
	| "relates-to"
	| "has-script";

interface FileSummaryAnnotation {
	text: string;
	source: "read-derived" | "deterministic";
	freshness: "hash-valid" | "current-scan";
	contentHash?: string;
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

interface GraphNode {
	id: string;
	kind: NodeKind;
	label: string;
	path?: string;
	metadata?: Record<string, string | number | boolean>;
	summary?: FileSummaryAnnotation;
	searchText: string;
}

interface GraphEdge {
	from: string;
	to: string;
	kind: EdgeKind;
	reason?: string;
}

interface RepoGraph {
	root: string;
	nodes: Map<string, GraphNode>;
	edges: GraphEdge[];
	outgoing: Map<string, GraphEdge[]>;
	incoming: Map<string, GraphEdge[]>;
	warnings: string[];
	fileCount: number;
}

interface RankedNode {
	node: GraphNode;
	score: number;
	reasons: string[];
}

interface RepoGraphParams {
	mode: "overview" | "search" | "neighbors" | "reverse-deps" | "symbols" | "openspec-change" | "task-context" | "capability";
	query?: string;
	target?: string;
	change?: string;
	task?: string;
	capability?: string;
	depth?: number;
	limit?: number;
}

const repoGraphParameters = Type.Object({
	mode: StringEnum(["overview", "search", "neighbors", "reverse-deps", "symbols", "openspec-change", "task-context", "capability"] as const, {
		description: "Graph query mode. OpenSpec modes are deprecated and return guidance to use openspec_context.",
	}),
	query: Type.Optional(Type.String({ description: "Search text or symbol filter, depending on mode." })),
	target: Type.Optional(Type.String({ description: "Path, node id, symbol, capability, or change to inspect." })),
	change: Type.Optional(Type.String({ description: "Deprecated: OpenSpec change name. Use openspec_context instead." })),
	task: Type.Optional(Type.String({ description: "Deprecated: OpenSpec task id/text. Use openspec_context instead." })),
	capability: Type.Optional(Type.String({ description: "Deprecated: OpenSpec capability name. Use openspec_context instead." })),
	depth: Type.Optional(Type.Number({ description: "Bounded graph depth for neighbor modes. Defaults to 1, max 4." })),
	limit: Type.Optional(Type.Number({ description: "Maximum number of returned items. Defaults to 10, max 50." })),
});

function clampLimit(value: number | undefined): number {
	if (!Number.isFinite(value ?? NaN)) return DEFAULT_LIMIT;
	return Math.max(1, Math.min(MAX_LIMIT, Math.floor(value!)));
}

function clampDepth(value: number | undefined): number {
	if (!Number.isFinite(value ?? NaN)) return 1;
	return Math.max(1, Math.min(MAX_DEPTH, Math.floor(value!)));
}

function toPosix(path: string): string {
	return path.split("/").join("/");
}

function rel(root: string, path: string): string {
	const value = relative(root, path) || ".";
	return toPosix(value);
}

function hashText(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

async function canonicalPath(path: string): Promise<string> {
	try {
		return await realpath(path);
	} catch {
		return resolve(path);
	}
}

async function repositoryKey(root: string): Promise<string> {
	return hashText(await canonicalPath(root)).slice(0, 16);
}

function nodeId(kind: NodeKind, value: string): string {
	return `${kind}:${value}`;
}

function extensionLabel(path: string): string {
	const ext = extname(path).toLowerCase();
	if (ext) return ext.slice(1);
	const base = path.split("/").pop() ?? path;
	return base.startsWith(".") ? base : "no-extension";
}

function isTextCandidate(path: string): boolean {
	const base = path.split("/").pop() ?? path;
	return TEXT_EXTENSIONS.has(extname(path).toLowerCase()) || ["README", "LICENSE", "Dockerfile", "Makefile"].includes(base);
}

function addNode(graph: RepoGraph, node: GraphNode): GraphNode {
	const existing = graph.nodes.get(node.id);
	if (existing) return existing;
	graph.nodes.set(node.id, node);
	return node;
}

function addEdge(graph: RepoGraph, edge: GraphEdge): void {
	if (!graph.nodes.has(edge.from) || !graph.nodes.has(edge.to)) return;
	if (graph.edges.some((existing) => existing.from === edge.from && existing.to === edge.to && existing.kind === edge.kind)) return;
	graph.edges.push(edge);
	const outgoing = graph.outgoing.get(edge.from) ?? [];
	outgoing.push(edge);
	graph.outgoing.set(edge.from, outgoing);
	const incoming = graph.incoming.get(edge.to) ?? [];
	incoming.push(edge);
	graph.incoming.set(edge.to, incoming);
}

function makeFileNode(root: string, fullPath: string, isDirectory: boolean): GraphNode {
	const path = rel(root, fullPath);
	const kind: NodeKind = isDirectory ? "directory" : "file";
	return {
		id: nodeId(kind, path),
		kind,
		label: path === "." ? "." : path.split("/").pop() ?? path,
		path,
		metadata: isDirectory ? undefined : { extension: extensionLabel(path) },
		searchText: `${path} ${kind} ${extensionLabel(path)}`,
	};
}

function simpleGitignoreIgnores(root: string): Set<string> {
	const ignores = new Set(BUILTIN_IGNORES);
	const gitignore = join(root, ".gitignore");
	if (!existsSync(gitignore)) return ignores;
	try {
		const content = require("node:fs").readFileSync(gitignore, "utf8") as string;
		for (const rawLine of content.split(/\r?\n/)) {
			const line = rawLine.trim();
			if (!line || line.startsWith("#") || line.startsWith("!")) continue;
			const trimmed = line.replace(/^\//, "").replace(/\/$/, "");
			if (trimmed && !trimmed.includes("*")) ignores.add(trimmed.split("/").pop() ?? trimmed);
		}
	} catch {
		// Ignore malformed or unreadable .gitignore files; built-ins still apply.
	}
	return ignores;
}

async function safeReadText(path: string, warnings: string[]): Promise<string | undefined> {
	try {
		const info = await stat(path);
		if (info.size > MAX_FILE_BYTES) return undefined;
		return await readFile(path, "utf8");
	} catch (error) {
		warnings.push(`Could not read ${path}: ${(error as Error).message}`);
		return undefined;
	}
}

async function walkFilesystem(root: string, graph: RepoGraph): Promise<string[]> {
	const ignores = simpleGitignoreIgnores(root);
	const files: string[] = [];
	const rootNode = addNode(graph, { id: "repo:.", kind: "repo", label: ".", path: ".", searchText: `repo ${root}` });
	const rootDir = addNode(graph, makeFileNode(root, root, true));
	addEdge(graph, { from: rootNode.id, to: rootDir.id, kind: "contains", reason: "repository root" });

	async function visit(dir: string): Promise<void> {
		if (graph.fileCount >= MAX_FILES) return;
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch (error) {
			graph.warnings.push(`Could not list ${rel(root, dir)}: ${(error as Error).message}`);
			return;
		}
		entries.sort((a, b) => a.name.localeCompare(b.name));
		for (const entry of entries) {
			if (graph.fileCount >= MAX_FILES) {
				graph.warnings.push(`Stopped scanning after ${MAX_FILES} filesystem entries.`);
				return;
			}
			if (ignores.has(entry.name)) continue;
			const fullPath = join(dir, entry.name);
			const isDirectory = entry.isDirectory();
			if (!isDirectory && !entry.isFile()) continue;
			graph.fileCount += 1;
			const child = addNode(graph, makeFileNode(root, fullPath, isDirectory));
			const parentRel = rel(root, dir);
			const parentId = nodeId("directory", parentRel);
			addEdge(graph, { from: parentId, to: child.id, kind: "contains" });
			if (!isDirectory) {
				files.push(fullPath);
				const type = extensionLabel(child.path ?? child.label);
				const typeNode = addNode(graph, { id: nodeId("file-type", type), kind: "file-type", label: type, searchText: `file type ${type}` });
				addEdge(graph, { from: child.id, to: typeNode.id, kind: "has-type", reason: `extension ${type}` });
			} else {
				await visit(fullPath);
			}
		}
	}

	await visit(root);
	return files;
}

function slugify(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "heading";
}

async function scanMarkdown(root: string, graph: RepoGraph, files: string[]): Promise<void> {
	for (const file of files.filter((path) => extname(path).toLowerCase() === ".md")) {
		const content = await safeReadText(file, graph.warnings);
		if (!content) continue;
		const filePath = rel(root, file);
		const fileId = nodeId("file", filePath);
		const lines = content.split(/\r?\n/);
		for (let index = 0; index < lines.length; index += 1) {
			const line = lines[index];
			const heading = line.match(/^(#{1,6})\s+(.+)$/);
			if (heading) {
				const title = heading[2].trim();
				const id = nodeId("markdown-heading", `${filePath}#${slugify(title)}-${index + 1}`);
				addNode(graph, {
					id,
					kind: "markdown-heading",
					label: title,
					path: filePath,
					metadata: { line: index + 1, level: heading[1].length },
					searchText: `${filePath} heading ${title}`,
				});
				addEdge(graph, { from: fileId, to: id, kind: "defines", reason: `Markdown heading line ${index + 1}` });
			}
			for (const match of line.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
				const href = match[1].split("#")[0];
				if (!href || /^[a-z]+:/i.test(href)) continue;
				const targetPath = rel(root, resolve(dirname(file), href));
				const targetId = graph.nodes.has(nodeId("file", targetPath)) ? nodeId("file", targetPath) : graph.nodes.has(nodeId("directory", targetPath)) ? nodeId("directory", targetPath) : undefined;
				if (targetId) addEdge(graph, { from: fileId, to: targetId, kind: "links-to", reason: `Markdown link line ${index + 1}` });
			}
		}
	}
}

function resolveImportPath(root: string, fromFile: string, specifier: string): string | undefined {
	if (!specifier.startsWith(".")) return undefined;
	const base = resolve(dirname(fromFile), specifier);
	const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`, join(base, "index.ts"), join(base, "index.tsx"), join(base, "index.js")];
	for (const candidate of candidates) {
		if (!candidate.startsWith(root)) continue;
		if (existsSync(candidate)) return rel(root, candidate);
	}
	return undefined;
}

async function scanSourceAndConfig(root: string, graph: RepoGraph, files: string[]): Promise<void> {
	for (const fullPath of files.filter(isTextCandidate)) {
		const path = rel(root, fullPath);
		const fileId = nodeId("file", path);
		const ext = extname(path).toLowerCase();
		const content = await safeReadText(fullPath, graph.warnings);
		if (!content) continue;

		if ([".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(ext)) {
			for (const match of content.matchAll(/import(?:\s+type)?[\s\S]*?from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)/g)) {
				const specifier = match[1] ?? match[2] ?? match[3];
				const target = resolveImportPath(root, fullPath, specifier);
				if (target) addEdge(graph, { from: fileId, to: nodeId("file", target), kind: "imports", reason: `imports ${specifier}` });
			}
			for (const match of content.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+([A-Za-z_$][\w$]*)|(?:function|class|const|let|var|interface|type)\s+([A-Za-z_$][\w$]*)/g)) {
				const symbol = match[1] ?? match[2];
				const id = nodeId("symbol", `${path}:${symbol}`);
				addNode(graph, { id, kind: "symbol", label: symbol, path, searchText: `${path} symbol ${symbol}` });
				addEdge(graph, { from: fileId, to: id, kind: "defines" });
				if (match[1]) addEdge(graph, { from: fileId, to: id, kind: "exports" });
			}
		}

		if ([".sh", ".zsh", ".ps1"].includes(ext)) {
			for (const match of content.matchAll(/(?:source|\.\s+|bash|zsh|sh)\s+([\.\/][^\s;&|]+)/g)) {
				const target = resolveImportPath(root, fullPath, match[1]);
				if (target) addEdge(graph, { from: fileId, to: nodeId("file", target), kind: "references", reason: `script references ${match[1]}` });
			}
		}

		if (path.endsWith("package.json")) {
			try {
				const json = JSON.parse(content) as { scripts?: Record<string, unknown>; dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> };
				for (const [name, command] of Object.entries(json.scripts ?? {})) {
					if (typeof command !== "string") continue;
					const id = nodeId("package-script", `${path}:${name}`);
					addNode(graph, { id, kind: "package-script", label: name, path, metadata: { command }, searchText: `${path} package script ${name} ${command}` });
					addEdge(graph, { from: fileId, to: id, kind: "has-script" });
				}
			} catch (error) {
				graph.warnings.push(`Could not parse ${path}: ${(error as Error).message}`);
			}
		}

		if ([".json", ".jsonc", ".yaml", ".yml", ".toml"].includes(ext) || ["config", ".gitignore"].includes(path.split("/").pop() ?? "")) {
			const lines = content.split(/\r?\n/).slice(0, 200);
			for (let index = 0; index < lines.length; index += 1) {
				const key = lines[index].match(/^\s*([A-Za-z0-9_.-]+)\s*[:=]/)?.[1];
				if (!key) continue;
				const id = nodeId("config-key", `${path}:${key}:${index + 1}`);
				addNode(graph, { id, kind: "config-key", label: key, path, metadata: { line: index + 1 }, searchText: `${path} config ${key}` });
				addEdge(graph, { from: fileId, to: id, kind: "defines" });
			}
		}
	}
}

async function readFileSummaryCache(): Promise<FileSummaryRecord[]> {
	try {
		const parsed = JSON.parse(await readFile(FILE_SUMMARIES_PATH, "utf8")) as unknown;
		return Array.isArray(parsed) ? parsed.filter((item): item is FileSummaryRecord => Boolean(item && typeof item === "object" && typeof (item as FileSummaryRecord).path === "string" && typeof (item as FileSummaryRecord).summary === "string")) : [];
	} catch {
		return [];
	}
}

function compactSummary(text: string): string | undefined {
	const summary = text.replace(/\s+/g, " ").trim();
	if (!summary) return undefined;
	if (/(?:api[_-]?key|secret|password|token)\s*[:=]/i.test(summary) || /[`{};]/.test(summary) || /[A-Za-z0-9_=-]{48,}/.test(summary)) return undefined;
	return summary.length > 220 ? `${summary.slice(0, 219)}…` : summary;
}

function deterministicFileSummary(graph: RepoGraph, node: GraphNode): string | undefined {
	if (node.kind !== "file" || !node.path) return undefined;
	const path = node.path;
	const base = node.label;
	const outgoing = graph.outgoing.get(node.id) ?? [];
	const headings = outgoing.map((edge) => graph.nodes.get(edge.to)).filter((child): child is GraphNode => child?.kind === "markdown-heading").slice(0, 2).map((child) => child.label);
	if (headings.length) return compactSummary(`${base} documents ${headings.join(" and ")}.`);
	const scripts = outgoing.map((edge) => graph.nodes.get(edge.to)).filter((child): child is GraphNode => child?.kind === "package-script").slice(0, 4).map((child) => child.label);
	if (scripts.length) return compactSummary(`${base} defines package scripts ${scripts.join(", ")}.`);
	const configs = outgoing.map((edge) => graph.nodes.get(edge.to)).filter((child): child is GraphNode => child?.kind === "config-key").slice(0, 4).map((child) => child.label);
	if (configs.length) return compactSummary(`${base} defines config keys ${configs.join(", ")}.`);
	const symbols = outgoing.map((edge) => graph.nodes.get(edge.to)).filter((child): child is GraphNode => child?.kind === "symbol").slice(0, 4).map((child) => child.label);
	if (symbols.length) return compactSummary(`${base} defines symbols ${symbols.join(", ")}.`);
	const imports = outgoing.filter((edge) => edge.kind === "imports").length;
	if (imports) return compactSummary(`${base} imports ${imports} local file${imports === 1 ? "" : "s"}.`);
	if (node.metadata?.extension) return compactSummary(`${base} is a ${node.metadata.extension} file at ${path}.`);
	return undefined;
}

async function attachFileSummaries(graph: RepoGraph): Promise<void> {
	const repoKey = await repositoryKey(graph.root);
	const cache = await readFileSummaryCache();
	for (const node of graph.nodes.values()) {
		if (node.kind !== "file" || !node.path) continue;
		let attached = false;
		const fullPath = join(graph.root, node.path);
		try {
			const info = await stat(fullPath);
			if (info.size > MAX_FILE_BYTES) throw new Error("file too large for summary hash check");
			const contentHash = hashText(await readFile(fullPath, "utf8"));
			const record = cache.find((item) => item.repoKey === repoKey && item.path === node.path && item.contentHash === contentHash);
			if (record) {
				node.summary = { text: record.summary, source: "read-derived", freshness: "hash-valid", contentHash };
				attached = true;
			}
		} catch {
			// Summary attachment is best-effort navigation metadata.
		}
		if (!attached) {
			const fallback = deterministicFileSummary(graph, node);
			if (fallback) node.summary = { text: fallback, source: "deterministic", freshness: "current-scan" };
		}
	}
}

async function buildGraph(root: string): Promise<RepoGraph> {
	const graph: RepoGraph = { root, nodes: new Map(), edges: [], outgoing: new Map(), incoming: new Map(), warnings: [], fileCount: 0 };
	const files = await walkFilesystem(root, graph);
	await scanMarkdown(root, graph, files);
	await scanSourceAndConfig(root, graph, files);
	await attachFileSummaries(graph);
	return graph;
}

function scoreNode(node: GraphNode, query: string): RankedNode | undefined {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return undefined;
	const label = node.label.toLowerCase();
	const path = (node.path ?? "").toLowerCase();
	const text = node.searchText.toLowerCase();
	const summary = node.summary?.text.toLowerCase() ?? "";
	let score = 0;
	const reasons: string[] = [];
	for (const term of terms) {
		if (label === term) {
			score += 30;
			reasons.push(`label exactly matches "${term}"`);
		} else if (label.includes(term)) {
			score += 15;
			reasons.push(`label contains "${term}"`);
		}
		if (path.includes(term)) {
			score += 10;
			reasons.push(`path contains "${term}"`);
		}
		if (text.includes(term)) score += 3;
		if (summary.includes(term)) {
			score += 4;
			reasons.push(`summary contains "${term}"`);
		}
	}
	if (score === 0) return undefined;
	return { node, score, reasons: [...new Set(reasons)].slice(0, 3) };
}

function rankedSearch(graph: RepoGraph, query: string, limit: number, kinds?: Set<NodeKind>): RankedNode[] {
	return [...graph.nodes.values()]
		.filter((node) => !kinds || kinds.has(node.kind))
		.map((node) => scoreNode(node, query))
		.filter((ranked): ranked is RankedNode => Boolean(ranked))
		.sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id))
		.slice(0, limit);
}

function findNode(graph: RepoGraph, target: string | undefined): GraphNode | undefined {
	if (!target) return undefined;
	if (graph.nodes.has(target)) return graph.nodes.get(target);
	const normalized = target.replace(/^\.\//, "");
	const candidates = [
		nodeId("file", normalized),
		nodeId("directory", normalized),
	];
	for (const id of candidates) {
		const node = graph.nodes.get(id);
		if (node) return node;
	}
	return [...graph.nodes.values()].find((node) => node.label === target || node.path === normalized);
}

function formatNode(node: GraphNode): string {
	const location = node.path ? ` (${node.path})` : "";
	const summary = node.summary ? ` — ${node.summary.text} [${node.summary.source}/${node.summary.freshness}]` : "";
	return `${node.kind}: ${node.label}${location}${summary}`;
}

function suggestedReads(nodes: GraphNode[], limit = 5): string[] {
	const reads = nodes.map((node) => node.path).filter((path): path is string => Boolean(path && path !== "."));
	return [...new Set(reads)].slice(0, limit);
}

function safetyFooter(reads: string[]): string {
	const lines = ["", "Suggested next reads:"];
	if (reads.length === 0) lines.push("- No exact file reads identified; narrow the graph query or use exact grep for specific strings.");
	else for (const path of reads) lines.push(`- read ${path}`);
	lines.push("", "Safety: repo_graph is a fresh navigation aid, not durable memory. Read exact files before editing; use grep for exact string occurrences.");
	return lines.join("\n");
}

function queryOverview(graph: RepoGraph, limit: number): string {
	const dirs = [...graph.nodes.values()].filter((node) => node.kind === "directory" && node.path && !node.path.includes("/") && node.path !== ".").map((node) => node.path!).sort().slice(0, limit);
	const configs = [...graph.nodes.values()].filter((node) => node.kind === "file" && /(^|\/)(package\.json|.*config.*|.*\.toml|.*\.ya?ml|.*\.jsonc?)$/i.test(node.path ?? "")).sort((a, b) => (a.path ?? "").localeCompare(b.path ?? "")).slice(0, limit);
	const piResources = [...graph.nodes.values()].filter((node) => node.kind === "file" && (node.path?.startsWith(".pi/") || node.path?.startsWith("pi/"))).sort((a, b) => (a.path ?? "").localeCompare(b.path ?? "")).slice(0, limit);

	const lines = [
		`Repository graph overview for ${graph.root}`,
		`Scanned ${graph.fileCount} filesystem entries, ${graph.nodes.size} nodes, ${graph.edges.length} edges.`,
		"",
		"Major non-OpenSpec directories:",
		...(dirs.length ? dirs.map((path) => `- ${path}`) : ["- none detected"]),
		"",
		"Recognized project/config files:",
		...(configs.length ? configs.map((node) => `- ${node.path}`) : ["- none detected"]),
		"",
		"Pi resources:",
		...(piResources.length ? piResources.map((node) => `- ${node.path}`) : ["- none detected"]),
	];
	if (graph.warnings.length) lines.push("", "Warnings:", ...graph.warnings.slice(0, 5).map((warning) => `- ${warning}`));
	return lines.join("\n") + safetyFooter(suggestedReads([...configs, ...piResources]));
}

function querySearch(graph: RepoGraph, query: string | undefined, limit: number): string {
	if (!query?.trim()) return "Search mode requires query." + safetyFooter([]);
	const ranked = rankedSearch(graph, query, limit);
	const lines = [`Top matches for "${query}":`];
	ranked.forEach((item, index) => {
		lines.push(`${index + 1}. ${formatNode(item.node)}`);
		lines.push(`   reason: ${item.reasons.join("; ") || "search text match"}`);
	});
	if (ranked.length === 0) lines.push("- No graph matches. Try exact grep for literal strings or broaden the query.");
	return lines.join("\n") + safetyFooter(suggestedReads(ranked.map((item) => item.node)));
}

function queryNeighbors(graph: RepoGraph, target: string | undefined, depth: number, limit: number, reverse: boolean): string {
	const start = findNode(graph, target);
	if (!start) return `${reverse ? "Reverse dependency" : "Neighbor"} mode requires a valid target path, node id, symbol, capability, or change.` + safetyFooter([]);
	const seen = new Set([start.id]);
	let frontier = [start.id];
	const rows: string[] = [];
	for (let currentDepth = 1; currentDepth <= depth && rows.length < limit; currentDepth += 1) {
		const next: string[] = [];
		for (const id of frontier) {
			const edges = reverse ? graph.incoming.get(id) ?? [] : graph.outgoing.get(id) ?? [];
			for (const edge of edges.sort((a, b) => `${a.kind}:${a.to}`.localeCompare(`${b.kind}:${b.to}`))) {
				const otherId = reverse ? edge.from : edge.to;
				if (seen.has(otherId)) continue;
				seen.add(otherId);
				next.push(otherId);
				const other = graph.nodes.get(otherId);
				if (other) rows.push(`${rows.length + 1}. depth ${currentDepth} ${reverse ? "<-" : "->"} ${edge.kind}: ${formatNode(other)}${edge.reason ? ` (${edge.reason})` : ""}`);
				if (rows.length >= limit) break;
			}
			if (rows.length >= limit) break;
		}
		frontier = next;
	}
	const nodes = rows.map((row) => [...graph.nodes.values()].find((node) => row.includes(node.id) || (node.path && row.includes(node.path)))).filter((node): node is GraphNode => Boolean(node));
	return [`${reverse ? "Reverse dependencies" : "Neighbors"} for ${formatNode(start)}:`, ...(rows.length ? rows : ["- No connected nodes within requested bounds."])].join("\n") + safetyFooter(suggestedReads(nodes));
}

function querySymbols(graph: RepoGraph, query: string | undefined, limit: number): string {
	const kinds = new Set<NodeKind>(["symbol", "package-script", "config-key"]);
	const ranked = query?.trim() ? rankedSearch(graph, query, limit, kinds) : [...graph.nodes.values()].filter((node) => kinds.has(node.kind)).sort((a, b) => (a.path ?? "").localeCompare(b.path ?? "") || a.label.localeCompare(b.label)).slice(0, limit).map((node) => ({ node, score: 1, reasons: ["supported source/config symbol"] }));
	const lines = [`Supported symbols${query ? ` matching "${query}"` : ""}:`];
	ranked.forEach((item, index) => {
		lines.push(`${index + 1}. ${formatNode(item.node)}`);
		lines.push(`   reason: ${item.reasons.join("; ")}`);
	});
	if (!ranked.length) lines.push("- No supported symbols found.");
	return lines.join("\n") + safetyFooter(suggestedReads(ranked.map((item) => item.node)));
}

function relatedImplementationSearch(graph: RepoGraph, text: string, limit: number): RankedNode[] {
	const stop = new Set(["the", "and", "with", "for", "from", "that", "this", "mode", "query", "tool", "task", "implement", "add"]);
	const terms = text.toLowerCase().split(/[^a-z0-9_.-]+/).filter((term) => term.length > 2 && !stop.has(term)).slice(0, 8);
	return rankedSearch(graph, terms.join(" "), limit, new Set(["file", "symbol", "package-script", "config-key", "markdown-heading"]));
}

function deprecatedOpenSpecMode(mode: "openspec-change" | "task-context" | "capability"): string {
	return [
		`${mode} is no longer served by repo_graph.`,
		"Use openspec_context for OpenSpec changes, specs, tasks, capabilities, and apply/archive readiness.",
		"Then use repo_graph only for implementation/source/config navigation outside openspec/.",
	].join("\n") + safetyFooter([]);
}

async function runRepoGraph(root: string, params: RepoGraphParams): Promise<string> {
	const graph = await buildGraph(root);
	const limit = clampLimit(params.limit);
	switch (params.mode) {
		case "overview":
			return queryOverview(graph, limit);
		case "search":
			return querySearch(graph, params.query ?? params.target, limit);
		case "neighbors":
			return queryNeighbors(graph, params.target ?? params.query, clampDepth(params.depth), limit, false);
		case "reverse-deps":
			return queryNeighbors(graph, params.target ?? params.query, clampDepth(params.depth), limit, true);
		case "symbols":
			return querySymbols(graph, params.query ?? params.target, limit);
		case "openspec-change":
		case "task-context":
		case "capability":
			return deprecatedOpenSpecMode(params.mode);
	}
}

export const __repoGraphTest = {
	buildGraph,
	runRepoGraph,
};

export default function repoGraphExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "repo_graph",
		label: "Repo Graph",
		description: "Build a fresh deterministic repository graph for non-OpenSpec implementation, source, configuration, documentation, and Pi resource navigation.",
		promptSnippet: "Fresh repo graph navigation over non-OpenSpec files, symbols, configs, docs, and Pi resources",
		promptGuidelines: [
			"Use repo_graph after OpenSpec context/artifacts are known and before broad exploratory grep/find/bash discovery when locating non-OpenSpec implementation, source, configuration, documentation, or Pi resource files.",
			"Do not use repo_graph for OpenSpec changes, specs, tasks, capabilities, or artifact paths; use openspec_context for that workflow state.",
			"Treat repo_graph as a fresh navigation aid, not authority: always use read for exact file contents before editing.",
			"Use grep or equivalent exact search for exact string occurrences even when repo_graph is available.",
		],
		parameters: repoGraphParameters,
		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			onUpdate?.({ content: [{ type: "text", text: "Building fresh repository graph from current filesystem..." }] });
			const output = await runRepoGraph(ctx.cwd, params as RepoGraphParams);
			return {
				content: [{ type: "text", text: output }],
				details: { mode: (params as RepoGraphParams).mode, fresh: true, persisted: false, summaries: "hash-valid read-derived or current deterministic fallback when available" },
			};
		},
	});
}
