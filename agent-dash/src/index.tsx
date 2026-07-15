/** @jsxImportSource @opentui/solid */
import { createCliRenderer } from '@opentui/core';
import { render } from '@opentui/solid';
import { resolve } from 'node:path';
import { App } from './App';
import { loadDashboard, testDashboard } from './data';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const profile = argument('--profile');
const isTest = profile === 'test';
const repo = argument('--repo');
const change = argument('--change');
if (!isTest && (!repo || !change)) {
  console.error('usage: agent-dash --repo PATH --change ID [--json]\n       agent-dash --profile test [--json]');
  process.exit(2);
}
const resolvedRepo = repo ? resolve(repo) : '/demo';
const resolvedChange = change ?? 'demo-optional-realisation-date';
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(isTest ? testDashboard() : loadDashboard(resolvedRepo, resolvedChange), null, 2));
  process.exit(0);
}

process.env.FORCE_COLOR = '3';
const renderer = await createCliRenderer({ targetFps: 30, exitOnCtrlC: false, useKittyKeyboard: {}, exitSignals: [] });
const cleanup = () => renderer.destroy();
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGHUP', cleanup);
await render(() => <App repo={resolvedRepo} change={resolvedChange} profile={isTest ? 'test' : undefined} />, renderer);
await new Promise<void>(resolveDone => renderer.once('destroy', resolveDone));
