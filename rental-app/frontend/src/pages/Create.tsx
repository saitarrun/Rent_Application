import Wizard from '../components/Wizard/Wizard';
import { createLease } from '../lib/api';
import { LeaseWizardData } from '../lib/validate';
import { useAppStore } from '../store/useAppStore';
import { useQueryClient } from '@tanstack/react-query';

export default function Create() {
  const role = useAppStore((state) => state.user?.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();

  const handleSubmit = async (data: Partial<LeaseWizardData>) => {
    if (role !== 'owner') {
      pushNotice('error', 'Only owners can create leases');
      return;
    }
    await createLease({
      property: {
        name: data.propertyName,
        address: data.propertyAddress
      },
      tenantEmail: data.tenantEmail,
      tenantEth: data.tenantEth,
      startISO: data.startISO,
      endISO: data.endISO,
      dueDay: data.dueDay,
      monthlyRentEth: data.monthlyRent,
      securityDepositEth: data.deposit,
      notes: data.notes
    });
    pushNotice('success', 'Lease created and first invoice generated');
    queryClient.invalidateQueries({ queryKey: ['leases'] });
  };

  if (role !== 'owner') {
    return <p className="text-sm text-slate-500">Only owners can access the lease builder.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">New lease</h1>
        <p className="text-sm text-slate-500">Seven-step wizard to capture parties, schedule, and ETH terms.</p>
      </div>
      <Wizard onSubmit={handleSubmit} />
    </div>
  );
}
