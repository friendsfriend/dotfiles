/** @jsxImportSource @opentui/solid */
import { For, createEffect } from 'solid-js';
import type { BoxRenderable, ScrollBoxRenderable } from '@opentui/core';
import { GenericModal } from './GenericModal';
import { ScrollableContent } from './ScrollableContent';
import { uiColors } from './colors';

export type TraceEvent = { at: string; event: string; role?: string; model?: string; cost?: number; status?: number; tier?: string; roles?: string[]; reports?: string[]; fallback?: string };
const label = (event: TraceEvent) => ({ pi_agent_start: 'Agent started', pi_agent_end: 'Agent completed', pi_agent_settled: 'Agent waiting', model_usage: 'Model usage', provider_response: 'Provider response', verification_started: 'Verification started', verification_failed: 'Verification failed', provider_launch_fallback: 'Model fallback' }[event.event] ?? event.event.replaceAll('_', ' '));
export function EventsModal(props: { events: TraceEvent[]; selected: number }) {
  let scrollbox: ScrollBoxRenderable | undefined;
  const cards: Array<BoxRenderable | undefined> = [];
  createEffect(() => { const card = cards[props.selected]; if (card) scrollbox?.scrollChildIntoView(card.id); });
  return <GenericModal title={`Traces · ${props.events.length}`} widthPercent={0.72} heightPercent={0.78} help={[{ key: 'j/k', action: 'Scroll' }, { key: 'Esc', action: 'Close' }]}>
    <ScrollableContent onScrollBoxReady={box => { scrollbox = box; }}>
      <For each={props.events}>{(event, index) => <box ref={(card: BoxRenderable) => { cards[index()] = card; }} width="100%" flexDirection="column" backgroundColor={index() === props.selected ? uiColors.bgSurface1 : event.event === 'verification_failed' ? uiColors.bgSurface1 : uiColors.bgMantle} paddingLeft={1} paddingRight={1}>
        <box flexDirection="row"><text fg={index() === props.selected ? uiColors.accent : uiColors.textMuted}>{index() === props.selected ? '› ' : '  '}</text><text fg={event.event.includes('failed') || (event.status ?? 200) >= 400 ? uiColors.error : uiColors.primary}>{label(event)}</text><text fg={uiColors.textMuted}>{event.role ? ` · ${event.role}` : ' · workflow'}</text><box flexGrow={1} /><text fg={uiColors.textMuted}>{event.at}</text></box>
        {event.event === 'model_usage' && <text fg={uiColors.textSecondary}>{event.role ?? 'agent'} · {event.model ?? 'default'} · ${event.cost?.toFixed(4) ?? '0.0000'}</text>}
        {event.event === 'provider_response' && <text fg={uiColors.textSecondary}>{event.role ?? 'agent'} · {event.model ?? 'default'} · HTTP {event.status ?? 'unknown'}</text>}
        {event.event === 'pi_agent_start' && <text fg={uiColors.textSecondary}>{event.role ?? 'agent'} · {event.model ?? 'default'}</text>}
        {event.event === 'verification_started' && <text fg={uiColors.textSecondary}>Tier {event.tier ?? 'default'} · {(event.roles ?? []).join(', ')}</text>}
        {event.event === 'verification_failed' && <text fg={uiColors.error}>{(event.reports ?? []).length} blocking report(s)</text>}
        {event.event === 'provider_launch_fallback' && <text fg={uiColors.warning}>{event.role ?? 'agent'} → {event.fallback ?? 'fallback model'}</text>}
      </box>}</For>
    </ScrollableContent>
  </GenericModal>;
}
