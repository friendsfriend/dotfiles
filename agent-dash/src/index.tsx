/** @jsxImportSource @opentui/solid */
import { createCliRenderer } from '@opentui/core';
import { render } from '@opentui/solid';
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui';
import { KeymapProvider } from '@opentui/keymap/solid';
import { setupKeymap } from './keymap-setup';
import { resolve } from 'node:path';
import { App } from './App';
import { Home } from './Home';
import { applyTheme, loadThemeName } from './theme-settings';
import { setGlobalSelectionMouseUpHandler } from './selectionCopy';
import { copyToClipboard } from './clipboard';
import { notify } from './notifications';
import { listWorkflows, loadDashboard, testDashboard } from './data';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const profile = argument('--profile');
const home = process.argv.includes('--home');
const isTest = profile === 'test';
const repo = argument('--repo');
const change = argument('--change');
if (!home && !isTest && (!repo || !change)) {
  console.error('usage: agent-dash --home\n       agent-dash --repo PATH --change ID [--json]\n       agent-dash --profile test [--json]');
  process.exit(2);
}
const resolvedRepo = repo ? resolve(repo) : '/demo';
const resolvedChange = change ?? 'demo-optional-realisation-date';
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(home ? listWorkflows() : isTest ? testDashboard() : loadDashboard(resolvedRepo, resolvedChange), null, 2));
  process.exit(0);
}

applyTheme(loadThemeName());
process.env.FORCE_COLOR = '3';
const renderer = await createCliRenderer({ targetFps: 30, exitOnCtrlC: false, useKittyKeyboard: {}, exitSignals: [] });
const cleanup = () => renderer.destroy();
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGHUP', cleanup);
function HomeShell() {
  return <Home keymap={keymap} />;
}

const clearSelectionCopy = setGlobalSelectionMouseUpHandler(() => { const text = renderer.getSelection()?.getSelectedText(); if (text) { if (copyToClipboard(text)) notify('Copied', 'success'); else notify('Copy failed', 'error'); renderer.clearSelection(); } });
const keymap = createDefaultOpenTuiKeymap(renderer);
const disposeKeymap = setupKeymap(keymap);
keymap.setData('app.view', home ? 'home' : 'detail');
keymap.setData('modal.active', 'none');
await render(() => <KeymapProvider keymap={keymap}>
  {home ? <HomeShell /> : <App repo={resolvedRepo} change={resolvedChange} profile={isTest ? 'test' : undefined} keymap={keymap} />}
</KeymapProvider>, renderer);
await new Promise<void>(resolveDone => renderer.once('destroy', resolveDone));
clearSelectionCopy();
disposeKeymap();
