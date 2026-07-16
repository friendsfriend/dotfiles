/** @jsxImportSource @opentui/solid */
import { TextAttributes, type KeyEvent, type ScrollBoxRenderable } from '@opentui/core';
import type { Keymap } from '@opentui/keymap';
import { useRenderer, useTerminalDimensions } from '@opentui/solid';
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { approvalFor, focusAgent, focusWorkspace, loadDashboard, loadVerifierFindings, loadVerifierReport, openFindingInEditor, openSpecArtifact, openSpecArtifacts, runWorkflow, testDashboard, type DashboardData } from './data';
import { Badge } from './ui/Badge';
import { HighlightedText } from './ui/Highlight';
import { Header } from './ui/Header';
import { Layout } from './ui/Layout';
import { Panel } from './ui/Panel';
import { StatusBar } from './ui/StatusBar';
import { VerdictModal } from './ui/VerdictModal';
import { ScrollableContent } from './ui/ScrollableContent';
import { VerificationTimelineModal } from './ui/VerificationTimelineModal';
import { FindingsModal, type FindingEvent } from './ui/FindingsModal';
import { EventsModal } from './ui/EventsModal';
import { HelpModal, type HelpSection } from './ui/HelpModal';
import { uiColors } from './ui/colors';
import { NotificationOverlay } from './ui/Notification';
import { notify } from './notifications';
import { copyToClipboard } from './clipboard';
import { applyTheme, saveThemeName, loadThemeName } from './theme-settings';
import { getActiveThemeName, themeNames } from './ui/theme';
import { ThemePickerModal } from './ui/ThemePickerModal';

const statusColor = (status: string) => status === 'working' ? uiColors.primary : status === 'done' || status === 'idle' ? uiColors.success : status === 'blocked' ? uiColors.warning : status === 'closed' ? uiColors.textMuted : uiColors.error;

