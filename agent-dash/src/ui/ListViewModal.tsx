/** @jsxImportSource @opentui/solid */
import { For, Show, createMemo, type JSX } from 'solid-js';
import { useTerminalDimensions } from '@opentui/solid';
import { GenericModal, type HelpEntry, type SummaryEntry } from './GenericModal';
import { uiColors } from './colors';

export function ListViewModal<T>(props: { title: string; fieldLabel?: string; items: T[]; selectedIndex: number; renderItem: (item: T, selected: boolean) => JSX.Element; help: HelpEntry[]; summary?: SummaryEntry[]; step?: number; total?: number; filterQuery?: string; filterActive?: boolean; heightPercent?: number }) {
  const dimensions = useTerminalDimensions();
  const lines = createMemo(() => Math.max(3, Math.floor(dimensions().height * (props.heightPercent ?? 0.6)) - 6 - (props.fieldLabel ? 1 : 0)));
  const start = createMemo(() => Math.max(0, Math.min(props.selectedIndex - Math.floor(lines() / 2), Math.max(0, props.items.length - lines()))));
  const visible = createMemo(() => props.items.slice(start(), start() + lines()));
  return <GenericModal title={props.title} fieldLabel={props.fieldLabel} step={props.step} total={props.total} summary={props.summary} search={props.filterActive ? props.filterQuery ?? '' : undefined} help={props.help} heightPercent={props.heightPercent ?? 0.6}>
    <Show when={props.items.length} fallback={<text fg={uiColors.textMuted}>No matching values</text>}>
      <For each={visible()}>{(item, index) => {
        const absolute = () => start() + index();
        const selected = () => absolute() === props.selectedIndex;
        return <box backgroundColor={selected() ? uiColors.bgSurface0 : undefined} style={{ width: '100%', height: 1, flexShrink: 0, flexDirection: 'row' }}>
          <box backgroundColor={selected() ? uiColors.accent : uiColors.bgMantle} width={2} />
          <box style={{ flexGrow: 1, minWidth: 0, overflow: 'hidden' }}>{props.renderItem(item, selected())}</box>
        </box>;
      }}</For>
      <Show when={props.items.length > lines()}><text fg={uiColors.textMuted}>  {props.selectedIndex + 1}-{Math.min(props.items.length, start() + lines())}/{props.items.length}</text></Show>
    </Show>
  </GenericModal>;
}
