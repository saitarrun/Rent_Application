import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '../lib/cn';

type AnimatedButtonProps = {
  children: ReactNode;
  onClick?: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
};

export function AnimatedButton({ children, onClick, className, disabled, type = 'button' }: AnimatedButtonProps) {
  return (
    <motion.button
      type={type}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl border border-transparent bg-gradient-to-r from-brand to-brand-hover px-6 py-3',
        'font-semibold text-sm tracking-wide text-brand-fg shadow-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'hover:shadow-[0_10px_35px_rgba(24,115,240,0.35)] transition-all duration-200',
        className
      )}
    >
      {children}
    </motion.button>
  );
}
