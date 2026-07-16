/** @jsxImportSource @opentui/solid */
import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import { ListViewModal } from './ListViewModal';
import { GenericModal } from './GenericModal';
import { uiColors } from './colors';
import type { KeyEvent } from '@opentui/core';

export type NewWorkflowInput = { repo: string; ticket: string; change: string; task: string; mode: string; worker: string };
type Project = { name: string; path: string; openspec: boolean };
export function NewWorkflowModal(props: { projects: Project[]; models: string[]; onCancel: () => void; onComplete: (input: NewWorkflowInput) => void; onKeyReady: (handler: (key: KeyEvent) => boolean) => void }) {
  const labels = ['Repository', 'Ticket identifier (optional)', 'Change ID', 'Task', 'Checkout mode', 'Worker model'];
  const fields: (keyof NewWorkflowInput)[] = ['repo', 'ticket', 'change', 'task', 'mode', 'worker'];
  const [step, setStep] = createSignal(0);
  const [selected, setSelected] = createSignal(0);
  const [filter, setFilter] = createSignal('');
  const [filtering, setFiltering] = createSignal(false);
  const [values, setValues] = createSignal<NewWorkflowInput>({ repo: '', ticket: '', change: '', task: '', mode: '', worker: '' });
  const projects = () => props.projects.filter(project => project.name.toLowerCase().includes(filter().toLowerCase()));
  const choices = (): string[] => step() === 0 ? projects().map(project => `${project.openspec ? '●' : '○'} ${project.name}`) : step() === 4 ? ['worktree', 'checkout'].filter(item => item.includes(filter().toLowerCase())) : props.models.filter(item => item.toLowerCase().includes(filter().toLowerCase()));
  const listStep = () => [0, 4, 5].includes(step());
  const confirmStep = () => step() === fields.length;
  const totalSteps = fields.length + 1;
  const field = () => fields[step()]!;
  const summary = () => fields.map((key, index) => ({ label: labels[index]!, value: values()[key] || '—' }));
  const updateCurrent = (value: string) => { const key = field(); setValues(current => ({ ...current, [key]: value })); };
  const back = () => { if (step() === 0) props.onCancel(); else { setStep(index => index - 1); setSelected(0); setFilter(''); setFiltering(false); } };
  const next = (value: string) => { const key = field(); setValues(current => ({ ...current, [key]: value })); setStep(index => index + 1); setSelected(0); setFilter(''); setFiltering(false); };
  const handler = (key: KeyEvent) => {
    const name = key.name.toLowerCase();
    if (name === 'escape') { back(); return true; }
    if (confirmStep()) {
      if (name === 'return' || name === 'enter') props.onComplete(values());
      return true;
    }
    if (!listStep()) {
      const keyName = field();
      if (name === 'backspace') { setValues(current => ({ ...current, [keyName]: current[keyName].slice(0, -1) })); return true; }
      if (name === 'return' || name === 'enter') { next(values()[keyName]); return true; }
      if (key.sequence.length === 1 && key.sequence >= ' ') { updateCurrent(values()[keyName] + key.sequence); return true; }
      return true;
    }
    const items = choices();
    if (name === '/') { setFiltering(true); setFilter(''); setSelected(0); return true; }
    if (filtering()) {
      if (name === 'backspace') { setFilter(value => value.slice(0, -1)); setSelected(0); return true; }
      if (name === 'return' || name === 'enter') { setFiltering(false); return true; }
      if (key.sequence.length === 1 && key.sequence >= ' ') { setFilter(value => value + key.sequence); setSelected(0); return true; }
    }
    if (name === 'j' || name === 'down') { setSelected(index => Math.min(index + 1, items.length - 1)); return true; }
    if (name === 'k' || name === 'up') { setSelected(index => Math.max(index - 1, 0)); return true; }
    if (name === 'd') { setSelected(index => Math.min(index + 8, items.length - 1)); return true; }
    if (name === 'u') { setSelected(index => Math.max(index - 8, 0)); return true; }
    if (name === 'return' || name === 'enter') {
      const choice = items[selected()];
      if (choice) next(step() === 0 ? projects()[selected()]?.path ?? '' : choice);
      return true;
    }
    return true;
  };
  onMount(() => props.onKeyReady(handler));
  onCleanup(() => props.onKeyReady(() => true));
  return <Show when={confirmStep()} fallback={
    <Show when={listStep()} fallback={
      <GenericModal title="New workflow" fieldLabel={labels[step()]} summary={summary()} step={step()} total={totalSteps} help={[{ key: 'Enter', action: 'Next' }, { key: 'Esc', action: 'Back' }]}>
        <input focused value={values()[field()]} placeholder={step() === 1 ? 'optional' : ''} onInput={updateCurrent} onSubmit={() => next(values()[field()])} onKeyDown={(event: KeyEvent) => { if (event.name.toLowerCase() === 'escape') back(); }} focusedBackgroundColor={uiColors.bgBase} focusedTextColor={uiColors.textPrimary} />
      </GenericModal>
    }>
      <ListViewModal title="New workflow" fieldLabel={labels[step()]} summary={summary()} items={choices()} selectedIndex={selected()} step={step()} total={totalSteps} filterActive={filtering()} filterQuery={filter()} help={[{ key: 'j/k', action: 'Navigate' }, { key: '/', action: 'Filter' }, { key: 'Enter', action: 'Select' }, { key: 'Esc', action: 'Back' }]} renderItem={(item, active) => <text fg={active ? uiColors.primary : uiColors.textSecondary}>{item}</text>} />
    </Show>
  }>
    <GenericModal title="Confirm workflow" summary={summary()} summaryOnly step={step()} total={totalSteps} help={[{ key: 'Enter', action: 'Create workflow' }, { key: 'Esc', action: 'Back' }]}><box /></GenericModal>
  </Show>;
}
