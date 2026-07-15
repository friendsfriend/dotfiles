/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { For } from 'solid-js';
import { uiColors } from './colors';

export function StatusBar(props: { prompt: string; message: string; approval: boolean }) {
  const keys = () => [
    ...(props.approval ? [{ key: 'enter', action: 'approve' }] : []),
    { key: 'r', action: 'refresh' },
    { key: 'q', action: 'quit' },
  ];
  return (
    <box backgroundColor={uiColors.bgMantle} style={{ width: '100%', height: 3, flexDirection: 'column', paddingLeft: 1, paddingRight: 1 }}>
      <text fg={props.approval ? uiColors.warning : uiColors.textMuted} attributes={props.approval ? TextAttributes.BOLD : 0}>{props.prompt}</text>
      <text fg={props.message ? uiColors.info : uiColors.textMuted}>{props.message || 'Auto-refresh every 5 seconds'}</text>
      <box style={{ flexDirection: 'row' }}>
        <For each={keys()}>{(item, index) => <text fg={uiColors.textMuted}><span style={{ fg: uiColors.primary, attributes: TextAttributes.BOLD }}>{item.key}</span> {item.action}{index() < keys().length - 1 ? '  •  ' : ''}</text>}</For>
      </box>
    </box>
  );
}
