import type { KeyEvent } from '@opentui/core';

export type KeyHandler = (event: KeyEvent) => void | Promise<void>;
let activeHandler: KeyHandler | undefined;

export function setActiveKeyHandler(handler: KeyHandler) {
  activeHandler = handler;
  return () => {
    if (activeHandler === handler) activeHandler = undefined;
  };
}

export function dispatchKey(event: KeyEvent) {
  void activeHandler?.(event);
}
