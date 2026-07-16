import { execFileSync } from 'node:child_process';

export function copyToClipboard(text: string) {
  const commands = process.platform === 'darwin'
    ? [['pbcopy']]
    : process.platform === 'win32'
      ? [['clip']]
      : [['xclip', '-selection', 'clipboard'], ['xsel', '--clipboard', '--input']];
  for (const [command, ...args] of commands) {
    try {
      execFileSync(command!, args, { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
      return true;
    } catch {
      // Try next platform fallback.
    }
  }
  return false;
}

export function writeOsc52(text: string) {
  const sequence = `\x1b]52;c;${Buffer.from(text).toString('base64')}\x07`;
  process.stdout.write(process.env.TMUX ? `\x1bPtmux;\x1b${sequence}\x1b\\` : sequence);
}
