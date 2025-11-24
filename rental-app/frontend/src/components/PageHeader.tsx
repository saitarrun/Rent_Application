import { ReactNode } from 'react';

type Breadcrumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
};

export default function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-gradient-to-br from-white via-surface-2 to-surface-3 p-8 shadow-[0_40px_120px_rgba(12,42,89,0.12)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-6 h-40 w-40 rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-brand/10 blur-[90px]" />
      </div>
      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-2 text-[10px] uppercase tracking-[0.4em] text-muted">
              <ol className="flex flex-wrap items-center gap-2">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                      {crumb.href && !isLast ? (
                        <a href={crumb.href} className="text-muted hover:text-foreground transition">
                          {crumb.label}
                        </a>
                      ) : (
                        <span className="text-foreground/70">{crumb.label}</span>
                      )}
                      {!isLast && <span className="text-muted">/</span>}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
          <p className="text-[11px] font-semibold uppercase tracking-[0.5em] text-brand">Rental Suite</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-base text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  );
}
