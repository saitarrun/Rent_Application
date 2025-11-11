import type { LeaseWizardData } from '../../lib/validate';

interface Props {
  data: Partial<LeaseWizardData>;
  onChange: (values: Partial<LeaseWizardData>) => void;
}

export default function StepParties({ data, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <label className="text-sm font-medium text-slate-600">
        Tenant email
        <input
          type="email"
          className="mt-1 w-full border rounded px-3 py-2"
          value={data.tenantEmail || ''}
          onChange={(e) => onChange({ tenantEmail: e.target.value })}
        />
      </label>
      <label className="text-sm font-medium text-slate-600">
        Tenant wallet (ETH)
        <input
          className="mt-1 w-full border rounded px-3 py-2"
          value={data.tenantEth || ''}
          onChange={(e) => onChange({ tenantEth: e.target.value })}
          placeholder="0x…"
        />
      </label>
    </div>
  );
}
