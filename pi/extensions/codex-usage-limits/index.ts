import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const STATUS_ID = "codex-usage";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_USAGE_ENDPOINTS = [
	"https://chatgpt.com/backend-api/codex/usage_limits",
	"https://chatgpt.com/backend-api/codex/usage",
];

type UsageState =
	| { kind: "idle" }
	| { kind: "loading"; previous?: AvailableUsage }
	| { kind: "available"; usage: AvailableUsage; fetchedAt: number }
	| { kind: "unavailable"; reason: string; fetchedAt: number }
	| { kind: "error"; reason: string; fetchedAt: number };

interface AvailableUsage {
	used?: number;
	limit?: number;
	remaining?: number;
	percentUsed?: number;
	resetsAt?: string;
	resetsIn?: string;
	label?: string;
}

interface ModelLike {
	provider?: string;
	id?: string;
	name?: string;
	baseUrl?: string;
	headers?: Record<string, string>;
}

function isCodexModel(model: ModelLike | undefined): boolean {
	if (!model) return false;
	if (model.provider === "openai-codex") return true;
	const provider = model.provider?.toLowerCase() ?? "";
	const id = model.id?.toLowerCase() ?? "";
	return provider.includes("codex") && id.includes("codex");
}

function formatNumber(value: number): string {
	if (!Number.isFinite(value)) return "?";
	if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
	if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
	return `${Math.round(value)}`;
}

function formatReset(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const parsed = Date.parse(value);
	if (!Number.isFinite(parsed)) return value;
	const diffMs = parsed - Date.now();
	if (diffMs <= 0) return "now";
	const minutes = Math.round(diffMs / 60_000);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.round(minutes / 60);
	if (hours < 48) return `${hours}h`;
	return `${Math.round(hours / 24)}d`;
}

function formatUsage(usage: AvailableUsage): string {
	const prefix = usage.label ? `Codex ${usage.label}` : "Codex";
	const reset = usage.resetsIn ?? formatReset(usage.resetsAt);
	let main: string | undefined;

	if (typeof usage.percentUsed === "number" && Number.isFinite(usage.percentUsed)) {
		main = `${Math.round(usage.percentUsed)}%`;
	} else if (typeof usage.remaining === "number" && typeof usage.limit === "number") {
		main = `${formatNumber(usage.remaining)}/${formatNumber(usage.limit)} left`;
	} else if (typeof usage.used === "number" && typeof usage.limit === "number") {
		main = `${formatNumber(usage.used)}/${formatNumber(usage.limit)}`;
	} else if (typeof usage.remaining === "number") {
		main = `${formatNumber(usage.remaining)} left`;
	} else if (typeof usage.used === "number") {
		main = `${formatNumber(usage.used)} used`;
	}

	return [prefix, main, reset ? `resets ${reset}` : undefined].filter(Boolean).join(" • ");
}

function statusText(state: UsageState): string | undefined {
	switch (state.kind) {
		case "idle":
			return undefined;
		case "loading":
			return state.previous ? `${formatUsage(state.previous)} • …` : "Codex usage …";
		case "available":
			return formatUsage(state.usage);
		case "unavailable":
			return `Codex usage n/a`;
		case "error":
			return `Codex usage error`;
	}
}

function safeReason(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return message.replace(/Bearer\s+[^\s]+/gi, "Bearer <redacted>").slice(0, 160);
}

function decodeJwtPayload(token: string): Record<string, unknown> | undefined {
	const part = token.split(".")[1];
	if (!part) return undefined;
	try {
		const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
		const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
		return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
	} catch {
		return undefined;
	}
}

function extractAccountId(token: string): string | undefined {
	const payload = decodeJwtPayload(token);
	const auth = payload?.["https://api.openai.com/auth"];
	if (auth && typeof auth === "object") {
		const accountId = (auth as { chatgpt_account_id?: unknown }).chatgpt_account_id;
		if (typeof accountId === "string" && accountId.length > 0) return accountId;
	}
	return undefined;
}

function asNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function walkObjects(value: unknown, output: Record<string, unknown>[] = []): Record<string, unknown>[] {
	if (!value || typeof value !== "object") return output;
	if (!Array.isArray(value)) output.push(value as Record<string, unknown>);
	for (const child of Array.isArray(value) ? value : Object.values(value)) walkObjects(child, output);
	return output;
}

function normalizeUsage(raw: unknown): AvailableUsage | undefined {
	const objects = walkObjects(raw);
	for (const object of objects) {
		const used = asNumber(object.used ?? object.current ?? object.consumed ?? object.used_count ?? object.num_used);
		const limit = asNumber(object.limit ?? object.cap ?? object.total ?? object.max ?? object.quota);
		const remaining = asNumber(object.remaining ?? object.available ?? object.left ?? object.remaining_count);
		const percentRaw = asNumber(object.percent_used ?? object.usage_percent ?? object.percentage ?? object.percent);
		const resetsAt = asString(object.resets_at ?? object.reset_at ?? object.reset_time ?? object.next_reset_at ?? object.window_end);
		const resetsIn = asString(object.resets_in ?? object.reset_in ?? object.retry_after);
		const label = asString(object.label ?? object.name ?? object.tier ?? object.window);

		let percentUsed = percentRaw;
		if (percentUsed === undefined && used !== undefined && limit !== undefined && limit > 0) {
			percentUsed = (used / limit) * 100;
		}
		if (percentUsed !== undefined && percentUsed <= 1) percentUsed *= 100;

		if ([used, limit, remaining, percentUsed].some((value) => value !== undefined) || resetsAt || resetsIn) {
			return { used, limit, remaining, percentUsed, resetsAt, resetsIn, label };
		}
	}
	return undefined;
}

function usageEndpoints(model: ModelLike | undefined): string[] {
	const fromEnv = process.env.CODEX_USAGE_LIMITS_URL?.split(",").map((url) => url.trim()).filter(Boolean) ?? [];
	const baseUrl = model?.baseUrl?.replace(/\/$/, "");
	const fromModel = baseUrl ? [`${baseUrl}/codex/usage_limits`, `${baseUrl}/codex/usage`] : [];
	return [...fromEnv, ...fromModel, ...DEFAULT_USAGE_ENDPOINTS].filter((url, index, all) => all.indexOf(url) === index);
}

async function fetchUsageFromCommand(pi: ExtensionAPI): Promise<UsageState | undefined> {
	const command = process.env.CODEX_USAGE_LIMITS_COMMAND;
	if (!command) return undefined;
	const result = await pi.exec("bash", ["-lc", command], { timeout: REQUEST_TIMEOUT_MS });
	if (result.code !== 0) return { kind: "unavailable", reason: "usage command failed", fetchedAt: Date.now() };
	try {
		const usage = normalizeUsage(JSON.parse(result.stdout || "{}"));
		return usage ? { kind: "available", usage, fetchedAt: Date.now() } : { kind: "unavailable", reason: "usage command returned unsupported JSON", fetchedAt: Date.now() };
	} catch {
		return { kind: "unavailable", reason: "usage command returned invalid JSON", fetchedAt: Date.now() };
	}
}

