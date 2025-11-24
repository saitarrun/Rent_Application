import { ReactNode } from 'react';
import { motion } from 'framer-motion';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

function DefaultIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
      <span className="text-lg" aria-hidden="true">
        ★
      </span>
    </div>
  );
}

export function EmptyState({ icon, title, description, actionLabel, onAction, compact }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl border border-white/70 bg-white/80 px-4 py-4 text-left shadow-[0_15px_35px_rgba(11,36,71,0.08)] ${
        compact ? 'sm:flex sm:items-center sm:justify-between' : 'space-y-2'
      }`}
    >
      <div className="flex items-start gap-3">
        {icon ?? <DefaultIcon />}
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex items-center text-sm font-semibold text-brand transition hover:text-brand-hover sm:mt-0"
        >
          {actionLabel}
          <span aria-hidden="true" className="ml-1">
            →
          </span>
        </button>
      )}
    </motion.div>
  );
}

export default EmptyState;
