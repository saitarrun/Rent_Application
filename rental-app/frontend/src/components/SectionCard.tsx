import { ReactNode } from 'react';

type SectionCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  bleed?: boolean;
};

export default function SectionCard({ title, description, children, footer, bleed }: SectionCardProps) {
  return (
    <section className={`bg-surface-2 border border-outline rounded-2xl ${bleed ? '' : 'p-6'} shadow-soft`}>
      {title && (
        <header className={`flex flex-col gap-1 ${bleed ? 'p-6 pb-0' : ''}`}>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && <p className="text-xs text-muted">{description}</p>}
        </header>
      )}
      <div className={bleed ? 'p-6' : 'mt-4'}>{children}</div>
      {footer && <div className={`mt-4 border-t border-outline pt-3 text-sm text-muted ${bleed ? 'px-6 pb-6' : ''}`}>{footer}</div>}
    </section>
  );
}
