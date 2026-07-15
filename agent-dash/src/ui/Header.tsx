/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { uiColors } from './colors';

export function Header(props: { change: string; phase: string; branch: string; updated: string }) {
  return (
    <box backgroundColor={uiColors.bgMantle} style={{ width: '100%', height: 2, flexDirection: 'column', paddingLeft: 1, paddingRight: 1 }}>
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <text fg={uiColors.primary} attributes={TextAttributes.BOLD}>AGT</text>
        <text fg={uiColors.textSecondary}>  {props.change}</text>
        <box style={{ flexGrow: 1 }} />
        <text fg={uiColors.primary} attributes={TextAttributes.BOLD}>{props.phase}</text>
      </box>
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <text fg={uiColors.accent} attributes={TextAttributes.BOLD}>DASH</text>
        <text fg={uiColors.textMuted}>  {props.branch}</text>
        <box style={{ flexGrow: 1 }} />
        <text fg={uiColors.textMuted}>updated {props.updated}</text>
      </box>
    </box>
  );
}
