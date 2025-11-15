import Wizard from '../components/Wizard/Wizard';
import { createLease } from '../lib/api';
import { LeaseWizardData } from '../lib/validate';
import { useAppStore } from '../store/useAppStore';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';

export default function Create() {
  const role = useAppStore((state) => state.role ?? state.user?.role);
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
    return <p className="text-sm text-muted">Only owners can access the lease builder.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New lease" description="Seven-step wizard to capture parties, schedule, and ETH terms." />
      <Wizard onSubmit={handleSubmit} />
    </div>
  );
}
