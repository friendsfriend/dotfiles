/** @jsxImportSource @opentui/solid */
import { For } from 'solid-js';
import { GenericModal } from './GenericModal';
import { uiColors } from './colors';

export function VerdictModal(props: { title: string; content: string; offset: number; lines: number }) {
  const visible = () => props.content.split(/\r?\n/).slice(props.offset, props.offset + props.lines);
  return <GenericModal title={props.title} widthPercent={0.7} heightPercent={0.75} help={[{ key: 'j/k', action: 'Scroll' }, { key: 'Esc', action: 'Close' }]}>
    <box width="100%" flexDirection="column" overflow="hidden">
      <For each={visible()}>{line => <text fg={line.startsWith('#') ? uiColors.primary : line.startsWith('- ') ? uiColors.textPrimary : uiColors.textSecondary}>{line}</text>}</For>
    </box>
  </GenericModal>;
}
