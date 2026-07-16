/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { useRenderer, useTerminalDimensions } from '@opentui/solid';
import type { KeyEvent } from '@opentui/core';
import type { Keymap } from '@opentui/keymap';
import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { availableModels, discoverProjects, focusWorkflow, herdrAvailable, listWorkflows, notifyHerdrError, startWorkflow, type WorkflowOverview } from './data';
import { ErrorDialog } from './ui/ErrorDialog';
import { HelpModal, type HelpSection } from './ui/HelpModal';
import { NewWorkflowModal } from './ui/NewWorkflowModal';
import { Panel } from './ui/Panel';
import { StatusBar } from './ui/StatusBar';
import { uiColors } from './ui/colors';
import { ThemePickerModal } from './ui/ThemePickerModal';
import { applyTheme, saveThemeName, loadThemeName } from './theme-settings';
import { getActiveThemeName, themeNames } from './ui/theme';
import { invokeGlobalSelectionMouseUpHandler } from './selectionCopy';
import { NotificationOverlay } from './ui/Notification';

export function Home(props: { keymap: Keymap<any, KeyEvent> }) {
  const renderer = useRenderer();
  const dimensions = useTerminalDimensions();
  const [models, setModels] = createSignal<string[]>([]);
  const [projects, setProjects] = createSignal<Array<{ name: string; path: string; openspec: boolean }>>([]);
  const [items, setItems] = createSignal<WorkflowOverview[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [filter, setFilter] = createSignal<'active' | 'archived'>('active');
  const visibleItems = createMemo(() => items().filter(item => filter() === 'active' ? item.workspaceOpen && item.state.phase !== 'closed' : !item.workspaceOpen || item.state.phase === 'closed'));
  const [selected, setSelected] = createSignal(0);
  const [workspaceOffset, setWorkspaceOffset] = createSignal(0);
  const visibleWorkspaceCount = createMemo(() => Math.max(1, Math.floor((dimensions().height - 8) / 2)));
  const visibleWorkspaces = createMemo(() => visibleItems().slice(workspaceOffset(), workspaceOffset() + visibleWorkspaceCount()));
  const [modal, setModal] = createSignal(false);
  const [modalHandler, setModalHandler] = createSignal<(event: KeyEvent) => boolean>();
  const [message, setMessage] = createSignal('');
  const [error, setError] = createSignal<{ title: string; message: string }>();
  const [help, setHelp] = createSignal(false);
  const [helpOffset, setHelpOffset] = createSignal(0);
  const [themePicker, setThemePicker] = createSignal(false);
  const [themeIndex, setThemeIndex] = createSignal(Math.max(0, themeNames.indexOf(loadThemeName())));
  const helpSections: HelpSection[] = [{ title: 'Navigation', items: [{ key: 'j/k or ↑/↓', description: 'Select workspace' }] }, { title: 'Actions', items: [{ key: 'Enter', description: 'Switch active workspace' }, { key: 'n', description: 'New workflow' }, { key: 's', description: 'Active/archived filter' }, { key: 'r', description: 'Refresh' }, { key: 'q', description: 'Quit' }, { key: '?', description: 'Open help' }] }];
  const helpMaxOffset = () => Math.max(0, helpSections.reduce((count, section) => count + section.items.length + 1, 0) - Math.max(5, Math.floor(dimensions().height * .78) - 5));
  const closeError = () => { setError(undefined); props.keymap.setData('modal.active', 'none'); };
  const showError = (title: string, message: string) => { setError({ title, message }); props.keymap.setData('modal.active', 'error'); };
  const showHerdrUnavailable = (message = 'Herdr executable was not found. Install Herdr or add it to PATH.') => showError('Herdr unavailable', message);
  const refresh = () => { setItems(listWorkflows()); setSelected(index => Math.min(index, Math.max(0, visibleItems().length - 1))); setWorkspaceOffset(offset => Math.min(offset, Math.max(0, visibleItems().length - visibleWorkspaceCount()))); };
  const cycleFilter = () => { setFilter(current => current === 'active' ? 'archived' : 'active'); setSelected(0); setWorkspaceOffset(0); };
  onMount(() => {
    const loadStartup = () => { setItems(listWorkflows()); setModels(availableModels()); setProjects(discoverProjects()); setLoading(false); };
    const startup = setTimeout(loadStartup, 0);
    const timer = setInterval(refresh, 5000);
    onCleanup(() => { clearTimeout(startup); clearInterval(timer); });
  });
  const handleKey = (key: KeyEvent) => {
    const name = key.name.toLowerCase();
    if (modal()) return;
    if (name === 't' && key.shift) { setThemePicker(true); props.keymap.setData('modal.active', 'theme'); }
    else if (name === '?') { setHelp(true); setHelpOffset(0); props.keymap.setData('modal.active', 'help'); }
    else if (name === 'q') renderer.destroy();
    else if (name === 'n') { setModal(true); props.keymap.setData('modal.active', 'new-workflow'); }
    else if (name === 'r') refresh();
    else if (name === 's') cycleFilter();
    else if (name === 'j' || name === 'down') setSelected(index => { const next = Math.min(index + 1, visibleItems().length - 1); setWorkspaceOffset(offset => next >= offset + visibleWorkspaceCount() ? next - visibleWorkspaceCount() + 1 : offset); return next; });
    else if (name === 'k' || name === 'up') setSelected(index => { const next = Math.max(index - 1, 0); setWorkspaceOffset(offset => next < offset ? next : offset); return next; });
    else if (name === 'enter' || name === 'return') { const item = visibleItems()[selected()]; if (item?.workspaceOpen && item.state.phase !== 'closed') { try { focusWorkflow(item); } catch (error) { const message = error instanceof Error ? error.message : String(error); if (!notifyHerdrError(message)) showError(herdrAvailable() ? 'Workspace switch failed' : 'Herdr unavailable', message); } } }
  };
  onMount(() => {
    props.keymap.setData('app.view', 'home');
    props.keymap.setData('modal.active', 'none');
    const modalKeys = ['escape', 'return', 'enter', 'backspace', 'delete', 'up', 'down', 'j', 'k', 'd', 'u', '/', ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_=+[]{};:\\|,.<>`~!@#$%^&*() '.split('').map(key => key === ' ' ? 'space' : key)];
    const disposeModal = props.keymap.registerLayer({ name: 'new-workflow', priority: 1000, activeModal: 'new-workflow',
      commands: [{ name: 'new-workflow.handle', run: ({ event }) => modalHandler()?.(event) ?? true }],
      bindings: modalKeys.map(key => ({ key, cmd: 'new-workflow.handle' })),
    });
    const disposeTheme = props.keymap.registerLayer({ name: 'theme-home', priority: 1100, activeModal: 'theme', commands: [{ name: 'theme.handle', run: ({ event }) => { const key = event.name.toLowerCase(); if (key === 'escape') { setThemePicker(false); props.keymap.setData('modal.active', 'none'); } else if (key === 'j' || key === 'down') { const next = Math.min(themeNames.length - 1, themeIndex() + 1); setThemeIndex(next); applyTheme(themeNames[next]!); } else if (key === 'k' || key === 'up') { const next = Math.max(0, themeIndex() - 1); setThemeIndex(next); applyTheme(themeNames[next]!); } else if (key === 'enter' || key === 'return') { saveThemeName(themeNames[themeIndex()]!); setThemePicker(false); props.keymap.setData('modal.active', 'none'); } return true; } }], bindings: ['escape', 'enter', 'return', 'j', 'k', 'up', 'down'].map(key => ({ key, cmd: 'theme.handle' })) });
    const disposeHelp = props.keymap.registerLayer({ name: 'help', priority: 1100, activeModal: 'help', commands: [{ name: 'help.close', run: ({ event }) => { const key = event.name.toLowerCase(); if (key === 'escape') { setHelp(false); props.keymap.setData('modal.active', 'none'); } else if (key === 'j' || key === 'down') setHelpOffset(value => Math.min(helpMaxOffset(), value + 1)); else if (key === 'k' || key === 'up') setHelpOffset(value => Math.max(0, value - 1)); return true; } }], bindings: ['escape', 'j', 'k', 'up', 'down'].map(key => ({ key, cmd: 'help.close' })) });
    const disposeError = props.keymap.registerLayer({ name: 'error', priority: 1100, activeModal: 'error',
      commands: [{ name: 'error.close', run: () => { closeError(); return true; } }],
      bindings: ['escape', 'enter', 'return'].map(key => ({ key, cmd: 'error.close' })),
    });
    const disposeHome = props.keymap.registerLayer({ name: 'home', priority: 100, appView: 'home', activeModal: 'none',
      commands: [{ name: 'home.handle', run: ({ event }) => { handleKey(event); return true; } }],
      bindings: ['q', 'n', 'r', 's', '?', 'shift+t', 'j', 'k', 'up', 'down', 'enter', 'return'].map(key => ({ key, cmd: 'home.handle' })), 
    });
    onCleanup(() => { disposeModal(); disposeTheme(); disposeHelp(); disposeError(); disposeHome(); });
  });
  return (
    <box backgroundColor={uiColors.bgBase} style={{ width: '100%', height: '100%', flexDirection: 'column', padding: 1, gap: 1 }} onMouseUp={() => invokeGlobalSelectionMouseUpHandler()}>
      <box style={{ height: 2, flexDirection: 'column' }}>
        <box style={{ width: '100%', flexDirection: 'row' }}>
          <text fg={uiColors.primary} attributes={TextAttributes.BOLD}>AGT DASHBOARD</text>
          <text fg={filter() === 'active' ? uiColors.success : uiColors.textMuted} attributes={TextAttributes.BOLD}>  [{filter()}]</text>
          <box style={{ flexGrow: 1 }} />
          <text fg={uiColors.textMuted}>{visibleItems().length} workspaces</text>
        </box>
        <text fg={uiColors.textMuted}>All managed OpenSpec workspaces · auto-refresh 5s</text>
      </box>
      <Panel title="Workspaces" active style={{ flexGrow: 1, minHeight: 0 }}>
        <Show when={loading()} fallback={<Show when={visibleItems().length > 0} fallback={<text fg={uiColors.textMuted}>No {filter()} workflows found in ~/development</text>}>
          <For each={visibleWorkspaces()}>{(item, index) => (
            <box backgroundColor={workspaceOffset() + index() === selected() ? uiColors.bgSurface1 : undefined} style={{ height: 2, flexDirection: 'column', paddingLeft: 1 }}>
              <text fg={workspaceOffset() + index() === selected() ? uiColors.textPrimary : uiColors.textSecondary} attributes={workspaceOffset() + index() === selected() ? TextAttributes.BOLD : 0}>{workspaceOffset() + index() === selected() ? '→ ' : '  '}{item.state.changeId}  <span style={{ fg: uiColors.primary }}>{item.state.phase}</span></text>
              <text fg={uiColors.textMuted}>  {item.tasks[0]}/{item.tasks[1]} tasks · planner:{item.agents.find(agent => agent.role === 'planner')?.status ?? 'not started'} · {item.agents.filter(agent => agent.status === 'working' || agent.status === 'done' || agent.status === 'idle').length}/{item.agents.length} agents active</text>
            </box>
          )}</For>
          <Show when={visibleItems().length > visibleWorkspaceCount()}><text fg={uiColors.textMuted}>j/k scroll · {workspaceOffset() + 1}-{Math.min(visibleItems().length, workspaceOffset() + visibleWorkspaceCount())}/{visibleItems().length}</text></Show>
        </Show>}>
          <text fg={uiColors.textMuted}>Loading workspaces…</text>
        </Show>
      </Panel>
      <StatusBar prompt={`${filter()} workspaces`} approval={false} keybinds={[{ key: 'Enter', action: 'switch workspace' }, { key: 'n', action: 'new workflow' }, { key: 's', action: 'active/archived' }, { key: 'r', action: 'refresh' }, { key: '?', action: 'help' }, { key: 'Shift+T', action: 'theme' }, { key: 'q', action: 'quit' }]} />
      <NotificationOverlay />
      <Show when={themePicker()}><ThemePickerModal selected={themeIndex()} active={getActiveThemeName()} themes={themeNames} query="" filtering={false} /></Show>
      <Show when={modal()}><NewWorkflowModal projects={projects()} models={models()} onKeyReady={handler => setModalHandler(() => handler)} onCancel={() => { setModal(false); props.keymap.setData('modal.active', 'none'); setModalHandler(undefined); }} onComplete={async (input) => { setModal(false); props.keymap.setData('modal.active', 'none'); setModalHandler(undefined); if (!herdrAvailable()) { showHerdrUnavailable(); return; } setMessage('Starting workflow…'); try { setMessage(await startWorkflow(input)); refresh(); } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!notifyHerdrError(message)) showError(herdrAvailable() ? 'Workflow execution failed' : 'Herdr unavailable', message);
      } }} /></Show>
      <Show when={help()}><HelpModal title="Workspace overview keybindings" sections={helpSections} offset={helpOffset()} lines={Math.max(5, Math.floor(dimensions().height * .78) - 5)} /></Show>
      <Show when={error()}>{current => <ErrorDialog title={current().title} message={current().message} onClose={closeError} />}</Show>
    </box>
  );
}
