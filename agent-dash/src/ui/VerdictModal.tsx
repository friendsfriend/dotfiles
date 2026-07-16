/** @jsxImportSource @opentui/solid */
import { createEffect } from 'solid-js';
import type { ScrollBoxRenderable } from '@opentui/core';
import { useTerminalDimensions } from '@opentui/solid';
import { GenericModal } from './GenericModal';
import { ScrollableContent } from './ScrollableContent';
import { uiColors } from './colors';

export function VerdictModal(props: { title: string; content: string; offset: number; lines: number }) {
  const dimensions = useTerminalDimensions();
  const contentWidth = () => Math.max(40, Math.floor(dimensions().width * .7) - 8);
  let scrollbox: ScrollBoxRenderable | undefined;
  createEffect(() => scrollbox?.scrollTo(props.offset));
  return <GenericModal title={props.title} widthPercent={0.7} heightPercent={0.75} help={[{ key: 'j/k', action: 'Scroll' }, { key: 'Esc', action: 'Close' }]}>
    <ScrollableContent onScrollBoxReady={box => { scrollbox = box; }}>
      <code filetype="markdown" content={props.content} syntaxStyle={{} as any} fg={uiColors.textSecondary} width={contentWidth()} />
    </ScrollableContent>
  </GenericModal>;
}
