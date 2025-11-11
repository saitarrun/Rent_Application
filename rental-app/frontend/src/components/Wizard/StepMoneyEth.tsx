import type { LeaseWizardData } from '../../lib/validate';

interface Props {
  data: Partial<LeaseWizardData>;
  onChange: (values: Partial<LeaseWizardData>) => void;
}

export default function StepMoneyEth({ data, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label className="text-sm font-medium text-slate-600">
        Monthly rent (ETH)
        <input
          type="number"
          step="0.01"
          className="mt-1 w-full border rounded px-3 py-2"
          value={data.monthlyRent || ''}
          onChange={(e) => onChange({ monthlyRent: e.target.value })}
        />
      </label>
      <label className="text-sm font-medium text-slate-600">
        Security deposit (ETH)
        <input
          type="number"
          step="0.01"
          className="mt-1 w-full border rounded px-3 py-2"
          value={data.deposit || ''}
          onChange={(e) => onChange({ deposit: e.target.value })}
        />
      </label>
    </div>
  );
}
