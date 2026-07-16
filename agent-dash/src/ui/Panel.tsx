/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import type { JSX } from 'solid-js';
import { uiColors } from './colors';

export function Panel(props: { title: string; children: JSX.Element; accent?: string; active?: boolean; style?: Record<string, unknown> }) {
  return (
    <box backgroundColor={uiColors.bgMantle} style={{ flexDirection: 'column', overflow: 'hidden', ...props.style }}>
      <box style={{ height: 1, paddingLeft: 1 }}>
        <text fg={props.active ? props.accent ?? uiColors.primary : uiColors.textPrimary} attributes={TextAttributes.BOLD}>{props.title}</text>
      </box>
      <box style={{ flexGrow: 1, minHeight: 0, flexDirection: 'row' }}>
        <box backgroundColor={props.active ? props.accent ?? uiColors.primary : uiColors.bgMantle} style={{ width: 1, height: '100%' }} />
        <box style={{ flexGrow: 1, minWidth: 0, flexDirection: 'column', paddingLeft: 1, paddingRight: 1 }}>{props.children}</box>
      </box>
    </box>
  );
}
