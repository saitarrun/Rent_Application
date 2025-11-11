import type { LeaseWizardData } from '../../lib/validate';

interface Props {
  data: Partial<LeaseWizardData>;
  onChange: (values: Partial<LeaseWizardData>) => void;
}

export default function StepReview({ data }: Props) {
  return (
    <div className="bg-slate-50 border rounded p-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-slate-500">Property</span>
        <span className="font-medium">{data.propertyName}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Tenant</span>
        <span className="font-medium">{data.tenantEmail}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Monthly rent (ETH)</span>
        <span className="font-medium">{data.monthlyRent}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Security deposit (ETH)</span>
        <span className="font-medium">{data.deposit}</span>
      </div>
    </div>
  );
}
