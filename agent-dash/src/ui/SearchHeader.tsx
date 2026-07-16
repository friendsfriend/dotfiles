/** @jsxImportSource @opentui/solid */
import type { JSX } from 'solid-js';
import { uiColors, colors } from './colors';
export function SearchHeader(props: { children: JSX.Element; search?: string }) { return <box backgroundColor={uiColors.bgSurface1} style={{ width: '100%', height: 1, paddingLeft: 1, flexDirection: 'row' }}>{props.search ? <><text fg={colors.peach}>/</text><text fg={uiColors.textPrimary}>{props.search}</text></> : props.children}</box>; }
