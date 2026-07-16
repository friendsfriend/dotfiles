/** @jsxImportSource @opentui/solid */
import { RGBA, TextAttributes } from '@opentui/core';
import { useTerminalDimensions } from '@opentui/solid';
import { For, Show, createEffect, createSignal, onCleanup, untrack, type JSX } from 'solid-js';
import { colors, uiColors } from './colors';
import { SearchHeader } from './SearchHeader';
import { invokeGlobalSelectionMouseUpHandler } from '../selectionCopy';

export interface HelpEntry { key: string; action: string }
export interface SummaryEntry { label: string; value: string }

const mixHex = (from: string, to: string, amount: number) => {
  const channel = (hex: string, offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  const mixed = [1, 3, 5].map(offset => Math.round(channel(from, offset) + (channel(to, offset) - channel(from, offset)) * amount));
  return `#${mixed.map(value => value.toString(16).padStart(2, '0')).join('')}`;
};
const progressColor = (position: number) => position < 0.5
  ? mixHex(colors.blue, colors.lavender, position * 2)
  : mixHex(colors.lavender, colors.green, (position - 0.5) * 2);

function SummaryTable(props: { entries: SummaryEntry[]; full?: boolean }) {
  return <box width={props.full ? '100%' : 42} flexShrink={0} marginLeft={props.full ? 0 : 2} flexDirection="column">
    <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Selections</text>
    <For each={props.entries}>{entry => <box width="100%" height={1} flexDirection="row">
      <box width={2} backgroundColor={uiColors.bgMantle} />
      <box width={26} overflow="hidden"><text fg={uiColors.textMuted}>{entry.label}</text></box>
      <box flexGrow={1} minWidth={0} overflow="hidden"><text fg={uiColors.textPrimary}>{entry.value}</text></box>
    </box>}</For>
  </box>;
}

export function GenericModal(props: { title: string; titleColor?: string; fieldLabel?: string; children: JSX.Element; help: HelpEntry[]; summary?: SummaryEntry[]; summaryOnly?: boolean; widthPercent?: number; heightPercent?: number; heightLines?: number; step?: number; total?: number; search?: string; onBackdropClick?: () => void }) {
  const dimensions = useTerminalDimensions();
  const width = () => Math.floor(dimensions().width * (props.widthPercent ?? (props.summaryOnly ? 0.6 : props.summary?.length ? 0.75 : 0.5)));
  const height = () => Math.min(dimensions().height, props.heightLines ?? Math.floor(dimensions().height * (props.heightPercent ?? 0.7)));
  const progressWidth = () => Math.max(1, width() - 4);
  const [animatedProgress, setAnimatedProgress] = createSignal(0);
  let progressTimer: ReturnType<typeof setInterval> | undefined;
  createEffect(() => {
    const target = progressWidth() * ((props.step ?? 0) + 1) / Math.max(1, props.total ?? 1);
    const start = untrack(animatedProgress);
    const startedAt = Date.now();
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      const elapsed = Math.min(1, (Date.now() - startedAt) / 320);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setAnimatedProgress(start + (target - start) * eased);
      if (elapsed === 1) clearInterval(progressTimer);
    }, 16);
  });
  onCleanup(() => clearInterval(progressTimer));
  const progressEnd = () => Math.min(progressWidth() - 1, Math.floor(animatedProgress()));
  const progressCharacter = (index: number) => index < progressEnd() ? '━' : index === progressEnd() ? '▸' : '─';
  return <box position="absolute" top={0} left={0} width={dimensions().width} height={dimensions().height} flexDirection="column" justifyContent="center" alignItems="center" backgroundColor={RGBA.fromValues(0, 0, 0, 0.35)} onMouseUp={props.onBackdropClick}>
    <box backgroundColor={RGBA.fromValues(24 / 255, 24 / 255, 37 / 255, 0.96)} onMouseUp={() => invokeGlobalSelectionMouseUpHandler()} width={width()} height={height()} flexDirection="column" paddingTop={1} paddingBottom={1} paddingLeft={2} paddingRight={2}>
      <SearchHeader search={props.search}><text fg={props.titleColor ?? uiColors.primary} attributes={TextAttributes.BOLD}>{props.title}</text></SearchHeader>
      {props.step !== undefined && <box width="100%" height={1}><text><For each={Array.from({ length: progressWidth() }, (_, index) => index)}>{index => <span style={{ fg: index <= progressEnd() ? progressColor(index / Math.max(1, progressWidth() - 1)) : uiColors.textMuted }}>{progressCharacter(index)}</span>}</For></text></box>}
      <Show when={props.summaryOnly} fallback={
        <box width="100%" flexDirection="row" flexGrow={1} flexShrink={1} minHeight={0} overflow="hidden">
          <box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
            <Show when={props.fieldLabel}><text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>{props.fieldLabel}</text></Show>
            <box style={{ width: '100%', flexDirection: 'column', flexGrow: 1, flexShrink: 1, minHeight: 0, overflow: 'hidden' }}>{props.children}</box>
          </box>
          <Show when={props.summary?.length}><SummaryTable entries={props.summary!} /></Show>
        </box>
      }>
        <box width="100%" flexGrow={1} flexDirection="column"><SummaryTable entries={props.summary ?? []} full /></box>
      </Show>
      <box style={{ flexDirection: 'row', height: 1 }}><For each={props.help}>{(entry, index) => <text fg={uiColors.textMuted}><span style={{ fg: uiColors.primary, attributes: TextAttributes.BOLD }}>{entry.key}</span> {entry.action}{index() < props.help.length - 1 ? '  •  ' : ''}</text>}</For></box>
    </box>
  </box>;
}
