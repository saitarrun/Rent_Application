import type { LeaseWizardData } from '../../lib/validate';

interface Props {
  data: Partial<LeaseWizardData>;
  onChange: (values: Partial<LeaseWizardData>) => void;
}

export default function StepRole({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-slate-600">Confirm who is filling out this lease.</p>
      <div className="flex gap-4">
        {['owner', 'tenant'].map((role) => (
          <label key={role} className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
            <input
              type="radio"
              checked={data.role === role}
              onChange={() => onChange({ role: role as LeaseWizardData['role'] })}
            />
            <span className="capitalize">{role}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
