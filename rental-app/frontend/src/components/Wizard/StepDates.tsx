import type { LeaseWizardData } from '../../lib/validate';

interface Props {
  data: Partial<LeaseWizardData>;
  onChange: (values: Partial<LeaseWizardData>) => void;
}

export default function StepDates({ data, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label className="text-sm font-medium text-slate-600">
        Start date
        <input
          type="date"
          className="mt-1 w-full border rounded px-3 py-2"
          value={data.startISO?.slice(0, 10) || ''}
          onChange={(e) => {
            if (!e.target.value) return;
            onChange({ startISO: new Date(e.target.value).toISOString() });
          }}
        />
      </label>
      <label className="text-sm font-medium text-slate-600">
        End date
        <input
          type="date"
          className="mt-1 w-full border rounded px-3 py-2"
          value={data.endISO?.slice(0, 10) || ''}
          onChange={(e) => {
            if (!e.target.value) return;
            onChange({ endISO: new Date(e.target.value).toISOString() });
          }}
        />
      </label>
      <label className="text-sm font-medium text-slate-600">
        Due day of month
        <input
          type="number"
          min={1}
          max={31}
          className="mt-1 w-full border rounded px-3 py-2"
          value={data.dueDay || 1}
          onChange={(e) => onChange({ dueDay: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}
