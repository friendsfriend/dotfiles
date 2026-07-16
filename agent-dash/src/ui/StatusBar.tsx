/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { For } from 'solid-js';
import { uiColors } from './colors';

export type Keybind = { key: string; action: string };
export function StatusBar(props: { prompt: string; approval: boolean; keybinds?: Keybind[] }) {
  const keys = () => props.keybinds ?? [
    ...(props.approval ? [{ key: 'enter', action: 'approve' }] : []),
    { key: 'J/K', action: 'switch panel' },
    { key: 'j/k', action: 'scroll focused panel' },
    { key: 'r', action: 'refresh' },
    { key: 'q', action: 'quit' },
  ];
  return <box backgroundColor={uiColors.bgMantle} style={{ width: '100%', height: 1, flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
    <For each={keys()}>{(item, index) => <text fg={uiColors.textMuted}><span style={{ fg: uiColors.primary, attributes: TextAttributes.BOLD }}>{item.key}</span> {item.action}{index() < keys().length - 1 ? '  •  ' : ''}</text>}</For>
  </box>;
}
