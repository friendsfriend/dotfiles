export type SelectionMouseUpHandler = () => void | Promise<void>;
let handler: SelectionMouseUpHandler | undefined;
export function setGlobalSelectionMouseUpHandler(next: SelectionMouseUpHandler | undefined) { handler = next; return () => { if (handler === next) handler = undefined; }; }
export function invokeGlobalSelectionMouseUpHandler() { void handler?.(); }
