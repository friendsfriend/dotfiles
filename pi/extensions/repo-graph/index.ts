import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

const MAX_FILES = 2500;
const MAX_FILE_BYTES = 256 * 1024;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_DEPTH = 4;

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
	| "openspec-change"
	| "openspec-artifact"
	| "openspec-capability"
	| "openspec-task"
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
	| "modifies"
	| "relates-to"
	| "has-task"
	| "has-artifact"
	| "has-script";

interface GraphNode {
	id: string;
	kind: NodeKind;
	label: string;
	path?: string;
	metadata?: Record<string, string | number | boolean>;
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
		description: "Graph query mode.",
	}),
	query: Type.Optional(Type.String({ description: "Search text or symbol filter, depending on mode." })),
	target: Type.Optional(Type.String({ description: "Path, node id, symbol, capability, or change to inspect." })),
	change: Type.Optional(Type.String({ description: "OpenSpec change name for openspec-change or task-context mode." })),
	task: Type.Optional(Type.String({ description: "OpenSpec task id or task text for task-context mode." })),
	capability: Type.Optional(Type.String({ description: "OpenSpec capability name for capability mode." })),
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

function artifactKind(path: string): string | undefined {
	const base = path.split("/").pop() ?? path;
	if (base === "proposal.md") return "proposal";
	if (base === "design.md") return "design";
	if (base === "tasks.md") return "tasks";
	if (base === "spec.md") return "spec";
	return undefined;
}

