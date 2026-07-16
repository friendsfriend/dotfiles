import { createSignal } from 'solid-js';
import aura from "./themes/aura.json" with { type: "json" };
import ayu from "./themes/ayu.json" with { type: "json" };
import carbonfox from "./themes/carbonfox.json" with { type: "json" };
import catppuccin_frappe from "./themes/catppuccin-frappe.json" with { type: "json" };
import catppuccin_macchiato from "./themes/catppuccin-macchiato.json" with { type: "json" };
import catppuccin from "./themes/catppuccin.json" with { type: "json" };
import cobalt2 from "./themes/cobalt2.json" with { type: "json" };
import cursor from "./themes/cursor.json" with { type: "json" };
import dracula from "./themes/dracula.json" with { type: "json" };
import everforest from "./themes/everforest.json" with { type: "json" };
import flexoki from "./themes/flexoki.json" with { type: "json" };
import github from "./themes/github.json" with { type: "json" };
import gruvbox from "./themes/gruvbox.json" with { type: "json" };
import kanagawa from "./themes/kanagawa.json" with { type: "json" };
import lucent_orng from "./themes/lucent-orng.json" with { type: "json" };
import material from "./themes/material.json" with { type: "json" };
import matrix from "./themes/matrix.json" with { type: "json" };
import mercury from "./themes/mercury.json" with { type: "json" };
import monokai from "./themes/monokai.json" with { type: "json" };
import nightowl from "./themes/nightowl.json" with { type: "json" };
import nord from "./themes/nord.json" with { type: "json" };
import one_dark from "./themes/one-dark.json" with { type: "json" };
import opencode from "./themes/opencode.json" with { type: "json" };
import orng from "./themes/orng.json" with { type: "json" };
import osaka_jade from "./themes/osaka-jade.json" with { type: "json" };
import palenight from "./themes/palenight.json" with { type: "json" };
import rosepine from "./themes/rosepine.json" with { type: "json" };
import solarized from "./themes/solarized.json" with { type: "json" };
import synthwave84 from "./themes/synthwave84.json" with { type: "json" };
import tokyonight from "./themes/tokyonight.json" with { type: "json" };
import vercel from "./themes/vercel.json" with { type: "json" };
import vesper from "./themes/vesper.json" with { type: "json" };
import zenburn from "./themes/zenburn.json" with { type: "json" };

export type ThemeJson = {
  defs?: Record<string, string>;
  theme: Record<string, string | number | { dark: string; light: string } | undefined>;
};

const DEFAULT_THEME_JSON: Record<string, ThemeJson> = {
  aura: aura as ThemeJson,
  ayu: ayu as ThemeJson,
  carbonfox: carbonfox as ThemeJson,
  "catppuccin-frappe": catppuccin_frappe as ThemeJson,
  "catppuccin-macchiato": catppuccin_macchiato as ThemeJson,
  catppuccin: catppuccin as ThemeJson,
  cobalt2: cobalt2 as ThemeJson,
  cursor: cursor as ThemeJson,
  dracula: dracula as ThemeJson,
  everforest: everforest as ThemeJson,
  flexoki: flexoki as ThemeJson,
  github: github as ThemeJson,
  gruvbox: gruvbox as ThemeJson,
  kanagawa: kanagawa as ThemeJson,
  "lucent-orng": lucent_orng as ThemeJson,
  material: material as ThemeJson,
  matrix: matrix as ThemeJson,
  mercury: mercury as ThemeJson,
  monokai: monokai as ThemeJson,
  nightowl: nightowl as ThemeJson,
  nord: nord as ThemeJson,
  "one-dark": one_dark as ThemeJson,
  opencode: opencode as ThemeJson,
  orng: orng as ThemeJson,
  "osaka-jade": osaka_jade as ThemeJson,
  palenight: palenight as ThemeJson,
  rosepine: rosepine as ThemeJson,
  solarized: solarized as ThemeJson,
  synthwave84: synthwave84 as ThemeJson,
  tokyonight: tokyonight as ThemeJson,
  vercel: vercel as ThemeJson,
  vesper: vesper as ThemeJson,
  zenburn: zenburn as ThemeJson,
};

