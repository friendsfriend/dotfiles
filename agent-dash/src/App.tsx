/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { useKeyboard, useRenderer, useTerminalDimensions } from '@opentui/solid';
import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { approvalFor, loadDashboard, runWorkflow, testDashboard, type DashboardData } from './data';
import { Header } from './ui/Header';
import { Layout } from './ui/Layout';
import { Panel } from './ui/Panel';
import { StatusBar } from './ui/StatusBar';
import { uiColors } from './ui/colors';

const statusColor = (status: string) => status === 'working' ? uiColors.primary : status === 'done' || status === 'idle' ? uiColors.success : status === 'blocked' ? uiColors.warning : status === 'closed' ? uiColors.textMuted : uiColors.error;

export function App(props: { repo: string; change: string; profile?: 'test' }) {
  const renderer = useRenderer();
  const dimensions = useTerminalDimensions();
  const demoPhases = ['proposed', 'apply', 'verify', 'developer-review', 'archive', 'completed'] as const;
  const [demoIndex, setDemoIndex] = createSignal(0);
  const load = () => props.profile === 'test' ? testDashboard(demoPhases[demoIndex()]!) : loadDashboard(props.repo, props.change);
  const [data, setData] = createSignal<DashboardData>(load());
  const [message, setMessage] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [taskOffset, setTaskOffset] = createSignal(0);
  const gate = createMemo(() => props.profile === 'test'
    ? { prompt: 'Press Enter to advance demo phase', action: 'next demo phase' }
    : approvalFor(data().state.phase));
  const visibleTaskCount = createMemo(() => Math.max(3, dimensions().height - 22));
  const visibleTasks = createMemo(() => data().tasks.slice(taskOffset(), taskOffset() + visibleTaskCount()));

  const refresh = () => {
    try {
      setData(load());
      setTaskOffset(offset => Math.min(offset, Math.max(0, data().tasks.length - visibleTaskCount())));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  onMount(() => {
    const timer = setInterval(refresh, 5000);
    onCleanup(() => clearInterval(timer));
  });

  useKeyboard(async key => {
    if (busy()) return;
    if (key.name === 'q' || (key.name === 'c' && key.ctrl)) {
      renderer.destroy();
      return;
    }
    if (key.name === 'r') {
      refresh();
      setMessage('Refreshed');
      return;
    }
    if (key.name === 'down' || key.name === 'j') {
      setTaskOffset(offset => Math.min(Math.max(0, data().tasks.length - visibleTaskCount()), offset + 1));
      return;
    }
    if (key.name === 'up' || key.name === 'k') {
      setTaskOffset(offset => Math.max(0, offset - 1));
      return;
    }
    if (key.name === 'enter' || key.name === 'return') {
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
  });

  const doneTasks = createMemo(() => data().tasks.filter(task => task.done).length);
  const prompt = createMemo(() => data().state.phase === 'paused'
    ? 'Verification paused · developer intervention required'
    : gate()?.prompt ?? 'Waiting for workflow activity');

  return (
    <Layout
      header={<Header change={data().state.changeId} phase={data().state.phase} branch={data().state.branch} updated={data().updated} />}
      content={
        <box backgroundColor={uiColors.bgBase} style={{ width: '100%', height: '100%', flexDirection: 'column', padding: 1, gap: 1 }}>
          <box style={{ width: '100%', height: 9, flexDirection: 'row', gap: 1 }}>
            <Panel title="Change" accent={uiColors.primary} style={{ flexGrow: 2, height: '100%' }}>
              <text fg={uiColors.textMuted}>Request</text>
              <text fg={uiColors.textPrimary}>{data().request}</text>
              <text fg={uiColors.textMuted}>Proposal</text>
              <text fg={uiColors.textPrimary}>{data().proposal}</text>
              <text fg={uiColors.textMuted}>Review  <span style={{ fg: uiColors.textPrimary }}>{data().review}</span></text>
            </Panel>
            <Panel title="Agents" accent={uiColors.accent} style={{ flexGrow: 1, height: '100%' }}>
              <For each={data().agents}>{agent => (
                <box style={{ flexDirection: 'row' }}>
                  <box style={{ width: 12 }}><text fg={uiColors.textSecondary} attributes={TextAttributes.BOLD}>{agent.role}</text></box>
                  <text fg={statusColor(agent.status)}>● {agent.status}</text>
                </box>
              )}</For>
            </Panel>
          </box>
          <Panel title={`Tasks · ${doneTasks()}/${data().tasks.length}`} accent={uiColors.success} style={{ width: '100%', flexGrow: 1, minHeight: 0 }}>
            <Show when={visibleTasks().length} fallback={<text fg={uiColors.textMuted}>No tasks yet</text>}>
              <For each={visibleTasks()}>{task => (
                <text fg={task.done ? uiColors.success : uiColors.textSecondary}>{task.done ? '✓' : '○'} {task.text}</text>
              )}</For>
              <Show when={data().tasks.length > visibleTaskCount()}>
                <text fg={uiColors.textMuted}>j/k scroll · {taskOffset() + 1}-{Math.min(data().tasks.length, taskOffset() + visibleTaskCount())}/{data().tasks.length}</text>
              </Show>
            </Show>
          </Panel>
        </box>
      }
      footer={<StatusBar prompt={prompt()} message={message()} approval={!!gate() && !busy()} />}
    />
  );
}
