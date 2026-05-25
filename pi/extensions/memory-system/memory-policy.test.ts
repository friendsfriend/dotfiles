import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSessionBootContext, extractEffectiveIntent, isAutomaticInjectionCandidate, memoryMatchesQuery, selectMemoryCard } from "./index";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(join(__dirname, "memory-policy.fixtures.json"), "utf8")) as {
	effectiveIntent: Array<{ name: string; prompt: string; expectedIncludes: string[]; expectedExcludes: string[] }>;
	selection: { genericToolPrompt: string; preferencePrompt: string; entries: any[] };
};

for (const fixture of fixtures.effectiveIntent) {
	const intent = extractEffectiveIntent(fixture.prompt).query;
	for (const expected of fixture.expectedIncludes) assert.match(intent, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${fixture.name} should preserve ${expected}`);
	for (const unexpected of fixture.expectedExcludes) assert.doesNotMatch(intent, new RegExp(unexpected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${fixture.name} should remove ${unexpected}`);
}

const entries = fixtures.selection.entries;
const genericSelection = selectMemoryCard(fixtures.selection.genericToolPrompt, entries, { tokenBudget: 900, maxEntriesPerCard: 5 });
assert.equal(genericSelection.ids.includes("tool-cold"), false, "tool-result summaries stay cold for generic tool/OpenSpec prompts");
assert.equal(isAutomaticInjectionCandidate(entries.find((entry) => entry.id === "tool-cold"), fixtures.selection.genericToolPrompt), false);

const preferenceSelection = selectMemoryCard(fixtures.selection.preferencePrompt, entries, { tokenBudget: 900, maxEntriesPerCard: 5 });
assert.equal(preferenceSelection.ids.includes("pref-hot"), true, "pinned preferences remain automatic injection candidates when relevant");
assert.equal(isAutomaticInjectionCandidate(entries.find((entry) => entry.id === "decision-hot"), "memory injection policy"), true, "explicit durable decisions remain hot candidates");

const bootContext = buildSessionBootContext(entries);
assert.match(bootContext.card, /memory_query/, "session-start boot context points agents to explicit memory query");
assert.match(bootContext.card, /memory_save/, "session-start boot context points agents to explicit memory save");
assert.equal(bootContext.ids.includes("decision-hot"), false, "session-start boot context does not select routine per-turn memories");

const savedDecision = { ...entries.find((entry) => entry.id === "decision-hot"), sourceKind: "agent-saved", source: { relatedFiles: ["pi/extensions/memory-system/index.ts"], relatedChange: "add-tool-queried-memory-graph-summaries" }, tags: ["agent-saved", "change:add-tool-queried-memory-graph-summaries", "file:pi/extensions/memory-system/index.ts"] };
assert.equal(memoryMatchesQuery(savedDecision, { query: "memory injection", type: "decision", relatedFile: "memory-system/index.ts", change: "add-tool-queried-memory-graph-summaries" }), true, "explicit memory query supports type, text, related file, and change filters");