const customThemeJson: Record<string, ThemeJson> = {};
let systemThemeJson: ThemeJson | undefined;
export const themeNames = Object.keys(DEFAULT_THEME_JSON).sort();

function allThemeJson(): Record<string, ThemeJson> {
  return systemThemeJson ? { ...DEFAULT_THEME_JSON, ...customThemeJson, system: systemThemeJson } : { ...DEFAULT_THEME_JSON, ...customThemeJson };
}

function syncThemeNames() {
  themeNames.splice(0, themeNames.length, ...Object.keys(allThemeJson()).sort());
}

export function isThemeJson(value: unknown): value is ThemeJson {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const theme = Reflect.get(value, "theme");
  return !!theme && typeof theme === "object" && !Array.isArray(theme);
}

export function setCustomThemes(themes: Record<string, ThemeJson>) {
  for (const key of Object.keys(customThemeJson)) delete customThemeJson[key];
  Object.assign(customThemeJson, themes);
  syncThemeNames();
}

export function setSystemTheme(theme: ThemeJson | undefined) {
  systemThemeJson = theme;
  syncThemeNames();
}

const [activeThemeName, setActiveThemeNameSignal] = createSignal("catppuccin");

function ansiToHex(code: number): string {
  const colors = ["#000000", "#800000", "#008000", "#808000", "#000080", "#800080", "#008080", "#c0c0c0", "#808080", "#ff0000", "#00ff00", "#ffff00", "#0000ff", "#ff00ff", "#00ffff", "#ffffff"];
  if (code < colors.length) return colors[code] ?? "#000000";
  if (code < 232) {
    const index = code - 16;
    const b = index % 6;
    const g = Math.floor(index / 6) % 6;
    const r = Math.floor(index / 36);
    const val = (x: number) => (x === 0 ? 0 : x * 40 + 55);
    return `#${[val(r), val(g), val(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }
  const gray = Math.max(0, Math.min(255, (code - 232) * 10 + 8));
  const hex = gray.toString(16).padStart(2, "0");
  return `#${hex}${hex}${hex}`;
}

function resolveColor(theme: ThemeJson, key: string, fallback: string, mode: "dark" | "light" = "dark", chain: string[] = []): string {
  const value = theme.theme[key];
  return resolveValue(theme, value, fallback, mode, chain);
}

function resolveValue(theme: ThemeJson, value: unknown, fallback: string, mode: "dark" | "light", chain: string[]): string {
  if (typeof value === "number") return ansiToHex(value);
  if (typeof value === "object" && value && "dark" in value && "light" in value) {
    return resolveValue(theme, (value as { dark: unknown; light: unknown })[mode], fallback, mode, chain);
  }
  if (typeof value !== "string") return fallback;
  if (value === "transparent" || value === "none") return fallback;
  if (value.startsWith("#")) return value;
  if (chain.includes(value)) return fallback;
  return resolveValue(theme, theme.defs?.[value] ?? theme.theme[value], fallback, mode, [...chain, value]);
}

export function setActiveThemeName(name: string): boolean {
  if (!allThemeJson()[name]) return false;
  setActiveThemeNameSignal(name);
  return true;
}

export function getActiveThemeName() {
  return activeThemeName();
}

function activeTheme() {
  return allThemeJson()[activeThemeName()] ?? DEFAULT_THEME_JSON.catppuccin;
}

export function themeColor(key: string, fallback: string): string {
  return resolveColor(activeTheme(), key, fallback);
}

export function themeColorForTheme(name: string, key: string, fallback: string): string {
  const theme = allThemeJson()[name];
  if (!theme) return fallback;
  return resolveColor(theme, key, fallback);
}
