#!/usr/bin/env bun
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const build = Bun.spawnSync(['bun', 'run', 'build:single'], { cwd: root, stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' });
if (build.exitCode !== 0) process.exit(build.exitCode);

const platform = process.platform === 'win32' ? 'windows' : process.platform;
const name = `agent-dash-${platform}-${process.arch}`;
const sourceBase = path.join(root, 'dist', name, 'bin', 'agent-dash');
const source = process.platform === 'win32' && fs.existsSync(`${sourceBase}.exe`) ? `${sourceBase}.exe` : sourceBase;
const installDir = process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'agent-dash', 'bin')
  : path.join(os.homedir(), '.local', 'bin');
const destination = path.join(installDir, process.platform === 'win32' ? 'agent-dash.exe' : 'agent-dash');

fs.mkdirSync(installDir, { recursive: true });
fs.copyFileSync(source, destination);
if (process.platform !== 'win32') fs.chmodSync(destination, 0o755);
console.log(`installed ${destination}`);
