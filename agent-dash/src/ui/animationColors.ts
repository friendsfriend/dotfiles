import { RGBA } from '@opentui/core';
import { highlightColor, type Highlight } from './Highlight';

export type AnimationHighlights = readonly [Highlight, Highlight, Highlight];

const mix = (from: RGBA, to: RGBA, amount: number) => RGBA.fromValues(
  from.r + (to.r - from.r) * amount,
  from.g + (to.g - from.g) * amount,
  from.b + (to.b - from.b) * amount,
  1,
);

export function createAuroraPalette(highlights: AnimationHighlights, steps = 8) {
  const colors = highlights.map(highlight => RGBA.fromHex(highlightColor(highlight))) as [RGBA, RGBA, RGBA];
  return [
    ...Array.from({ length: steps }, (_, index) => mix(colors[0], colors[1], index / steps)),
    ...Array.from({ length: steps }, (_, index) => mix(colors[1], colors[2], index / steps)),
    ...Array.from({ length: steps }, (_, index) => mix(colors[2], colors[0], index / steps)),
  ];
}

export function createTonePalette(highlight: Highlight, steps = 8) {
  const base = RGBA.fromHex(highlightColor(highlight));
  const dark = mix(base, RGBA.fromValues(0, 0, 0, 1), 0.35);
  const neutral = RGBA.fromHex(highlightColor('primary'));
  return [
    ...Array.from({ length: steps }, (_, index) => mix(dark, base, index / steps)),
    ...Array.from({ length: steps }, (_, index) => mix(base, neutral, index / steps)),
    ...Array.from({ length: steps }, (_, index) => mix(neutral, dark, index / steps)),
  ];
}

export function auroraColor(palette: RGBA[], position: number, progress: number) {
  const phase = (0.5 + Math.sin(position * Math.PI * 3 - progress * Math.PI * 2) / 4 + Math.sin(position * Math.PI * 7 + progress * Math.PI * 4) / 8) % 1;
  return palette[Math.floor(phase * palette.length)]!;
}
