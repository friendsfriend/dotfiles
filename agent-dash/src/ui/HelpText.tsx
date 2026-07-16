/** @jsxImportSource @opentui/solid */
import { For } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import { uiColors } from './colors';
export function HelpText(props: { entries: Array<{ key: string; action: string }> }) { return <text fg={uiColors.textMuted}><For each={props.entries}>{(entry, index) => <><span style={{ fg: uiColors.primary, attributes: TextAttributes.BOLD }}>{entry.key}</span> {entry.action}{index() < props.entries.length - 1 ? '  •  ' : ''}</>}</For></text>; }
