import { ReactNode } from 'react';
import { cn } from '../lib/cn';

type PageProps = {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  toolbar?: ReactNode;
};

export function Page({ title, actions, children, toolbar }: PageProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-outline sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-brand/20" />
            <p className="font-display text-lg tracking-tight">Rental Suite</p>
          </div>
          <div className="flex items-center gap-3">{actions}</div>
        </div>
      </header>
      <main className="container py-10 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="font-display text-3xl tracking-tight">{title}</h1>
          {toolbar && <div className="flex gap-3">{toolbar}</div>}
        </div>
        <div className={cn('grid gap-6', 'animate-slideUp')}>{children}</div>
      </main>
    </div>
  );
}