export function App(props: { repo: string; change: string; profile?: 'test'; keymap: Keymap<any, KeyEvent> }) {
  const renderer = useRenderer();
  const dimensions = useTerminalDimensions();
  const demoPhases = ['proposed', 'apply', 'verify', 'developer-review', 'archive', 'completed'] as const;
  const [demoIndex, setDemoIndex] = createSignal(0);
  const load = () => props.profile === 'test' ? testDashboard(demoPhases[demoIndex()]!) : loadDashboard(props.repo, props.change);
  const [data, setData] = createSignal<DashboardData>(load());
  const [message, setMessage] = createSignal('');
  let lastQuitAt = 0;
  const [busy, setBusy] = createSignal(false);
  let changeScroll: ScrollBoxRenderable | undefined;
  let agentScroll: ScrollBoxRenderable | undefined;
  const [changeOffset, setChangeOffset] = createSignal(0);
  const [agentOffset, setAgentOffset] = createSignal(0);
  const [taskOffset, setTaskOffset] = createSignal(0);
  const [telemetryOffset, setTelemetryOffset] = createSignal(0);
  const [activePanel, setActivePanel] = createSignal(0);
  const [selectedAgent, setSelectedAgent] = createSignal(0);
  const [selectedArtifact, setSelectedArtifact] = createSignal(0);
  const artifacts = createMemo(() => openSpecArtifacts(data().state));
  const [verdict, setVerdict] = createSignal<{ title: string; content: string }>();
  const [verdictReturnToFindings, setVerdictReturnToFindings] = createSignal(false);
  const [findings, setFindings] = createSignal<{ title: string; events: FindingEvent[] }>();
  const [findingsReturnToVerification, setFindingsReturnToVerification] = createSignal(false);
  const [selectedFinding, setSelectedFinding] = createSignal(0);
  const openVerifierResult = (role: string, returnToVerification = false) => {
    setVerdictReturnToFindings(false);
    setFindingsReturnToVerification(returnToVerification);
    const parsed = props.profile === 'test' ? undefined : loadVerifierFindings(props.repo, props.change, role);
    if (parsed) { setFindings(parsed); setSelectedFinding(0); props.keymap.setData('modal.active', 'findings'); return; }
    setVerdict(props.profile === 'test' ? { title: `${role} · demo`, content: 'VERDICT: PASS\n\n## VALIDATION\nDemo verifier report.' } : loadVerifierReport(props.repo, props.change, role));
    setVerdictOffset(0); props.keymap.setData('modal.active', 'verdict');
  };
  const [verdictOffset, setVerdictOffset] = createSignal(0);
  const [verificationDetail, setVerificationDetail] = createSignal(false);
  const [eventsDetail, setEventsDetail] = createSignal(false);
  const [selectedEvent, setSelectedEvent] = createSignal(0);
  const [selectedVerification, setSelectedVerification] = createSignal(0);
  const [help, setHelp] = createSignal(false);
  const [themePicker, setThemePicker] = createSignal(false);
  const [themeIndex, setThemeIndex] = createSignal(Math.max(0, themeNames.indexOf(loadThemeName())));
  const [themeQuery, setThemeQuery] = createSignal('');
  const [themeFiltering, setThemeFiltering] = createSignal(false);
  const filteredThemes = () => themeNames.filter(name => name.includes(themeQuery().toLowerCase()));
  const [helpOffset, setHelpOffset] = createSignal(0);
  const helpSections: HelpSection[] = [{ title: 'Navigation', items: [{ key: 'Tab / Shift+Tab', description: 'Switch panel' }, { key: 'j/k or ↑/↓', description: 'Scroll focused panel' }, { key: 'Esc', description: 'Return to dashboard workspace' }] }, { title: 'Actions', items: [{ key: 'Enter', description: 'Approve workflow gate' }, { key: 'Enter', description: 'Focus selected agent (Agents panel)' }, { key: 'v', description: 'View selected verifier verdict' }, { key: 'r', description: 'Refresh dashboard' }, { key: 'q', description: 'Quit' }, { key: '?', description: 'Open help' }] }];
  const helpMaxOffset = () => Math.max(0, helpSections.reduce((count, section) => count + section.items.length + 1, 0) - Math.max(5, Math.floor(dimensions().height * .78) - 5));
  const verdictLines = createMemo(() => Math.max(4, Math.floor(dimensions().height * 0.75) - 5));
  const closeVerdict = () => { const restore = verdictReturnToFindings(); setVerdict(undefined); setVerdictReturnToFindings(false); if (restore) props.keymap.setData('modal.active', 'findings'); else props.keymap.setData('modal.active', 'none'); }; 
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
  const workflowStatus = createMemo(() => {
    const phase = data().state.phase;
    const working = data().agents.some(agent => agent.status === 'working');
    if (!working) return { text: phase, working: false };
    const lower = phase.toLowerCase();
    return { text: lower.includes('plan') ? 'Planning' : lower.includes('verif') || lower.includes('review') ? 'Verifying' : lower.includes('archiv') ? 'Archiving' : 'Applying', working: true };
  });
  const changeRows = createMemo(() => [...planRows(), ...(data().state.ticketNumber ? [`Ticket  ${data().state.ticketNumber}`] : []), `Age  ${data().age}`, ...verificationRows(), 'Current activity', data().currentTask, 'Request', data().request, 'Proposal', data().proposal, `Review  ${data().review}`, ...(data().state.phase === 'developer-review' ? ['Review history', ...data().reviewHistory] : [])]);
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
    if (name === 'q' || (key.ctrl && name === 'c')) {
      const selection = renderer.getSelection()?.getSelectedText();
      if (key.ctrl && selection) { copyToClipboard(selection); notify('Selection copied', 'success'); return; }
      const now = Date.now(); if (now - lastQuitAt < 1000) renderer.destroy(); else { lastQuitAt = now; notify(`If you want to quit press ${key.ctrl ? 'Ctrl+C' : 'q'} again`); } return;
    }
    if (key.meta && name === 'c') { const selection = renderer.getSelection()?.getSelectedText(); if (selection) { copyToClipboard(selection); notify('Selection copied', 'success'); } else notify('No selection to copy', 'warning'); return; }
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
    if (name === 't' && key.shift) { applyTheme(themeNames[themeIndex()]!); setThemePicker(true); props.keymap.setData('modal.active', 'theme'); return; }
    if (name === '?') { setHelp(true); setHelpOffset(0); props.keymap.setData('modal.active', 'help'); return; }
    if (name === 'v' && activePanel() === 1) {
      const agent = data().agents[selectedAgent()];
      if (!agent?.role.endsWith('verifier')) { setMessage('Select a verifier agent to view its verdict.'); return; }
      try {
        openVerifierResult(agent.role);
      } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
      return;
    }
    if (key.name === 'r') {
      refresh();
      setMessage('Refreshed');
      return;
    }
    if (name === 'j' && key.shift || name === 'k' && key.shift || name === 'tab') {
      setActivePanel(panel => { const order = [0, 6, 1, 2, 3, 4, 5]; const index = order.indexOf(panel); return order[(index + (name === 'k' || (name === 'tab' && key.shift) ? order.length - 1 : 1)) % order.length]!; });
      return;
    }
    if (name === 'down' || name === 'j') {
      if (activePanel() === 0) changeScroll?.scrollBy(1);
      else if (activePanel() === 1) setSelectedAgent(index => { const next = Math.min(data().agents.length - 1, index + 1); agentScroll?.scrollBy(1); return next; });
      else if (activePanel() === 2) setTaskOffset(offset => Math.min(Math.max(0, data().tasks.length - visibleTaskCount()), offset + 1));
      else if (activePanel() === 6) setSelectedArtifact(index => Math.min(Math.max(0, artifacts().length - 1), index + 1));
      else if (activePanel() === 3) setTelemetryOffset(offset => Math.min(Math.max(0, telemetryRows().length - visibleTelemetryCount()), offset + 1));
      return;
    }
    if (name === 'up' || name === 'k') {
      if (activePanel() === 0) changeScroll?.scrollBy(-1);
      else if (activePanel() === 1) setSelectedAgent(index => { const next = Math.max(0, index - 1); agentScroll?.scrollBy(-1); return next; });
      else if (activePanel() === 2) setTaskOffset(offset => Math.max(0, offset - 1));
      else if (activePanel() === 6) setSelectedArtifact(index => Math.max(0, index - 1));
      else if (activePanel() === 3) setTelemetryOffset(offset => Math.max(0, offset - 1));
      return;
    }
    if (name === 'enter' || name === 'return') {
      if (activePanel() === 6) { const artifact = artifacts()[selectedArtifact()]; if (artifact) { setVerdict({ title: `OpenSpec · ${artifact}`, content: openSpecArtifact(data().state, artifact) }); setVerdictOffset(0); props.keymap.setData('modal.active', 'verdict'); } return; }
      if (activePanel() === 5) { setEventsDetail(true); setSelectedEvent(0); props.keymap.setData('modal.active', 'events'); return;}
      if (activePanel() === 4) { try { focusAgent(data().state, data().state.panes.git!); } catch (error) { setVerdictReturnToFindings(false); setVerdict({ title: 'Lazygit launch failed', content: error instanceof Error ? error.message : String(error) }); setVerdictOffset(0); props.keymap.setData('modal.active', 'verdict'); } return; }
      if (activePanel() === 2) {
        setVerdict({ title: `Tasks · ${doneTasks()}/${data().tasks.length}`, content: data().tasks.map((task, index) => `${task.done ? '✓' : '○'} ${index + 1}. ${task.text}`).join('\n') || 'No tasks yet.' });
        setVerdictOffset(0); props.keymap.setData('modal.active', 'verdict'); return;
      }
      if (activePanel() === 3) { setVerificationDetail(true); setSelectedVerification(0); props.keymap.setData('modal.active', 'verification-detail'); return; }
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
    const disposeTheme = props.keymap.registerLayer({ name: 'theme', priority: 1100, activeModal: 'theme', commands: [{ name: 'theme.handle', run: ({ event }) => { const key = event.name.toLowerCase(); const items = filteredThemes(); if (key === 'escape') { if (themeFiltering()) { setThemeFiltering(false); setThemeQuery(''); setThemeIndex(0); } else { setThemePicker(false); props.keymap.setData('modal.active', 'none'); } } else if (key === '/') { setThemeFiltering(true); setThemeQuery(''); setThemeIndex(0); } else if (themeFiltering() && key === 'backspace') { setThemeQuery(query => query.slice(0, -1)); setThemeIndex(0); } else if (themeFiltering() && key.length === 1) { setThemeQuery(query => query + key); setThemeIndex(0); } else if (key === 'j' || key === 'down') { const next = Math.min(items.length - 1, themeIndex() + 1); setThemeIndex(next); applyTheme(items[next]!); } else if (key === 'k' || key === 'up') { const next = Math.max(0, themeIndex() - 1); setThemeIndex(next); applyTheme(items[next]!); } else if (key === 'enter' || key === 'return') { if (themeFiltering()) setThemeFiltering(false); else { saveThemeName(items[themeIndex()]!); setThemePicker(false); props.keymap.setData('modal.active', 'none'); } } return true; } }], bindings: ['escape', 'enter', 'return', '/', 'backspace', ...'abcdefghijklmnopqrstuvwxyz'.split(''), 'j', 'k', 'up', 'down'].map(key => ({ key, cmd: 'theme.handle' })) });
    const disposeHelp = props.keymap.registerLayer({ name: 'help', priority: 1000, activeModal: 'help', commands: [{ name: 'help.handle', run: ({ event }) => { const key = event.name.toLowerCase(); if (key === 'escape') { setHelp(false); props.keymap.setData('modal.active', 'none'); } else if (key === 'j' || key === 'down') setHelpOffset(value => Math.min(helpMaxOffset(), value + 1)); else if (key === 'k' || key === 'up') setHelpOffset(value => Math.max(0, value - 1)); return true; } }], bindings: ['escape', 'j', 'k', 'up', 'down'].map(key => ({ key, cmd: 'help.handle' })) });
    const disposeVerification = props.keymap.registerLayer({ name: 'verification-detail', priority: 1000, activeModal: 'verification-detail', commands: [{ name: 'verification.handle', run: ({ event }) => { const key = event.name.toLowerCase(); const entries = data().verifierTimeline; if (key === 'escape') { setVerificationDetail(false); props.keymap.setData('modal.active', 'none'); } else if (key === 'j' || key === 'down') setSelectedVerification(value => Math.min(entries.length - 1, value + 1)); else if (key === 'k' || key === 'up') setSelectedVerification(value => Math.max(0, value - 1)); else if (key === 'enter' || key === 'return') { const entry = entries[selectedVerification()]; if (!entry) return true; try { setVerificationDetail(false); openVerifierResult(entry.role, true); } catch (error) { setVerdict({ title: `${entry.role} · result pending`, content: error instanceof Error ? error.message : String(error) }); setVerdictOffset(0); props.keymap.setData('modal.active', 'verdict'); } } return true; } }], bindings: ['escape', 'enter', 'return', 'j', 'k', 'up', 'down'].map(key => ({ key, cmd: 'verification.handle' })) });
    const disposeEvents = props.keymap.registerLayer({ name: 'events', priority: 1000, activeModal: 'events', commands: [{ name: 'events.handle', run: ({ event }) => { const key = event.name.toLowerCase(); if (key === 'escape') { setEventsDetail(false); props.keymap.setData('modal.active', 'none'); } else if (key === 'j' || key === 'down') setSelectedEvent(value => Math.min(data().events.length - 1, value + 1)); else if (key === 'k' || key === 'up') setSelectedEvent(value => Math.max(0, value - 1)); return true; } }], bindings: ['escape', 'j', 'k', 'up', 'down'].map(key => ({ key, cmd: 'events.handle' })) });
    const disposeFindings = props.keymap.registerLayer({ name: 'findings', priority: 1000, activeModal: 'findings', commands: [{ name: 'findings.handle', run: ({ event }) => { const key = event.name.toLowerCase(); const items = (findings()?.events ?? []).filter(item => item.type !== 'verdict'); if (key === 'escape') { const restore = findingsReturnToVerification(); setFindings(undefined); setFindingsReturnToVerification(false); if (restore) { setVerificationDetail(true); props.keymap.setData('modal.active', 'verification-detail'); } else props.keymap.setData('modal.active', 'none'); } else if (key === 'j' || key === 'down') setSelectedFinding(value => Math.min(items.length - 1, value + 1)); else if (key === 'k' || key === 'up') setSelectedFinding(value => Math.max(0, value - 1)); else if (key === 'enter' || key === 'return') { const finding = items[selectedFinding()]; if (finding?.type === 'finding') { try { openFindingInEditor(data().state, finding); } catch (error) { setVerdictReturnToFindings(true); setVerdict({ title: 'Editor launch failed', content: error instanceof Error ? error.message : String(error) }); setVerdictOffset(0); props.keymap.setData('modal.active', 'verdict'); } } } return true; } }], bindings: ['escape', 'enter', 'return', 'j', 'k', 'up', 'down'].map(key => ({ key, cmd: 'findings.handle' })) });
    const disposeVerdict = props.keymap.registerLayer({ name: 'verdict', priority: 1000, activeModal: 'verdict',
      commands: [{ name: 'verdict.handle', run: ({ event }) => {
        const name = event.name.toLowerCase();
        const max = () => { const width = Math.max(40, Math.floor(dimensions().width * .7) - 8); const wrapped = (verdict()?.content.split(/\r?\n/).reduce((total, line) => total + Math.max(1, Math.ceil(line.length / width)), 0) ?? 0); return Math.max(0, wrapped - verdictLines() + 2); };
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
      bindings: ['q', 'ctrl+c', 'meta+c', 'shift+t', 'r', 'v', '?', 'j', 'k', 'J', 'K', 'tab', 'shift+tab', 'up', 'down', 'enter', 'return', 'escape'].map(key => ({ key, cmd: 'detail.handle' })),
    });
    onCleanup(() => { disposeTheme(); disposeHelp(); disposeVerification(); disposeEvents(); disposeFindings(); disposeVerdict(); dispose(); });
  });

  const doneTasks = createMemo(() => data().tasks.filter(task => task.done).length);
  const currentTask = createMemo(() => data().tasks.find(task => !task.done)?.text ?? 'All tasks complete');
  const verificationSummary = createMemo(() => {
    const rows = data().verifierTimeline;
    const count = (status: string) => rows.filter(row => row.status.toLowerCase() === status).length;
    const cost = data().telemetrySummary.reduce((sum, row) => sum + row.cost, 0);
    return `run ${count('run')} · pass ${count('pass')} · fail ${count('fail')} · skip ${count('skipped')} · $${cost.toFixed(2)}`;
  });
  const prompt = createMemo(() => data().state.phase === 'paused'
    ? 'Verification paused · developer intervention required'
    : gate()?.prompt ?? 'Waiting for workflow activity');

  return (
    <box width={dimensions().width} height={dimensions().height}>
    <Layout
      header={<Header change={data().state.changeId} phase={data().state.phase} branch={data().state.branch} updated={data().updated} />}
      content={
        <box backgroundColor={uiColors.bgBase} style={{ width: '100%', height: '100%', flexDirection: 'column', padding: 1, gap: 1 }}>
          <box style={{ width: '100%', flexGrow: 1, minHeight: 0, flexDirection: 'row', gap: 1 }}> 
            <box width="50%" height="100%" flexDirection="column" gap={1} flexShrink={0}>
            <Panel title={`Change (${data().age} ago)`} accent={uiColors.primary} active={activePanel() === 0} style={{ width: '100%', flexGrow: 1, minHeight: 0 }}>  
              <ScrollableContent onScrollBoxReady={box => { changeScroll = box; }}>
                <box flexDirection="row"><box width={7}><text fg={uiColors.textMuted}>STATUS</text></box><Badge text={workflowStatus().text} appearance="badge" highlight={workflowStatus().working ? 'highlight2' : 'secondary'} animatedHighlights={workflowStatus().working ? ['highlight1', 'highlight2', 'highlight3'] : undefined} /></box>
                <Show when={data().state.ticketNumber}><box flexDirection="row"><box width={7}><text fg={uiColors.textMuted}>TICKET</text></box><HighlightedText text={data().state.ticketNumber!} highlight="highlight" /></box></Show>
                <Show when={data().state.planQuality}>{plan => <box flexDirection="row"><box width={7}><text fg={uiColors.textMuted}>PLAN</text></box><Badge text={plan().passed ? 'PASS' : 'FAIL'} highlight={plan().passed ? 'positive' : 'negative'} /><text fg={uiColors.textSecondary}>  {plan().specFiles} specs · {plan().taskCount} tasks</text></box>}</Show>
                <Show when={data().state.verificationTier}>{tier => { const roles = () => data().state.verificationRoles ?? []; const completed = () => roles().filter(role => data().state.verificationResults?.[role]).length; return <box flexDirection="row"><box width={7}><text fg={uiColors.textMuted}>VERIFY</text></box><Badge text={tier().toUpperCase()} highlight="highlight2" /><text fg={uiColors.textSecondary}>  {completed()}/{roles().length} reviews · round {data().state.verificationRound}</text></box>; }}</Show>
                <text fg={uiColors.textMuted}>REQUEST</text><box paddingLeft={1}><text fg={uiColors.textPrimary}>{data().request}</text></box>
              </ScrollableContent>
            </Panel>
            <Show when={artifacts().length > 0}><Panel title="OpenSpec" accent={uiColors.accent} active={activePanel() === 6} style={{ width: '100%', height: artifacts().length + 2, flexShrink: 0 }}><For each={artifacts()}>{(artifact, index) => <box width="100%" height={1} flexShrink={0} flexDirection="row" backgroundColor={activePanel() === 6 && selectedArtifact() === index() ? uiColors.bgSurface1 : uiColors.bgMantle}><box width={1} backgroundColor={activePanel() === 6 && selectedArtifact() === index() ? uiColors.accent : uiColors.bgMantle} flexShrink={0} /><text fg={activePanel() === 6 && selectedArtifact() === index() ? uiColors.textPrimary : uiColors.textSecondary} attributes={activePanel() === 6 && selectedArtifact() === index() ? TextAttributes.BOLD : 0}>{activePanel() === 6 && selectedArtifact() === index() ? '→ ' : '  '}{artifact}</text></box>}</For></Panel></Show>
            </box>
            <Panel title="Agents" accent={uiColors.accent} active={activePanel() === 1} style={{ width: '50%', height: '100%', flexShrink: 0 }}>   
              <ScrollableContent onScrollBoxReady={box => { agentScroll = box; }}>
                <For each={data().agents}>{(agent, index) => {
                  const selected = () => activePanel() === 1 && selectedAgent() === index();
                  const timeline = () => data().verifierTimeline.find(item => item.role === agent.role);
                  const highlight = () => agent.status === 'working' ? 'highlight2' : agent.status === 'done' || agent.status === 'idle' ? 'positive' : agent.status === 'blocked' ? 'warning' : 'secondary';
                  return <box backgroundColor={selected() ? uiColors.bgSurface1 : uiColors.bgMantle} style={{ width: '100%', height: 2, flexDirection: 'row', flexShrink: 0 }}>
                    <box width={1} backgroundColor={selected() ? uiColors.accent : uiColors.bgMantle} flexShrink={0} />
                    <box style={{ flexGrow: 1, minWidth: 0, flexDirection: 'column', paddingLeft: 1, paddingRight: 1 }}>
                      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
                        <text fg={selected() ? uiColors.accent : uiColors.textMuted}>{selected() ? '›' : ' '}</text>
                        <box style={{ flexGrow: 1, minWidth: 0, overflow: 'hidden' }}><text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>{agent.role}</text></box>
                        <Badge text={agent.status} appearance="text" highlight={highlight()} animatedHighlights={agent.status === 'working' || agent.status === 'blocked' ? ['highlight1', 'highlight2', 'highlight3'] : undefined} attributes={TextAttributes.BOLD} transitionKey={agent.role} />
                      </box>
                      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
                        <box flexGrow={1} minWidth={0} overflow="hidden"><text fg={uiColors.textMuted}>{timeline() ? (timeline()!.model ?? agent.model ?? 'default') : agent.model ?? (agent.role.endsWith('verifier') ? 'Awaiting verification run' : 'Interactive workflow agent')}</text></box>
                        <Show when={timeline()}>{entry => <text fg={entry().status === 'PASS' ? uiColors.success : entry().status === 'FAIL' ? uiColors.error : uiColors.warning}>{entry().status}{entry().durationSeconds !== undefined ? ` · ${entry().durationSeconds}s` : ''}{entry().cost ? ` · $${(entry().cost ?? 0).toFixed(2)}` : ''}{entry().fallback ? ' · fallback' : ''}</text>}</Show>
                      </box>
                    </box>
                  </box>;
                }}</For>
              </ScrollableContent>
            </Panel>
          </box>
          <box style={{ width: '100%', height: 2, flexShrink: 0, flexDirection: 'row', gap: 1 }}> 
            <Panel title={`Current task · ${doneTasks()}/${data().tasks.length}`} accent={uiColors.success} active={activePanel() === 2} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, height: '100%' }}>  
              <text fg={doneTasks() === data().tasks.length ? uiColors.success : uiColors.textPrimary}>{doneTasks() === data().tasks.length ? '✓' : '○'} {currentTask()}</text>
            </Panel>
            <Panel title="Verification" accent={uiColors.info} active={activePanel() === 3} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, height: '100%' }}> 
              <text fg={uiColors.textSecondary}>{verificationSummary()}</text>
            </Panel>
            <Panel title="Git status" accent={uiColors.warning} active={activePanel() === 4} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, height: '100%' }}>
              <text fg={data().health.dirty ? uiColors.warning : uiColors.success}>{data().health.dirty ? `changed · ↑${data().health.ahead} ↓${data().health.behind}` : `clean · ↑${data().health.ahead} ↓${data().health.behind}`}</text>
            </Panel>
            <Panel title={`Traces · ${data().events.length}`} accent={uiColors.primary} active={activePanel() === 5} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, height: '100%' }}>
              <text fg={uiColors.textSecondary}>{data().events.at(-1) ? `${data().events.at(-1)!.at}  ${data().events.at(-1)!.event}` : 'No events yet'}</text>
            </Panel>
          </box>
        </box>
      }
      footer={<StatusBar prompt={activePanel() === 1 ? 'Selected agent' : activePanel() === 3 ? 'Verification timeline' : prompt()} approval={activePanel() !== 1 && !!gate() && !busy()} keybinds={[...(activePanel() === 2 ? [{ key: 'Enter', action: 'view tasks' }] : activePanel() === 3 ? [{ key: 'Enter', action: 'view timeline' }] : activePanel() === 4 ? [{ key: 'Enter', action: 'open lazygit' }] : activePanel() === 5 ? [{ key: 'Enter', action: 'view traces' }] : activePanel() === 6 ? [{ key: 'Enter', action: 'open artifact' }] : activePanel() !== 1 && !!gate() && !busy() ? [{ key: 'Enter', action: 'approve' }] : activePanel() === 1 ? [{ key: 'Enter', action: 'focus agent' }, { key: 'v', action: 'view verdict' }] : []), { key: 'r', action: 'refresh' }, { key: 'Esc', action: 'dashboard' }, { key: 'q', action: 'quit' }]} />}
    />
    <Show when={help()}><HelpModal title="Dashboard keybindings" sections={helpSections} offset={helpOffset()} lines={Math.max(5, Math.floor(dimensions().height * .78) - 5)} /></Show>
    <NotificationOverlay />
    <Show when={themePicker()}><ThemePickerModal selected={themeIndex()} active={getActiveThemeName()} themes={filteredThemes()} query={themeQuery()} filtering={themeFiltering()} /></Show>
    <Show when={eventsDetail()}><EventsModal events={[...data().events].reverse()} selected={selectedEvent()} /></Show>
    <Show when={findings()}>{result => <FindingsModal title={result().title} events={result().events} selected={selectedFinding()} />}</Show>
    <Show when={verificationDetail()}><VerificationTimelineModal startedAt={data().state.verificationStartedAt} entries={data().verifierTimeline} selected={selectedVerification()} /></Show>
    <Show when={verdict()}>{report => <VerdictModal title={report().title} content={report().content} offset={verdictOffset()} lines={verdictLines()} />}</Show>
    </box>
  );
}
