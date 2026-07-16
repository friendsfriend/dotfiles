import { DynamicBorder, type ExtensionAPI, type ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Container, Key, matchesKey, type SelectItem, SelectList, Text } from "@earendil-works/pi-tui";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);
const workflow = path.join(process.env.HOME!, ".pi", "agent", "bin", "herdr-workflow");

async function execute(args: string[]) {
  const { stdout, stderr } = await execFileAsync(workflow, args, { timeout: 120_000, maxBuffer: 1024 * 1024 });
  return (stdout || stderr).trim();
}

async function pagedSelect(ctx: ExtensionCommandContext, title: string, values: string[], height: number) {
  const items: SelectItem[] = values.map(label => ({ value: label.replace(/^[●○]\s+/, ""), label }));
  return ctx.ui.custom<string | null>((tui, theme, _keybindings, done) => {
    const container = new Container();
    let filter = "";
    container.addChild(new DynamicBorder((text: string) => theme.fg("accent", text)));
    const heading = new Text(theme.fg("accent", theme.bold(title)), 1, 0);
    const filterText = new Text(theme.fg("muted", "Filter: "), 1, 0);
    container.addChild(heading);
    container.addChild(filterText);
    const list = new SelectList(items, Math.min(items.length, height), {
      selectedPrefix: text => theme.fg("accent", text),
      selectedText: text => theme.fg("accent", text),
      description: text => theme.fg("muted", text),
      scrollInfo: text => theme.fg("dim", text),
      noMatch: text => theme.fg("warning", text),
    });
    list.onSelect = item => done(item.label);
    list.onCancel = () => done(null);
    container.addChild(list);
    container.addChild(new Text(theme.fg("dim", "type filter • ↑↓ scroll • enter select • esc cancel"), 1, 0));
    container.addChild(new DynamicBorder((text: string) => theme.fg("accent", text)));
    return {
      render: width => container.render(width),
      invalidate: () => container.invalidate(),
      handleInput: data => {
        if (matchesKey(data, Key.backspace)) {
          filter = filter.slice(0, -1);
          list.setFilter(filter);
        } else if (matchesKey(data, Key.escape) && filter) {
          filter = "";
          list.setFilter(filter);
        } else if (data.length === 1 && data.charCodeAt(0) >= 32 && data.charCodeAt(0) !== 127) {
          filter += data;
          list.setFilter(filter);
        } else {
          list.handleInput(data);
        }
        filterText.setText(theme.fg("muted", `Filter: ${filter}`));
        tui.requestRender();
      },
    };
  });
}

export default function (pi: ExtensionAPI) {
  if (process.env.HERDR_ROLE !== "manager") return;

  pi.registerCommand("implementation", {
    description: "Discover a project and create an OpenSpec implementation workspace",
    handler: async (_args, ctx) => {
      try {
        const config = JSON.parse(await execute(["config"])) as {
          models: { worker_default: string; worker_alternative: string };
          ui: { selection_height: number };
        };
        const height = Math.max(3, config.ui.selection_height);
        const projects = JSON.parse(await execute(["projects"])) as Array<{ name: string; path: string; openspec: boolean }>;
        if (!projects.length) {
          ctx.ui.notify("No Git projects found in configured discovery path.", "warning");
          return;
        }
        const labels = projects.map(project => `${project.openspec ? "●" : "○"} ${project.name}`);
        const selected = await pagedSelect(ctx, "Select project", labels, height);
        if (!selected) return;
        const project = projects[labels.indexOf(selected)];
        if (!project.openspec) {
          ctx.ui.notify(`${project.path} has no openspec/config.yaml`, "warning");
          return;
        }
        const ticket = (await ctx.ui.input("Ticket identifier (optional)", "for example DAPC-123; leave empty to skip"))?.trim() ?? "";
        const change = (await ctx.ui.input("OpenSpec change ID", "lowercase-kebab-case"))?.trim();
        if (!change || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(change)) {
          if (change) ctx.ui.notify("Change ID must use lowercase kebab-case.", "error");
          return;
        }
        const task = (await ctx.ui.editor("Implementation task", ""))?.trim();
        if (!task) return;
        const mode = await pagedSelect(ctx, "Git checkout mode", ["worktree", "checkout"], height);
        if (!mode) return;
        const workers = [config.models.worker_default, config.models.worker_alternative];
        const worker = await pagedSelect(ctx, "Worker model", workers, height);
        if (!worker) return;
        if (!await ctx.ui.confirm("Create implementation workspace?", `${project.name}\n${ticket ? `Ticket ${ticket}\n` : ""}${change}\n${mode}\n${worker}`)) return;
        const startArgs = ["start", "--repo", project.path, "--change", change, "--task", task, "--mode", mode, "--worker", worker];
        if (ticket) startArgs.push("--ticket", ticket);
        await execute(startArgs);
        ctx.ui.notify(`Created ${change}`, "info");
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerTool({
    name: "herdr_workflow",
    label: "Herdr Workflow",
    description: "Explicitly create and advance Herdr OpenSpec workspaces. Never call without a matching user request.",
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("start"), Type.Literal("status"), Type.Literal("apply"),
        Type.Literal("verify"), Type.Literal("archive"), Type.Literal("close"), Type.Literal("message"),
      ]),
      repo: Type.String(),
      change: Type.String(),
      task: Type.Optional(Type.String()),
      ticket: Type.Optional(Type.String()),
      mode: Type.Optional(Type.Union([Type.Literal("worktree"), Type.Literal("checkout")])),
      worker: Type.Optional(Type.String()),
      target: Type.Optional(Type.Union([Type.Literal("planner"), Type.Literal("worker"), Type.Literal("verifier"), Type.Literal("archive")])),
      text: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params) {
      const args = [params.action, "--repo", params.repo, "--change", params.change];
      if (params.action === "start") {
        if (!params.task || !params.mode) throw new Error("start requires task and mode");
        args.push("--task", params.task, "--mode", params.mode);
        if (params.ticket) args.push("--ticket", params.ticket);
        if (params.worker) args.push("--worker", params.worker);
      } else if (params.action === "message") {
        if (!params.target || !params.text) throw new Error("message requires target and text");
        args.push("--from", "manager", "--to", params.target, params.text);
      }
      try {
        return { content: [{ type: "text", text: await execute(args) }], details: {} };
      } catch (error) {
        return { content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }], details: {}, isError: true };
      }
    },
  });
}