async function scanOpenSpec(root: string, graph: RepoGraph, files: string[]): Promise<void> {
	for (const fullPath of files) {
		const path = rel(root, fullPath);
		const parts = path.split("/");
		if (parts[0] !== "openspec") continue;
		const fileId = nodeId("file", path);
		const capabilityIndex = parts.indexOf("capabilities");
		const changeIndex = parts.indexOf("changes");

		if (parts[1] === "specs" && parts.length > 2) {
			const capability = parts[2];
			const capNode = addNode(graph, { id: nodeId("openspec-capability", capability), kind: "openspec-capability", label: capability, path: parts.slice(0, 3).join("/"), searchText: `openspec capability ${capability}` });
			addEdge(graph, { from: capNode.id, to: fileId, kind: "references", reason: "stable spec" });
		}

		if (changeIndex >= 0 && parts.length > changeIndex + 1) {
			const archived = parts[changeIndex + 1] === "archive" && parts.length > changeIndex + 2;
			const change = archived ? parts[changeIndex + 2] : parts[changeIndex + 1];
			const changePathEnd = archived ? changeIndex + 3 : changeIndex + 2;
			const changeNode = addNode(graph, { id: nodeId("openspec-change", change), kind: "openspec-change", label: change, path: parts.slice(0, changePathEnd).join("/"), metadata: archived ? { archived: true } : undefined, searchText: `openspec change ${change}` });
			addEdge(graph, { from: changeNode.id, to: fileId, kind: "has-artifact" });
			const artifact = artifactKind(path);
			if (artifact) {
				const artifactNode = addNode(graph, { id: nodeId("openspec-artifact", `${change}:${artifact}`), kind: "openspec-artifact", label: `${change} ${artifact}`, path, searchText: `openspec ${change} ${artifact} ${path}` });
				addEdge(graph, { from: changeNode.id, to: artifactNode.id, kind: "has-artifact" });
				addEdge(graph, { from: artifactNode.id, to: fileId, kind: "references" });
			}
			const specIndex = parts.indexOf("specs");
			if (specIndex >= 0 && parts.length > specIndex + 1) {
				const capability = parts[specIndex + 1];
				const capNode = addNode(graph, { id: nodeId("openspec-capability", capability), kind: "openspec-capability", label: capability, path: parts.slice(0, specIndex + 2).join("/"), searchText: `openspec capability ${capability}` });
				addEdge(graph, { from: changeNode.id, to: capNode.id, kind: "modifies", reason: "delta spec capability" });
				addEdge(graph, { from: capNode.id, to: fileId, kind: "references", reason: "delta spec" });
			}
			if (parts[parts.length - 1] === "tasks.md") {
				const content = await safeReadText(fullPath, graph.warnings);
				if (content) {
					content.split(/\r?\n/).forEach((line, index) => {
						const task = line.match(/^- \[[ xX]\]\s+(.+)$/);
						if (!task) return;
						const label = task[1].trim();
						const id = nodeId("openspec-task", `${change}:${index + 1}`);
						addNode(graph, { id, kind: "openspec-task", label, path, metadata: { line: index + 1 }, searchText: `openspec task ${change} ${label}` });
						addEdge(graph, { from: changeNode.id, to: id, kind: "has-task" });
						addEdge(graph, { from: id, to: fileId, kind: "references", reason: `tasks.md line ${index + 1}` });
					});
				}
			}
		}

		if (capabilityIndex >= 0 && parts.length > capabilityIndex + 1) {
			const capability = parts[capabilityIndex + 1];
			const capNode = addNode(graph, { id: nodeId("openspec-capability", capability), kind: "openspec-capability", label: capability, path: parts.slice(0, capabilityIndex + 2).join("/"), searchText: `openspec capability ${capability}` });
			addEdge(graph, { from: capNode.id, to: fileId, kind: "references", reason: "stable spec" });
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

async function buildGraph(root: string): Promise<RepoGraph> {
	const graph: RepoGraph = { root, nodes: new Map(), edges: [], outgoing: new Map(), incoming: new Map(), warnings: [], fileCount: 0 };
	const files = await walkFilesystem(root, graph);
	await scanMarkdown(root, graph, files);
	await scanOpenSpec(root, graph, files);
	await scanSourceAndConfig(root, graph, files);
	return graph;
}

function scoreNode(node: GraphNode, query: string): RankedNode | undefined {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return undefined;
	const label = node.label.toLowerCase();
	const path = (node.path ?? "").toLowerCase();
	const text = node.searchText.toLowerCase();
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
		nodeId("openspec-change", normalized),
		nodeId("openspec-capability", normalized),
	];
	for (const id of candidates) {
		const node = graph.nodes.get(id);
		if (node) return node;
	}
	return [...graph.nodes.values()].find((node) => node.label === target || node.path === normalized);
}

function formatNode(node: GraphNode): string {
	const location = node.path ? ` (${node.path})` : "";
	return `${node.kind}: ${node.label}${location}`;
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
	const changes = [...graph.nodes.values()].filter((node) => node.kind === "openspec-change").sort((a, b) => a.label.localeCompare(b.label)).slice(0, limit);
	const capabilities = [...graph.nodes.values()].filter((node) => node.kind === "openspec-capability").sort((a, b) => a.label.localeCompare(b.label)).slice(0, limit);
	const piResources = [...graph.nodes.values()].filter((node) => node.kind === "file" && (node.path?.startsWith(".pi/") ?? false)).sort((a, b) => (a.path ?? "").localeCompare(b.path ?? "")).slice(0, limit);

	const lines = [
		`Repository graph overview for ${graph.root}`,
		`Scanned ${graph.fileCount} filesystem entries, ${graph.nodes.size} nodes, ${graph.edges.length} edges.`,
		"",
		"Major directories:",
		...(dirs.length ? dirs.map((path) => `- ${path}`) : ["- none detected"]),
		"",
		"Recognized project/config files:",
		...(configs.length ? configs.map((node) => `- ${node.path}`) : ["- none detected"]),
		"",
		"OpenSpec:",
		...(changes.length ? changes.map((node) => `- change: ${node.label}`) : [existsSync(join(graph.root, "openspec", "config.yaml")) ? "- OpenSpec config present; no changes scanned" : "- not detected"]),
		...(capabilities.length ? capabilities.map((node) => `- capability: ${node.label}`) : []),
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

function queryOpenSpecChange(graph: RepoGraph, change: string | undefined, limit: number): string {
	const changeNode = findNode(graph, change ? nodeId("openspec-change", change) : undefined) ?? findNode(graph, change);
	if (!changeNode || changeNode.kind !== "openspec-change") return "openspec-change mode requires an active change name." + safetyFooter([]);
	const outgoing = (graph.outgoing.get(changeNode.id) ?? []).slice().sort((a, b) => a.kind.localeCompare(b.kind)).slice(0, limit * 2);
	const related = outgoing.map((edge) => graph.nodes.get(edge.to)).filter((node): node is GraphNode => Boolean(node));
	const impl = relatedImplementationSearch(graph, changeNode.label.replace(/-/g, " "), Math.max(3, Math.floor(limit / 2)));
	const lines = [`OpenSpec change ${changeNode.label}:`];
	for (const edge of outgoing) {
		const node = graph.nodes.get(edge.to);
		if (node) lines.push(`- ${edge.kind}: ${formatNode(node)}${edge.reason ? ` (${edge.reason})` : ""}`);
	}
	if (impl.length) {
		lines.push("", "Likely related implementation files:");
		impl.forEach((item, index) => lines.push(`${index + 1}. ${formatNode(item.node)} — ${item.reasons.join("; ") || "name match"}`));
	}
	return lines.join("\n") + safetyFooter(suggestedReads([...related, ...impl.map((item) => item.node)]));
}

function queryTaskContext(graph: RepoGraph, change: string | undefined, task: string | undefined, limit: number): string {
	const tasks = [...graph.nodes.values()].filter((node) => node.kind === "openspec-task" && (!change || node.id.startsWith(`openspec-task:${change}:`)));
	const rankedTasks = task?.trim() ? tasks.map((node) => scoreNode(node, task)).filter((item): item is RankedNode => Boolean(item)).sort((a, b) => b.score - a.score) : tasks.slice(0, 1).map((node) => ({ node, score: 1, reasons: ["first task for change"] }));
	const selected = rankedTasks[0]?.node;
	if (!selected) return "task-context mode requires a change with scanned tasks and optionally a task id/text." + safetyFooter([]);
	const context = relatedImplementationSearch(graph, selected.label, limit);
	const lines = [`Task context for ${selected.label}:`, `Task node: ${formatNode(selected)}`, "", "Likely relevant context:"];
	context.forEach((item, index) => {
		lines.push(`${index + 1}. ${formatNode(item.node)}`);
		lines.push(`   reason: ${item.reasons.join("; ") || "task text match"}`);
	});
	if (!context.length) lines.push("- No deterministic implementation files discovered from task text; use overview/search or exact grep next.");
	return lines.join("\n") + safetyFooter(suggestedReads([selected, ...context.map((item) => item.node)]));
}

function queryCapability(graph: RepoGraph, capability: string | undefined, limit: number): string {
	const capNode = findNode(graph, capability ? nodeId("openspec-capability", capability) : undefined) ?? findNode(graph, capability);
	if (!capNode || capNode.kind !== "openspec-capability") return "capability mode requires a capability name." + safetyFooter([]);
	const outgoing = graph.outgoing.get(capNode.id) ?? [];
	const incoming = graph.incoming.get(capNode.id) ?? [];
	const edges = [...outgoing, ...incoming].slice(0, limit);
	const nodes = edges.map((edge) => graph.nodes.get(edge.from === capNode.id ? edge.to : edge.from)).filter((node): node is GraphNode => Boolean(node));
	const impl = relatedImplementationSearch(graph, capNode.label.replace(/-/g, " "), Math.max(3, Math.floor(limit / 2)));
	const lines = [`Capability ${capNode.label}:`];
	for (const edge of edges) {
		const direction = edge.from === capNode.id ? "->" : "<-";
		const node = graph.nodes.get(edge.from === capNode.id ? edge.to : edge.from);
		if (node) lines.push(`- ${direction} ${edge.kind}: ${formatNode(node)}${edge.reason ? ` (${edge.reason})` : ""}`);
	}
	if (impl.length) {
		lines.push("", "Likely related implementation files:");
		impl.forEach((item, index) => lines.push(`${index + 1}. ${formatNode(item.node)} — ${item.reasons.join("; ") || "name match"}`));
	}
	return lines.join("\n") + safetyFooter(suggestedReads([...nodes, ...impl.map((item) => item.node)]));
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
			return queryOpenSpecChange(graph, params.change ?? params.target ?? params.query, limit);
		case "task-context":
			return queryTaskContext(graph, params.change, params.task ?? params.query ?? params.target, limit);
		case "capability":
			return queryCapability(graph, params.capability ?? params.target ?? params.query, limit);
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
		description: "Build a fresh deterministic repository graph and query structure, symbols, OpenSpec artifacts, and relationships.",
		promptSnippet: "Fresh repo graph navigation over files, symbols, configs, and OpenSpec relationships",
		promptGuidelines: [
			"Use repo_graph after reading required task context and before broad exploratory grep/find/bash discovery when locating repository structure or implementation files.",
			"Treat repo_graph as a fresh navigation aid, not authority: always use read for exact file contents before editing.",
			"Use grep or equivalent exact search for exact string occurrences even when repo_graph is available.",
		],
		parameters: repoGraphParameters,
		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			onUpdate?.({ content: [{ type: "text", text: "Building fresh repository graph from current filesystem..." }] });
			const output = await runRepoGraph(ctx.cwd, params as RepoGraphParams);
			return {
				content: [{ type: "text", text: output }],
				details: { mode: (params as RepoGraphParams).mode, fresh: true, persisted: false },
			};
		},
	});
}
