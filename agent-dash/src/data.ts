import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface WorkflowState {
  changeId: string;
  phase: string;
  repository: string;
  worktree: string;
  branch: string;
  workspace: string;
  verificationRound: number;
  panes: Record<string, string>;
}

export interface DashboardData {
  state: WorkflowState;
  request: string;
  proposal: string;
  tasks: Array<{ done: boolean; text: string }>;
  review: string;
  agents: Array<{ role: string; status: string }>;
  updated: string;
}

const read = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : '';

function summary(path: string) {
  const lines = read(path).split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#') && !line.startsWith('<!--'));
  return lines.slice(0, 3).map(line => line.replace(/^[-*]\s+/, '')).join(' ') || 'Not created yet';
}

function tasks(path: string) {
  return [...read(path).matchAll(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/gm)].map(match => ({ done: match[1]!.toLowerCase() === 'x', text: match[2]!.trim() }));
}

function latestReview(root: string) {
  if (!existsSync(root)) return 'Not run';
  const files = readdirSync(root).filter(file => /^round-.*\.md$/.test(file)).sort();
  const latest = files.at(-1);
  if (!latest) return 'Not run';
  const verdict = read(join(root, latest)).match(/VERDICT:\s*(PASS|FAIL)/)?.[1] ?? 'UNKNOWN';
  return `${latest}: ${verdict}`;
}

function agentStatuses() {
  const result = Bun.spawnSync(['herdr', 'agent', 'list'], { stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) return new Map<string, string>();
  try {
    const agents = JSON.parse(result.stdout.toString()).result.agents as Array<{ pane_id: string; agent_status: string }>;
    return new Map(agents.map(agent => [agent.pane_id, agent.agent_status]));
  } catch {
    return new Map<string, string>();
  }
}

export function loadDashboard(repo: string, change: string): DashboardData {
  const state = JSON.parse(read(join(repo, '.herdr-workflow', change, 'state.json'))) as WorkflowState;
  const workflowRoot = join(state.worktree, '.herdr-workflow', change);
  const changeRoot = join(state.worktree, 'openspec', 'changes', change);
  const statuses = agentStatuses();
  const closedPlannerPhases = new Set(['verify', 'fix', 'paused', 'developer-review', 'archive', 'completed', 'closed']);
  return {
    state,
    request: summary(join(workflowRoot, 'request.md')),
    proposal: summary(join(changeRoot, 'proposal.md')),
    tasks: tasks(join(changeRoot, 'tasks.md')),
    review: latestReview(join(workflowRoot, 'reviews')),
    agents: Object.entries(state.panes)
      .filter(([role]) => !['git', 'dashboard'].includes(role))
      .map(([role, pane]) => ({ role, status: statuses.get(pane) ?? (role === 'planner' && closedPlannerPhases.has(state.phase) ? 'closed' : 'not started') })),
    updated: new Date().toLocaleTimeString(),
  };
}

export function testDashboard(phase = 'proposed'): DashboardData {
  const applying = ['apply', 'verify', 'developer-review', 'archive', 'completed', 'closed'].includes(phase);
  const verified = ['developer-review', 'archive', 'completed', 'closed'].includes(phase);
  const archived = ['completed', 'closed'].includes(phase);
  return {
    state: {
      changeId: 'demo-optional-realisation-date',
      phase,
      repository: '/demo/customer-mw',
      worktree: '/demo/worktrees/demo-optional-realisation-date',
      branch: 'feature/demo-optional-realisation-date',
      workspace: 'demo',
      verificationRound: verified ? 2 : phase === 'verify' ? 1 : 0,
      panes: { dashboard: 'demo:p1', planner: 'demo:p2', worker: 'demo:p3', verifier: 'demo:p4', git: 'demo:p5' },
    },
    request: 'Make preferredLatestRealisationDate optional and default it to null.',
    proposal: 'Update API contract, persistence mapping, form defaults, and regression coverage while preserving existing supplied values.',
    tasks: [
      { done: applying, text: 'Make API field optional and nullable' },
      { done: applying, text: 'Use null as default value' },
      { done: verified, text: 'Update frontend form handling' },
      { done: verified, text: 'Add regression tests' },
      { done: archived, text: 'Archive OpenSpec change' },
    ],
    review: verified ? 'round-2.md: PASS' : phase === 'verify' ? 'round-1.md: FAIL' : 'Not run',
    agents: [
      { role: 'planner', status: applying ? 'closed' : 'idle' },
      { role: 'worker', status: phase === 'apply' ? 'working' : applying ? 'idle' : 'not started' },
      { role: 'verifier', status: phase === 'verify' ? 'working' : verified ? 'done' : 'not started' },
      ...(phase === 'archive' || archived ? [{ role: 'archive', status: archived ? 'done' : 'working' }] : []),
    ],
    updated: new Date().toLocaleTimeString(),
  };
}

export function approvalFor(phase: string) {
  return ({
    proposed: { prompt: 'Press Enter to approve apply', action: 'apply' },
    'developer-review': { prompt: 'Press Enter to approve archive', action: 'archive' },
    completed: { prompt: 'Press Enter to close Herdr workspace', action: 'close' },
  } as Record<string, { prompt: string; action: string }>)[phase];
}

export async function runWorkflow(action: string, repo: string, change: string) {
  const process = Bun.spawn(['herdr-workflow', action, '--repo', repo, '--change', change], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([new Response(process.stdout).text(), new Response(process.stderr).text(), process.exited]);
  if (exitCode !== 0) throw new Error((stderr || stdout || `${action} failed`).trim());
  return stdout.trim() || `${action} complete`;
}
