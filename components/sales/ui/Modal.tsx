'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import Button from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
}

/** Viewport-safe dialog: scrolls internally on short screens, closes on Esc / backdrop. */
export default function Modal({ open, title, onClose, children, closeLabel = 'OK' }: ModalProps) {
  const titleId = useId();
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    actionRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-2xl"
      >
        <h2 id={titleId} className="text-base font-bold text-foreground">
          {title}
        </h2>
        <div className="mt-2 whitespace-pre-line break-words text-sm text-muted-foreground">{children}</div>
        <div className="mt-4 flex justify-end">
          <Button ref={actionRef} onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
