/** @jsxImportSource @opentui/solid */
import { TextAttributes, type KeyEvent } from '@opentui/core';
import type { Keymap } from '@opentui/keymap';
import { useRenderer, useTerminalDimensions } from '@opentui/solid';
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { approvalFor, focusAgent, focusWorkspace, loadDashboard, loadVerifierReport, runWorkflow, testDashboard, type DashboardData } from './data';
import { Badge } from './ui/Badge';
import { Header } from './ui/Header';
import { Layout } from './ui/Layout';
import { Panel } from './ui/Panel';
import { StatusBar } from './ui/StatusBar';
import { VerdictModal } from './ui/VerdictModal';
import { HelpModal, type HelpSection } from './ui/HelpModal';
import { uiColors } from './ui/colors';

const statusColor = (status: string) => status === 'working' ? uiColors.primary : status === 'done' || status === 'idle' ? uiColors.success : status === 'blocked' ? uiColors.warning : status === 'closed' ? uiColors.textMuted : uiColors.error;

export function App(props: { repo: string; change: string; profile?: 'test'; keymap: Keymap<any, KeyEvent> }) {
  const renderer = useRenderer();
  const dimensions = useTerminalDimensions();
  const demoPhases = ['proposed', 'apply', 'verify', 'developer-review', 'archive', 'completed'] as const;
  const [demoIndex, setDemoIndex] = createSignal(0);
  const load = () => props.profile === 'test' ? testDashboard(demoPhases[demoIndex()]!) : loadDashboard(props.repo, props.change);
  const [data, setData] = createSignal<DashboardData>(load());
  const [message, setMessage] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [changeOffset, setChangeOffset] = createSignal(0);
  const [agentOffset, setAgentOffset] = createSignal(0);
  const [taskOffset, setTaskOffset] = createSignal(0);
  const [telemetryOffset, setTelemetryOffset] = createSignal(0);
  const [activePanel, setActivePanel] = createSignal(0);
  const [selectedAgent, setSelectedAgent] = createSignal(0);
  const [verdict, setVerdict] = createSignal<{ title: string; content: string }>();
  const [verdictOffset, setVerdictOffset] = createSignal(0);
  const [help, setHelp] = createSignal(false);
  const [helpOffset, setHelpOffset] = createSignal(0);
  const helpSections: HelpSection[] = [{ title: 'Navigation', items: [{ key: 'Tab / Shift+Tab', description: 'Switch panel' }, { key: 'j/k or ↑/↓', description: 'Scroll focused panel' }, { key: 'Esc', description: 'Return to dashboard workspace' }] }, { title: 'Actions', items: [{ key: 'Enter', description: 'Approve workflow gate' }, { key: 'Enter', description: 'Focus selected agent (Agents panel)' }, { key: 'v', description: 'View selected verifier verdict' }, { key: 'r', description: 'Refresh dashboard' }, { key: 'q', description: 'Quit' }, { key: '?', description: 'Open help' }] }];
  const helpMaxOffset = () => Math.max(0, helpSections.reduce((count, section) => count + section.items.length + 1, 0) - Math.max(5, Math.floor(dimensions().height * .78) - 5));
  const verdictLines = createMemo(() => Math.max(4, Math.floor(dimensions().height * 0.75) - 5));
  const closeVerdict = () => { setVerdict(undefined); props.keymap.setData('modal.active', 'none'); };
  const gate = createMemo(() => props.profile === 'test'
    ? { prompt: 'Press Enter to advance demo phase', action: 'next demo phase' }
    : approvalFor(data().state.phase));
  const verificationRows = createMemo(() => {
    const state = data().state;
    if (!state.verificationTier && !state.verificationTimeoutRoles) return [];
    const roles = state.verificationRoles ?? [];
    const completed = Object.keys(state.verificationResults ?? {}).filter(role => role !== 'coordinator').length;
    const elapsed = state.verificationStartedAt ? Math.floor((Date.now() - Date.parse(state.verificationStartedAt)) / 60000) : 0;
    return [`Verification  ${state.verificationTier ?? 'timed out'} · ${completed}/${roles.length} reviews · ${elapsed}m`, ...(state.verificationTimeoutRoles?.length ? [`Timed out: ${state.verificationTimeoutRoles.join(', ')}`] : [])];
  });
  const planRows = createMemo(() => { const plan = data().state.planQuality; return plan ? [`Plan gate  ${plan.passed ? 'PASS' : 'FAIL'} · ${plan.specFiles} specs · ${plan.taskCount} tasks`, ...plan.issues.map(issue => `Plan issue: ${issue}`)] : []; });
  const changeRows = createMemo(() => [...planRows(), ...(data().state.ticketNumber ? [`Ticket  ${data().state.ticketNumber}`] : []), `Age  ${data().age}`, `Health  ${data().health.dirty ? 'dirty' : 'clean'} · ↑${data().health.ahead} ↓${data().health.behind}`, ...verificationRows(), 'Current activity', data().currentTask, 'Recent events', ...data().events.map(event => `${event.at}  ${event.event}`), 'Request', data().request, 'Proposal', data().proposal, `Review  ${data().review}`, ...(data().state.phase === 'developer-review' ? ['Review history', ...data().reviewHistory] : [])]);
  const visibleChangeCount = 8;
  const visibleAgentCount = 7;
  const visibleChanges = createMemo(() => changeRows().slice(changeOffset(), changeOffset() + visibleChangeCount));
  const visibleAgents = createMemo(() => data().agents.slice(agentOffset(), agentOffset() + visibleAgentCount));
  const visibleTaskCount = createMemo(() => Math.max(3, dimensions().height - 22));
  const visibleTasks = createMemo(() => data().tasks.slice(taskOffset(), taskOffset() + visibleTaskCount()));
  const telemetryRows = createMemo(() => [
    ...data().verifierTimeline.map(item => `${item.role.replace('-verifier', '')}  ${item.status}  ${item.durationSeconds ?? 0}s  ${item.model ?? 'unknown'}${item.providerErrors ? `  errors:${item.providerErrors}` : ''}${item.fallback ? '  fallback' : ''}`),
    ...data().telemetrySummary.map(item => `model ${item.model}  ${item.durationSeconds}s  in:${item.inputTokens} out:${item.outputTokens}  $${item.cost.toFixed(3)}  errors:${item.errors} fallback:${item.fallbacks}`),
  ]);
  const visibleTelemetryCount = createMemo(() => Math.max(3, dimensions().height - 22));
  const visibleTelemetry = createMemo(() => telemetryRows().slice(telemetryOffset(), telemetryOffset() + visibleTelemetryCount()));

  const refresh = () => {
    try {
      setData(load());
      setChangeOffset(offset => Math.min(offset, Math.max(0, changeRows().length - visibleChangeCount)));
      setAgentOffset(offset => Math.min(offset, Math.max(0, data().agents.length - visibleAgentCount)));
      setSelectedAgent(index => Math.min(index, Math.max(0, data().agents.length - 1)));
      setTaskOffset(offset => Math.min(offset, Math.max(0, data().tasks.length - visibleTaskCount())));
      setTelemetryOffset(offset => Math.min(offset, Math.max(0, telemetryRows().length - visibleTelemetryCount())));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  onMount(() => {
    const timer = setInterval(refresh, 5000);
    onCleanup(() => clearInterval(timer));
  });

  const handleKey = async (key: KeyEvent) => {
    if (busy()) return;
    const name = key.name.toLowerCase();
    if (name === 'q') {
      renderer.destroy();
      return;
    }
    if (name === 'escape') {
      try {
        const workspace = (props.profile === 'test' ? data() : loadDashboard(props.repo, props.change)).state.returnWorkspace;
        if (!workspace) throw new Error('No dashboard workspace recorded. Open this workflow from the overview first.');
        focusWorkspace(workspace);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      }
      return;
    }
    if (name === '?') { setHelp(true); setHelpOffset(0); props.keymap.setData('modal.active', 'help'); return; }
    if (name === 'v' && activePanel() === 1) {
      const agent = data().agents[selectedAgent()];
      if (!agent?.role.endsWith('verifier')) { setMessage('Select a verifier agent to view its verdict.'); return; }
      try {
        setVerdict(props.profile === 'test' ? { title: `${agent.role} · demo`, content: 'VERDICT: PASS\n\n## VALIDATION\nDemo verifier report.' } : loadVerifierReport(props.repo, props.change, agent.role));
        setVerdictOffset(0);
        props.keymap.setData('modal.active', 'verdict');
      } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
      return;
    }
    if (key.name === 'r') {
      refresh();
      setMessage('Refreshed');
      return;
    }
    if (name === 'j' && key.shift || name === 'k' && key.shift || name === 'tab') {
      setActivePanel(panel => (name === 'k' || (name === 'tab' && key.shift)) ? (panel + 3) % 4 : (panel + 1) % 4);
      return;
    }
    if (name === 'down' || name === 'j') {
      if (activePanel() === 0) setChangeOffset(offset => Math.min(Math.max(0, changeRows().length - visibleChangeCount), offset + 1));
      else if (activePanel() === 1) setSelectedAgent(index => { const next = Math.min(data().agents.length - 1, index + 1); setAgentOffset(offset => next >= offset + visibleAgentCount ? next - visibleAgentCount + 1 : offset); return next; });
      else if (activePanel() === 2) setTaskOffset(offset => Math.min(Math.max(0, data().tasks.length - visibleTaskCount()), offset + 1));
      else if (activePanel() === 3) setTelemetryOffset(offset => Math.min(Math.max(0, telemetryRows().length - visibleTelemetryCount()), offset + 1));
      return;
    }
    if (name === 'up' || name === 'k') {
      if (activePanel() === 0) setChangeOffset(offset => Math.max(0, offset - 1));
      else if (activePanel() === 1) setSelectedAgent(index => { const next = Math.max(0, index - 1); setAgentOffset(offset => next < offset ? next : offset); return next; });
      else if (activePanel() === 2) setTaskOffset(offset => Math.max(0, offset - 1));
      else if (activePanel() === 3) setTelemetryOffset(offset => Math.max(0, offset - 1));
      return;
    }
    if (name === 'enter' || name === 'return') {
      if (activePanel() === 1) {
        const agent = data().agents[selectedAgent()];
        if (!agent) return;
        try { focusAgent(data().state, data().state.panes[agent.role]!); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
        return;
      }
      const approval = gate();
      if (!approval) return;
      setBusy(true);
      setMessage(`Running ${approval.action}…`);
      try {
        if (props.profile === 'test') {
          setDemoIndex(index => (index + 1) % demoPhases.length);
          setMessage('Advanced dummy workflow');
        } else {
          setMessage(await runWorkflow(approval.action, props.repo, props.change));
        }
        refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    }
  };
  onMount(() => {
    props.keymap.setData('app.view', 'detail');
    props.keymap.setData('modal.active', 'none');
    const disposeHelp = props.keymap.registerLayer({ name: 'help', priority: 1000, activeModal: 'help', commands: [{ name: 'help.handle', run: ({ event }) => { const key = event.name.toLowerCase(); if (key === 'escape') { setHelp(false); props.keymap.setData('modal.active', 'none'); } else if (key === 'j' || key === 'down') setHelpOffset(value => Math.min(helpMaxOffset(), value + 1)); else if (key === 'k' || key === 'up') setHelpOffset(value => Math.max(0, value - 1)); return true; } }], bindings: ['escape', 'j', 'k', 'up', 'down'].map(key => ({ key, cmd: 'help.handle' })) });
    const disposeVerdict = props.keymap.registerLayer({ name: 'verdict', priority: 1000, activeModal: 'verdict',
      commands: [{ name: 'verdict.handle', run: ({ event }) => {
        const name = event.name.toLowerCase();
        const max = () => Math.max(0, (verdict()?.content.split(/\r?\n/).length ?? 0) - verdictLines());
        if (name === 'escape') closeVerdict();
        else if (name === 'j' || name === 'down') setVerdictOffset(offset => Math.min(max(), offset + 1));
        else if (name === 'k' || name === 'up') setVerdictOffset(offset => Math.max(0, offset - 1));
        else if (name === 'd') setVerdictOffset(offset => Math.min(max(), offset + verdictLines()));
        else if (name === 'u') setVerdictOffset(offset => Math.max(0, offset - verdictLines()));
        return true;
      } }],
      bindings: ['escape', 'j', 'k', 'd', 'u', 'up', 'down'].map(key => ({ key, cmd: 'verdict.handle' })),
    });
    const dispose = props.keymap.registerLayer({ name: 'detail', priority: 100, appView: 'detail', activeModal: 'none',
      commands: [{ name: 'detail.handle', run: ({ event }) => { void handleKey(event); return true; } }],
      bindings: ['q', 'r', 'v', '?', 'j', 'k', 'J', 'K', 'tab', 'shift+tab', 'up', 'down', 'enter', 'return', 'escape'].map(key => ({ key, cmd: 'detail.handle' })),
    });
    onCleanup(() => { disposeHelp(); disposeVerdict(); dispose(); });
  });

  const doneTasks = createMemo(() => data().tasks.filter(task => task.done).length);
  const prompt = createMemo(() => data().state.phase === 'paused'
    ? 'Verification paused · developer intervention required'
    : gate()?.prompt ?? 'Waiting for workflow activity');

  return (
    <box width={dimensions().width} height={dimensions().height}>
    <Layout
      header={<Header change={data().state.changeId} phase={data().state.phase} branch={data().state.branch} updated={data().updated} />}
      content={
        <box backgroundColor={uiColors.bgBase} style={{ width: '100%', height: '100%', flexDirection: 'column', padding: 1, gap: 1 }}>
          <box style={{ width: '100%', height: 10, flexDirection: 'row', gap: 1 }}>
            <Panel title="Change" accent={uiColors.primary} active={activePanel() === 0} style={{ flexGrow: 1, height: '100%' }}> 
              <For each={visibleChanges()}>{line => <text fg={line === 'Request' || line === 'Proposal' || line === 'Current activity' || line === 'Recent events' || line === 'Review history' ? uiColors.textMuted : line.startsWith('Health') && data().health.dirty ? uiColors.warning : uiColors.textPrimary}>{line}</text>}</For>
              <Show when={changeRows().length > visibleChangeCount}><text fg={uiColors.textMuted}>j/k scroll · {changeOffset() + 1}-{Math.min(changeRows().length, changeOffset() + visibleChangeCount)}/{changeRows().length}</text></Show>
            </Panel>
            <Panel title="Agents · Enter focuses" accent={uiColors.accent} active={activePanel() === 1} style={{ flexGrow: 2, height: '100%' }}> 
              <For each={visibleAgents()}>{(agent, index) => {
                const selected = () => activePanel() === 1 && selectedAgent() === agentOffset() + index();
                return <box backgroundColor={selected() ? uiColors.bgSurface1 : undefined} style={{ width: '100%', height: 1, flexDirection: 'row' }}>
                  <text fg={selected() ? uiColors.accent : uiColors.textMuted}>{selected() ? '›' : ' '}</text>
                  <box style={{ width: 23, flexShrink: 0, overflow: 'hidden' }}><text fg={uiColors.textSecondary} attributes={TextAttributes.BOLD}>{agent.role}</text></box>
                  <Badge text={agent.status} highlight={agent.status === 'working' ? 'highlight2' : agent.status === 'done' || agent.status === 'idle' ? 'positive' : agent.status === 'blocked' ? 'warning' : 'secondary'} animatedTone={agent.status === 'working' ? 'highlight2' : undefined} transitionKey={agent.role} />
                </box>;
              }}</For>
              <Show when={data().agents.length > visibleAgentCount}><text fg={uiColors.textMuted}>j/k scroll · {agentOffset() + 1}-{Math.min(data().agents.length, agentOffset() + visibleAgentCount)}/{data().agents.length}</text></Show>
            </Panel>
          </box>
          <box style={{ width: '100%', flexGrow: 1, minHeight: 0, flexDirection: 'row', gap: 1 }}>
            <Panel title={`Current task · ${doneTasks()}/${data().tasks.length}`} accent={uiColors.success} active={activePanel() === 2} style={{ flexGrow: 1, minWidth: 0 }}>
              <Show when={visibleTasks().length} fallback={<text fg={uiColors.textMuted}>No tasks yet</text>}>
                <For each={visibleTasks()}>{task => <text fg={task.done ? uiColors.success : uiColors.textSecondary}>{task.done ? '✓' : '○'} {task.text}</text>}</For>
                <Show when={data().tasks.length > visibleTaskCount()}><text fg={uiColors.textMuted}>j/k scroll · {taskOffset() + 1}-{Math.min(data().tasks.length, taskOffset() + visibleTaskCount())}/{data().tasks.length}</text></Show>
              </Show>
            </Panel>
            <Panel title="Verification timeline" accent={uiColors.info} active={activePanel() === 3} style={{ flexGrow: 1, minWidth: 0 }}>
              <Show when={visibleTelemetry().length} fallback={<text fg={uiColors.textMuted}>No verification telemetry yet</text>}>
                <For each={visibleTelemetry()}>{line => <text fg={uiColors.textSecondary}>{line}</text>}</For>
                <Show when={telemetryRows().length > visibleTelemetryCount()}><text fg={uiColors.textMuted}>j/k scroll · {telemetryOffset() + 1}-{Math.min(telemetryRows().length, telemetryOffset() + visibleTelemetryCount())}/{telemetryRows().length}</text></Show>
              </Show>
            </Panel>
          </box>
        </box>
      }
      footer={<StatusBar prompt={activePanel() === 1 ? 'Selected agent' : activePanel() === 3 ? 'Verification timeline' : prompt()} message={message()} approval={activePanel() !== 1 && !!gate() && !busy()} keybinds={[...(activePanel() !== 1 && !!gate() && !busy() ? [{ key: 'Enter', action: 'approve' }] : activePanel() === 1 ? [{ key: 'Enter', action: 'focus agent' }, { key: 'v', action: 'view verdict' }] : []), { key: 'r', action: 'refresh' }, { key: 'Esc', action: 'dashboard' }, { key: 'q', action: 'quit' }]} />}
    />
    <Show when={help()}><HelpModal title="Dashboard keybindings" sections={helpSections} offset={helpOffset()} lines={Math.max(5, Math.floor(dimensions().height * .78) - 5)} /></Show>
    <Show when={verdict()}>{report => <VerdictModal title={report().title} content={report().content} offset={verdictOffset()} lines={verdictLines()} />}</Show>
    </box>
  );
}
