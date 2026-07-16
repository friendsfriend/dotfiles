/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { Show } from 'solid-js';
import { uiColors } from './colors';
import { activeNotification } from '../notifications';
export function NotificationOverlay() {
  return <Show when={activeNotification()} keyed>{item => { const n = item; const bg = n.type === 'success' ? uiColors.success : n.type === 'warning' ? uiColors.warning : n.type === 'error' ? uiColors.error : uiColors.info; const icon = n.type === 'success' ? '✓ ' : n.type === 'warning' ? '! ' : n.type === 'error' ? '✗ ' : 'ℹ '; return <box position="absolute" right={2} bottom={1} paddingLeft={2} paddingRight={2} backgroundColor={bg}><text fg={uiColors.bgBase} attributes={TextAttributes.BOLD}>{icon}{n.message}</text></box>; }}</Show>;
}
