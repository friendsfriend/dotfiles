/** @jsxImportSource @opentui/solid */
import { GenericModal } from './GenericModal';
import { uiColors } from './colors';

export function ErrorDialog(props: { title: string; message: string; onClose: () => void }) {
  return <GenericModal title={`✗ ${props.title}`} titleColor={uiColors.error} help={[{ key: 'Esc', action: 'Close' }]} widthPercent={0.4} heightPercent={0.3} onBackdropClick={props.onClose}>
    <box width="100%" flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center" paddingTop={1} paddingBottom={1}>
      <text fg={uiColors.textPrimary}>{props.message}</text>
    </box>
  </GenericModal>;
}
