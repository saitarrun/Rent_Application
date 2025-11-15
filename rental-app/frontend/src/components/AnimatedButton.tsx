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
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl border border-transparent bg-brand px-5 py-2.5',
        'font-medium text-brand-fg shadow-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/70',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'hover:bg-brand-hover transition-colors duration-200',
        className
      )}
    >
      {children}
    </motion.button>
  );
}