async function fetchUsageFromCodexApi(ctx: ExtensionContext): Promise<UsageState> {
	const model = ctx.model as ModelLike | undefined;
	if (!model) return { kind: "unavailable", reason: "no active model", fetchedAt: Date.now() };

	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model!);
	if (!auth.ok || !auth.apiKey) return { kind: "unavailable", reason: "no Codex credentials", fetchedAt: Date.now() };

	const accountId = extractAccountId(auth.apiKey);
	if (!accountId) return { kind: "unavailable", reason: "no ChatGPT account id", fetchedAt: Date.now() };

	const headers: Record<string, string> = {
		...(model.headers ?? {}),
		...(auth.headers ?? {}),
		Authorization: `Bearer ${auth.apiKey}`,
		"chatgpt-account-id": accountId,
		originator: "pi",
		"User-Agent": "pi codex-usage-limits extension",
		accept: "application/json",
	};

	let lastStatus: string | undefined;
	for (const endpoint of usageEndpoints(model)) {
		try {
			const response = await fetch(endpoint, { method: "GET", headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
			lastStatus = `${response.status}`;
			if (!response.ok) continue;
			const usage = normalizeUsage(await response.json());
			if (usage) return { kind: "available", usage, fetchedAt: Date.now() };
		} catch (error) {
			lastStatus = safeReason(error);
		}
	}
	return { kind: "unavailable", reason: lastStatus ? `usage endpoint unavailable (${lastStatus})` : "usage endpoint unavailable", fetchedAt: Date.now() };
}

async function fetchUsage(pi: ExtensionAPI, ctx: ExtensionContext): Promise<UsageState> {
	try {
		const commandResult = await fetchUsageFromCommand(pi);
		if (commandResult) return commandResult;
		return await fetchUsageFromCodexApi(ctx);
	} catch (error) {
		return { kind: "error", reason: safeReason(error), fetchedAt: Date.now() };
	}
}

export const __codexUsageLimitsTest = {
	extractAccountId,
	formatUsage,
	isCodexModel,
	normalizeUsage,
	statusText,
};

export default function codexUsageLimits(pi: ExtensionAPI) {
	let state: UsageState = { kind: "idle" };
	let refreshTimer: ReturnType<typeof setInterval> | undefined;
	let inFlight: Promise<void> | undefined;
	let currentCtx: ExtensionContext | undefined;

	function render(ctx: ExtensionContext | undefined = currentCtx): void {
		if (!ctx?.hasUI) return;
		if (!isCodexModel(ctx.model as ModelLike | undefined)) {
			ctx.ui.setStatus(STATUS_ID, undefined);
			return;
		}
		ctx.ui.setStatus(STATUS_ID, statusText(state));
	}

	function clear(ctx: ExtensionContext | undefined = currentCtx): void {
		state = { kind: "idle" };
		if (ctx?.hasUI) ctx.ui.setStatus(STATUS_ID, undefined);
	}

	function stopTimer(): void {
		if (refreshTimer) clearInterval(refreshTimer);
		refreshTimer = undefined;
	}

	function ensureTimer(): void {
		if (refreshTimer) return;
		refreshTimer = setInterval(() => {
			if (!currentCtx || !isCodexModel(currentCtx.model as ModelLike | undefined)) return;
			void refresh(currentCtx, { showLoading: false });
		}, REFRESH_INTERVAL_MS);
	}

	async function refresh(ctx: ExtensionContext, options: { showLoading: boolean }): Promise<void> {
		currentCtx = ctx;
		if (!ctx.hasUI || !isCodexModel(ctx.model as ModelLike | undefined)) {
			clear(ctx);
			stopTimer();
			return;
		}
		ensureTimer();
		if (inFlight) return inFlight;

		const previous = state.kind === "available" ? state.usage : state.kind === "loading" ? state.previous : undefined;
		if (options.showLoading || !previous) {
			state = { kind: "loading", previous };
			render(ctx);
		}

		inFlight = (async () => {
			state = await fetchUsage(pi, ctx);
			render(ctx);
		})().finally(() => {
			inFlight = undefined;
		});
		return inFlight;
	}

	pi.on("session_start", async (_event, ctx) => {
		currentCtx = ctx;
		if (!ctx.hasUI) return;
		if (isCodexModel(ctx.model as ModelLike | undefined)) await refresh(ctx, { showLoading: true });
		else clear(ctx);
	});

	pi.on("model_select", async (event, ctx) => {
		currentCtx = ctx;
		if (!ctx.hasUI) return;
		if (!isCodexModel(event.model as ModelLike | undefined)) {
			clear(ctx);
			stopTimer();
			return;
		}
		await refresh(ctx, { showLoading: true });
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		stopTimer();
		clear(ctx);
		currentCtx = undefined;
	});
}
