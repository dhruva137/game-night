import { h } from './dom';
import { icon } from './icons';

let open: { close: () => void } | null = null;

/**
 * Accessible modal dialog: Esc and backdrop close it, focus moves in and is restored after.
 * `onClose` lets the game resume when a help dialog was opened mid-shift.
 */
export function modal(title: string, body: HTMLElement, opts: { onClose?: () => void; wide?: boolean } = {}): { close: () => void } {
  open?.close();
  const prev = document.activeElement as HTMLElement | null;
  const closeBtn = h('button.modal-x', { 'aria-label': 'Close' }, icon('close', 16));
  const panel = h(
    `div.modal-panel${opts.wide ? '.wide' : ''}`,
    { role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' },
    h('div.modal-head', h('h2', title), closeBtn),
    h('div.modal-body', body),
  );
  const backdrop = h('div.modal-backdrop', panel);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      handle.close();
    }
  };
  const handle = {
    close: () => {
      if (!backdrop.isConnected) return;
      backdrop.classList.add('out');
      window.removeEventListener('keydown', onKey, true);
      window.setTimeout(() => backdrop.remove(), 180);
      if (open === handle) open = null;
      prev?.focus?.();
      opts.onClose?.();
    },
  };
  closeBtn.addEventListener('click', handle.close);
  backdrop.addEventListener('pointerdown', (e) => {
    if (e.target === backdrop) handle.close();
  });
  window.addEventListener('keydown', onKey, true);
  document.body.append(backdrop);
  panel.focus();
  open = handle;
  return handle;
}

export function isModalOpen(): boolean {
  return open !== null;
}
