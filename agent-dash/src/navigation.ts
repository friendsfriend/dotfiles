import { createSignal } from 'solid-js';

export type View = 'home' | 'detail';
export type Modal = 'new-workflow' | 'approval';

export function createNavigation() {
  const [views, setViews] = createSignal<View[]>(['home']);
  const [modals, setModals] = createSignal<Modal[]>([]);
  return {
    views, modals,
    currentView: () => views().at(-1) ?? 'home',
    activeModal: () => modals().at(-1),
    pushView(view: View) { setViews(stack => stack.at(-1) === view ? stack : [...stack, view]); },
    popView() { setViews(stack => stack.length > 1 ? stack.slice(0, -1) : stack); },
    pushModal(modal: Modal) { setModals(stack => stack.at(-1) === modal ? stack : [...stack.filter(item => item !== modal), modal]); },
    popModal() { setModals(stack => stack.slice(0, -1)); },
    popEsc() { if (modals().length) { setModals(stack => stack.slice(0, -1)); return true; } if (views().length > 1) { setViews(stack => stack.slice(0, -1)); return true; } return false; },
  };
}
