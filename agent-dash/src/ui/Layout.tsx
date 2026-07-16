/** @jsxImportSource @opentui/solid */
import type { JSX } from '@opentui/solid';
import { invokeGlobalSelectionMouseUpHandler } from '../selectionCopy';

export function Layout(props: { header: JSX.Element; content: JSX.Element; footer: JSX.Element }) {
  return (
    <box style={{ width: '100%', height: '100%', flexDirection: 'column' }} onMouseUp={() => invokeGlobalSelectionMouseUpHandler()}>
      <box style={{ width: '100%', height: 2 }}>{props.header}</box>
      <box style={{ width: '100%', flexGrow: 1, minHeight: 0 }}>{props.content}</box>
      <box style={{ width: '100%', height: 1 }}>{props.footer}</box>
    </box>
  );
}
