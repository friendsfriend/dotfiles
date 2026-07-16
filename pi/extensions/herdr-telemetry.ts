import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export default function (pi: ExtensionAPI) {
  const change = process.env.HERDR_CHANGE_ID;
  const role = process.env.HERDR_ROLE;
  const path = change ? join(process.cwd(), '.herdr-workflow', change, 'telemetry.jsonl') : undefined;
  const healthPath = join(process.env.HOME ?? '', '.pi', 'agent', 'herdr-provider-health.json');
  let model = 'unknown';
  const write = (event: string, fields: Record<string, unknown> = {}) => {
    if (!path) return;
    try {
      mkdirSync(join(process.cwd(), '.herdr-workflow', change!), { recursive: true });
      appendFileSync(path, JSON.stringify({ at: new Date().toISOString(), event, role, ...fields }) + '\n');
    } catch { /* telemetry must never affect an agent */ }
  };
  const recordProviderFailure = (status: number) => {
    if (status !== 429 && status < 500) return;
    try {
      const health = JSON.parse(readFileSync(healthPath, 'utf8')) as Record<string, { failures: number; lastFailure: string }>;
      const provider = model.split('/')[0] ?? 'unknown';
      const previous = health[provider];
      const recent = previous && Date.now() - Date.parse(previous.lastFailure) < 120_000;
      health[provider] = { failures: recent ? previous.failures + 1 : 1, lastFailure: new Date().toISOString() };
      writeFileSync(healthPath, JSON.stringify(health));
    } catch { /* health is advisory */ }
  };
  pi.on('model_select', (event: any) => { model = `${event.model.provider}/${event.model.id}`; write('model_selected', { model }); });
  pi.on('agent_start', () => write('pi_agent_start', { model }));
  pi.on('agent_end', () => write('pi_agent_end'));
  pi.on('agent_settled', () => write('pi_agent_settled'));
  pi.on('after_provider_response', (event: any) => { write('provider_response', { status: event.status, retryAfter: event.headers?.['retry-after'], model }); recordProviderFailure(event.status); });
  pi.on('message_end', (event: any) => {
    if (event.message?.role !== 'assistant') return;
    const usage = event.message.usage;
    if (usage) write('model_usage', { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cacheReadTokens: usage.cacheReadTokens, cacheWriteTokens: usage.cacheWriteTokens, cost: usage.cost?.total });
  });
  pi.on('tool_execution_end', (event: any) => { if (event.isError) write('tool_error', { tool: event.toolName }); });
}
