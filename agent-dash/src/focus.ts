export function focusSoon(target: { focus?: () => void } | undefined) {
  if (target?.focus) setTimeout(() => target.focus?.(), 0);
}
