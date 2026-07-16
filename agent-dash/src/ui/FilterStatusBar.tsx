/** @jsxImportSource @opentui/solid */
import { HighlightedText } from './Highlight';
import { uiColors } from './colors';
export function FilterStatusBar(props: { filter?: string; sort?: string }) { if (!props.filter && !props.sort) return null; return <box backgroundColor={uiColors.bgSurface0} style={{ height: 1, flexDirection: 'row', paddingLeft: 1 }}><HighlightedText text={props.filter ?? props.sort ?? ''} highlight="highlight2" /></box>; }
