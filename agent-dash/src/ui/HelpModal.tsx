/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { For } from 'solid-js';
import { GenericModal } from './GenericModal';
import { uiColors } from './colors';

export type HelpSection = { title: string; items: Array<{ key: string; description: string }> };
export function HelpModal(props: { title: string; sections: HelpSection[]; offset: number; lines: number }) {
  const rows = () => props.sections.flatMap(section => [{ title: section.title }, ...section.items]);
  const visible = () => rows().slice(props.offset, props.offset + props.lines);
  return <GenericModal title="Help" widthPercent={0.72} heightPercent={0.78} help={[{ key: 'j/k', action: 'Navigate' }, { key: 'Esc', action: 'Close' }]}>
    <box width="100%" flexDirection="column" overflow="hidden">
      <For each={visible()}>{row => 'title' in row
        ? <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>{row.title}</text>
        : <box flexDirection="row" paddingLeft={1}><text fg={uiColors.primary} attributes={TextAttributes.BOLD}>{row.key.padEnd(14)}</text><text fg={uiColors.textPrimary}>{row.description}</text></box>
      }</For>
    </box>
  </GenericModal>;
}
