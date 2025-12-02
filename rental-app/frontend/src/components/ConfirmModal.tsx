import React, { useEffect, useCallback } from 'react';
import { AnimatedButton } from './AnimatedButton';

type Props = {
  isOpen?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  isOpen = true,
  title = 'Are you sure?',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel
}: Props) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, handleKey]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // close when clicking backdrop
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-2 text-sm text-muted">{description}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-xl border border-outline px-4 py-2 text-sm text-muted">
            {cancelLabel}
          </button>
          <AnimatedButton
            onClick={onConfirm}
            className={`px-4 py-2 ${isDestructive ? 'bg-red-600 text-white hover:bg-red-700' : ''}`}
          >
            {confirmLabel}
          </AnimatedButton>
        </div>
      </div>
    </div>
  );
}
