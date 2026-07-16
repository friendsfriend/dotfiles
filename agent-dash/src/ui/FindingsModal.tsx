/** @jsxImportSource @opentui/solid */
import { For, Show, createEffect } from 'solid-js';
import { TextAttributes, type BoxRenderable, type ScrollBoxRenderable } from '@opentui/core';
import { GenericModal } from './GenericModal';
import { ScrollableContent } from './ScrollableContent';
import { Badge } from './Badge';
import { uiColors } from './colors';

export type FindingEvent = { type: string; verdict?: string; severity?: string; path?: string; line?: number; detail?: string; evidence?: string; changedCode?: string; fix?: string };
export function FindingsModal(props: { title: string; events: FindingEvent[]; selected: number }) {
  const verdict = () => props.events.find(event => event.type === 'verdict')?.verdict;
  const findings = () => props.events.filter(event => event.type !== 'verdict');
  let scrollbox: ScrollBoxRenderable | undefined;
  const cards: Array<BoxRenderable | undefined> = [];
  createEffect(() => { const card = cards[props.selected]; if (card) scrollbox?.scrollChildIntoView(card.id); });
  return <GenericModal title={props.title} widthPercent={0.78} heightPercent={0.8} help={[{ key: 'j/k', action: 'Select' }, { key: 'Enter', action: 'Open editor' }, { key: 'Esc', action: 'Close' }]}>
    <box height={1} width="100%" flexDirection="row"><text fg={verdict() === 'PASS' ? uiColors.success : verdict() === 'FAIL' ? uiColors.error : uiColors.textMuted}>VERDICT: {verdict() ?? 'UNKNOWN'}</text><box flexGrow={1} /><text fg={uiColors.textMuted}>{findings().length} findings</text></box>
    <ScrollableContent onScrollBoxReady={box => { scrollbox = box; }}>
      <For each={findings()}>{(event, index) => { const selected = () => index() === props.selected; return <box ref={(card: BoxRenderable) => { cards[index()] = card; }} width="100%" flexDirection="column" backgroundColor={selected() ? uiColors.bgSurface1 : uiColors.bgMantle} paddingLeft={1} paddingRight={1} marginBottom={1}>
        <box flexDirection="row"><Badge text={(event.severity ?? 'info').toUpperCase()} highlight={event.severity === 'critical' ? 'negative' : event.severity === 'warning' ? 'warning' : 'highlight2'} /><text fg={uiColors.textMuted}>  {event.path ?? 'repository'}{event.line ? `:${event.line}` : ''}</text></box>
        <Show when={event.changedCode ?? event.evidence}>{code => <box backgroundColor={uiColors.bgCrust} marginTop={1} paddingLeft={1} paddingRight={1} flexDirection="column"><For each={code().split(/\r?\n/)}>{(line, lineIndex) => { const type = () => line.startsWith('+') ? 'added' : line.startsWith('-') ? 'removed' : 'context'; const fg = () => type() === 'added' ? uiColors.success : type() === 'removed' ? uiColors.error : uiColors.textSecondary; const bg = () => type() === 'added' ? '#24312b' : type() === 'removed' ? '#3b252f' : uiColors.bgCrust; return <box height={1} backgroundColor={bg()} flexDirection="row"><text fg={uiColors.textMuted}>{event.line ? String(event.line + lineIndex()).padStart(5) : '     '} </text><text fg={fg()}>{line}</text></box>; }}</For></box>}</Show>
        <Show when={event.detail}><box paddingLeft={3} paddingRight={3} flexDirection="row" justifyContent="center"><text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>❝ {event.detail} ❞</text></box></Show><Show when={event.fix}><text fg={uiColors.success} attributes={TextAttributes.BOLD}>Resolution: {event.fix}</text></Show>
      </box>; }}</For>
    </ScrollableContent>
  </GenericModal>;
}
