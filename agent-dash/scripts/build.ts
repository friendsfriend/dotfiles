#!/usr/bin/env bun
import fs from 'node:fs';
import path from 'node:path';
import { $ } from 'bun';

const root = path.resolve(import.meta.dir, '..');
process.chdir(root);

function cleanArtifacts() {
  for (const entry of fs.readdirSync(root)) {
    if (entry.endsWith('.bun-build')) fs.rmSync(path.join(root, entry), { recursive: true, force: true });
  }
}

function patchSolidTransform() {
  const file = path.join(root, 'node_modules/@opentui/solid/scripts/solid-transform.js');
  if (!fs.existsSync(file)) return;
  const source = fs.readFileSync(file, 'utf8');
  const oldImport = 'import moduleResolver from "babel-plugin-module-resolver";';
  if (source.includes(oldImport) && !source.includes('createRequire(import.meta.url)')) {
    fs.writeFileSync(file, source.replace(oldImport, 'import { createRequire } from "module";\nconst require = createRequire(import.meta.url);\nconst moduleResolver = require("babel-plugin-module-resolver");'));
  }
}

const targets: Array<{ os: 'linux' | 'darwin' | 'win32'; arch: 'arm64' | 'x64'; abi?: 'musl'; avx2?: false }> = [
  { os: 'linux', arch: 'arm64' },
  { os: 'linux', arch: 'x64' },
  { os: 'linux', arch: 'x64', avx2: false },
  { os: 'linux', arch: 'arm64', abi: 'musl' },
  { os: 'linux', arch: 'x64', abi: 'musl' },
  { os: 'linux', arch: 'x64', abi: 'musl', avx2: false },
  { os: 'darwin', arch: 'arm64' },
  { os: 'darwin', arch: 'x64' },
  { os: 'darwin', arch: 'x64', avx2: false },
  { os: 'win32', arch: 'x64' },
  { os: 'win32', arch: 'x64', avx2: false },
];

const single = process.argv.includes('--single');
const selected = single ? targets.filter(target => target.os === process.platform && target.arch === process.arch && target.avx2 !== false && !target.abi) : targets;
if (!selected.length) throw new Error(`Unsupported current platform: ${process.platform}-${process.arch}`);

cleanArtifacts();
process.on('exit', cleanArtifacts);
process.on('SIGINT', () => { cleanArtifacts(); process.exit(130); });
process.on('SIGTERM', () => { cleanArtifacts(); process.exit(143); });

await $`rm -rf dist`;
await $`bun install --os="*" --cpu="*" @opentui/core@0.4.2`;
patchSolidTransform();
const solidPlugin = (await import(path.join(root, 'node_modules/@opentui/solid/scripts/solid-plugin.js'))).default;
const parserWorker = fs.realpathSync(path.join(root, 'node_modules/@opentui/core/parser.worker.js'));
const workerRelativePath = path.relative(root, parserWorker).replaceAll('\\', '/');

for (const target of selected) {
  const name = ['agent-dash', target.os === 'win32' ? 'windows' : target.os, target.arch, target.avx2 === false ? 'baseline' : undefined, target.abi].filter(Boolean).join('-');
  const bunTarget = name.replace('agent-dash', 'bun');
  const output = `dist/${name}/bin/agent-dash`;
  const bunfsRoot = target.os === 'win32' ? 'B:/~BUN/root/' : '/$bunfs/root/';
  console.log(`building ${name}`);
  await $`mkdir -p dist/${name}/bin`;
  await Bun.build({
    tsconfig: './tsconfig.json',
    plugins: [solidPlugin],
    sourcemap: 'external',
    compile: {
      autoloadBunfig: false,
      autoloadDotenv: false,
      // @ts-expect-error Bun target types omit supported cross-compile names.
      target: bunTarget,
      outfile: output,
    },
    entrypoints: ['./src/index.tsx', parserWorker],
    define: {
      OTUI_TREE_SITTER_WORKER_PATH: JSON.stringify(bunfsRoot + workerRelativePath),
      ...(target.os === 'linux' ? { 'process.env.OPENTUI_LIBC': JSON.stringify(target.abi === 'musl' ? 'musl' : 'glibc') } : {}),
    },
  });
  await Bun.write(`dist/${name}/package.json`, JSON.stringify({ name, version: '0.1.0', os: [target.os], cpu: [target.arch] }, null, 2));
}

cleanArtifacts();
