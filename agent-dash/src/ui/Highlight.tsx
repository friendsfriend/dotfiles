/** @jsxImportSource @opentui/solid */
import { uiColors } from './colors';
export type Highlight = 'primary' | 'secondary' | 'positive' | 'negative' | 'warning' | 'highlight' | 'highlight1' | 'highlight2' | 'highlight3';
export function highlightForIndex(index: number): Highlight { return (['highlight1', 'highlight2', 'highlight3'] as Highlight[])[Math.max(0, index) % 3]!; }
export function highlightColor(value?: Highlight) { switch (value) { case 'positive': return uiColors.success; case 'negative': return uiColors.error; case 'warning': return uiColors.warning; case 'secondary': return uiColors.textMuted; case 'highlight2': return uiColors.primary; case 'highlight3': return uiColors.info; case 'highlight': case 'highlight1': return uiColors.accent; default: return uiColors.textPrimary; } }
export function HighlightedText(props: { text: string | number; highlight?: Highlight; attributes?: number }) { return <text fg={highlightColor(props.highlight)} attributes={props.attributes ?? 0}>{String(props.text)}</text>; }
