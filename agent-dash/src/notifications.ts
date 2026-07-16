import { createSignal } from 'solid-js';
export type Notification = { message: string; type: 'info' | 'success' | 'warning' | 'error' };
const [notification, setNotification] = createSignal<Notification>();
let timer: ReturnType<typeof setTimeout> | undefined;
export const activeNotification = notification;
export function notify(message: string, type: Notification['type'] = 'info') { setNotification({ message, type }); clearTimeout(timer); timer = setTimeout(() => setNotification(undefined), 2200); }
