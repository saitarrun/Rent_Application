import { Tooltip } from './Tooltip';

interface HelpTextProps {
  label: string;
  help: string;
  children?: React.ReactNode;
}

export function HelpText({ label, help, children }: HelpTextProps) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted">{label}</label>
        <Tooltip content={help} side="right">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-xs text-brand cursor-help">
            ?
          </span>
        </Tooltip>
      </div>
      {children}
    </div>
  );
}

export function InfoBox({ title, description }: { title: string; description: string | React.ReactNode }) {
  return (
    <div className="rounded-lg border border-brand/20 bg-brand/5 p-4">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

export function RequirementsList({ items }: { items: { label: string; met: boolean }[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className={`h-4 w-4 rounded border ${item.met ? 'bg-success border-success' : 'border-outline'}`}>
            {item.met && <div className="flex h-full w-full items-center justify-center text-white text-xs">✓</div>}
          </div>
          <span className={item.met ? 'text-foreground' : 'text-muted line-through'}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
