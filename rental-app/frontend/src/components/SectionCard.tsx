import { ReactNode } from 'react';
import { motion } from 'framer-motion';

type SectionCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  bleed?: boolean;
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
};

export default function SectionCard({ title, description, children, footer, bleed }: SectionCardProps) {
  return (
    <motion.section
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className={`rounded-[28px] border border-outline/60 bg-white/90 text-foreground backdrop-blur ${
        bleed ? '' : 'p-8'
      } shadow-[0_30px_80px_rgba(12,42,89,0.12)]`}
    >
      {title && (
        <header className={`flex flex-col gap-1 ${bleed ? 'p-8 pb-0' : ''}`}>
          <p className="text-[13px] font-semibold uppercase tracking-[0.25em] text-muted">{title}</p>
          {description && <p className="text-sm text-muted">{description}</p>}
        </header>
      )}
      <div className={bleed ? 'p-8' : title ? 'mt-6' : ''}>{children}</div>
      {footer && (
        <div className={`mt-6 border-t border-outline/60 pt-4 text-sm text-muted ${bleed ? 'px-8 pb-8' : ''}`}>{footer}</div>
      )}
    </motion.section>
  );
}
