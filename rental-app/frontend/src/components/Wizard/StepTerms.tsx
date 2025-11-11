import type { LeaseWizardData } from '../../lib/validate';

interface Props {
  data: Partial<LeaseWizardData>;
  onChange: (values: Partial<LeaseWizardData>) => void;
}

export default function StepTerms({ data, onChange }: Props) {
  return (
    <label className="text-sm font-medium text-slate-600 w-full">
    Special terms / notes
      <textarea
        className="mt-1 w-full border rounded px-3 py-2 min-h-[120px]"
        value={data.notes || ''}
        onChange={(e) => onChange({ notes: e.target.value })}
      />
    </label>
  );
}
