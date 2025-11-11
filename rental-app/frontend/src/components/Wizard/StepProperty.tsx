import type { LeaseWizardData } from '../../lib/validate';

interface Props {
  data: Partial<LeaseWizardData>;
  onChange: (values: Partial<LeaseWizardData>) => void;
}

export default function StepProperty({ data, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <label className="text-sm font-medium text-slate-600">
        Property name
        <input
          className="mt-1 w-full border rounded px-3 py-2"
          value={data.propertyName || ''}
          onChange={(e) => onChange({ propertyName: e.target.value })}
        />
      </label>
      <label className="text-sm font-medium text-slate-600">
        Address
        <textarea
          className="mt-1 w-full border rounded px-3 py-2"
          value={data.propertyAddress || ''}
          onChange={(e) => onChange({ propertyAddress: e.target.value })}
        />
      </label>
    </div>
  );
}
