import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type OpenSpecChange = {
  name: string;
  completedTasks?: number;
  totalTasks?: number;
  lastModified?: string;
  status?: string;
};

type OpenSpecList = {
  changes?: OpenSpecChange[];
};

async function listChanges(cwd: string): Promise<OpenSpecChange[]> {
  const { stdout } = await execFileAsync("openspec", ["list", "--json"], {
    cwd,
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });

  const parsed = JSON.parse(stdout) as OpenSpecList | OpenSpecChange[];
  return Array.isArray(parsed) ? parsed : parsed.changes ?? [];
}

function taskCounts(change: OpenSpecChange): { complete: number; total: number } {
  return {
    complete: Number(change.completedTasks ?? 0),
    total: Number(change.totalTasks ?? 0),
  };
}

function isFinished(change: OpenSpecChange): boolean {
  const { complete, total } = taskCounts(change);
  return total > 0 && complete >= total;
}

function labelFor(change: OpenSpecChange): string {
  const { complete, total } = taskCounts(change);
  const progress = total > 0 ? `${complete}/${total} tasks` : "no tasks";
  const status = change.status ? ` · ${change.status}` : "";
  return `${change.name} (${progress}${status})`;
}

async function chooseOpenSpecChange(
  cwd: string,
  mode: "apply" | "archive",
  ui: { select(title: string, options: string[]): Promise<string | undefined>; notify(message: string, type?: "info" | "warning" | "error"): void },
): Promise<string | undefined> {
  let changes: OpenSpecChange[];
  try {
    changes = await listChanges(cwd);
  } catch (error) {
    ui.notify(`Could not load OpenSpec changes: ${error instanceof Error ? error.message : String(error)}`, "error");
    return undefined;
  }

  const filtered = changes.filter((change) => (mode === "apply" ? !isFinished(change) : isFinished(change)));
  if (filtered.length === 0) {
    ui.notify(
      mode === "apply"
        ? "No unfinished OpenSpec changes found."
        : "No finished OpenSpec changes found. Complete all tasks before archiving.",
      "warning",
    );
    return undefined;
  }

  const labels = filtered.map(labelFor);
  const selected = await ui.select(
    mode === "apply" ? "Apply unfinished OpenSpec change:" : "Archive finished OpenSpec change:",
    labels,
  );
  if (!selected) return undefined;

  return filtered[labels.indexOf(selected)]?.name;
}

export default function(pi: ExtensionAPI) {
  pi.registerCommand("apply", {
    description: "Pick an unfinished OpenSpec change and run /skill:openspec-apply-change <change>",
    handler: async (_args, ctx) => {
      const change = await chooseOpenSpecChange(ctx.cwd, "apply", ctx.ui);
      if (!change) return;

      await ctx.waitForIdle();
      pi.sendUserMessage(`/skill:openspec-apply-change ${change}`);
    },
  });

  pi.registerCommand("archive", {
    description: "Pick a finished OpenSpec change and run /skill:openspec-archive-change <change> --sync-now",
    handler: async (_args, ctx) => {
      const change = await chooseOpenSpecChange(ctx.cwd, "archive", ctx.ui);
      if (!change) return;

      await ctx.waitForIdle();
      pi.sendUserMessage(`/skill:openspec-archive-change ${change} --sync-now`);
    },
  });
}
