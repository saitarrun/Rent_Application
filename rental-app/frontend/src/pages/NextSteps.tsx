import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { fetchLease } from '../lib/api';
import { AnimatedButton } from '../components/AnimatedButton';
import { useAppStore } from '../store/useAppStore';

export default function NextSteps() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = useAppStore((state) => state.role ?? state.user?.role);
  const isTenant = role === 'tenant';
  const { data: lease, isLoading } = useQuery({
    queryKey: ['lease', id],
    queryFn: () => fetchLease(id as string),
    enabled: Boolean(id)
  });

  if (isLoading || !lease) {
    return <p className="text-muted">Loading lease…</p>;
  }

  const depositAmount = Number(lease.securityDepositEth ?? 0);
  const annualAmount = Number(lease.annualRentEth ?? 0);
  const depositPaid = Number(lease.depositBalanceEth ?? 0) >= depositAmount && depositAmount > 0;
  const annualPaid = lease.receipts?.some((receipt: any) => Number(receipt.paidEth ?? 0) >= annualAmount);
  const outstandingTotal =
    (depositPaid ? 0 : depositAmount > 0 ? depositAmount : 0) +
    (annualPaid ? 0 : annualAmount > 0 ? annualAmount : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your next steps"
        description="Complete these items to activate your lease and unlock repairs."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Next steps' }
        ]}
      />
      <SectionCard>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-muted">Property</p>
            <p className="text-lg font-semibold text-foreground">{lease.listing?.title ?? lease.property?.name ?? 'Lease'}</p>
            <p className="text-sm text-muted">
              {lease.listing?.address1 ?? lease.property?.address ?? ''}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted">Lease term</p>
            <p className="text-sm text-foreground">
              {lease.startISO?.slice(0, 10)} → {lease.endISO?.slice(0, 10)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted">Status</p>
            <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-warning capitalize">
              {lease.status}
            </span>
          </div>
        </div>
      </SectionCard>
      <SectionCard
        title="Payments"
        description="One-time payments go directly to the owner. Complete both to unlock repairs."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-outline/60 p-4">
            <p className="text-sm text-muted">Security deposit</p>
            <p className="text-2xl font-semibold text-foreground">{depositAmount || '—'} ETH</p>
            <p className={`text-sm font-semibold ${depositPaid ? 'text-success' : 'text-warning'}`}>
              {depositPaid ? 'Paid' : 'Outstanding'}
            </p>
            {isTenant ? (
              <AnimatedButton
                className="mt-3 w-full justify-center"
                disabled={depositPaid}
                onClick={() => navigate(`/payments/${lease.id}`)}
              >
                {depositPaid ? 'Paid to owner' : 'Pay deposit'}
              </AnimatedButton>
            ) : (
              <p className="mt-3 text-sm text-muted">Owner will see status updates here.</p>
            )}
          </div>
          <div className="rounded-2xl border border-outline/60 p-4">
            <p className="text-sm text-muted">Annual rent</p>
            <p className="text-2xl font-semibold text-foreground">{annualAmount || '—'} ETH</p>
            <p className={`text-sm font-semibold ${annualPaid ? 'text-success' : 'text-warning'}`}>
              {annualPaid ? 'Paid' : 'Outstanding'}
            </p>
            {isTenant ? (
              <AnimatedButton
                className="mt-3 w-full justify-center"
                disabled={annualPaid}
                onClick={() => navigate(`/payments/${lease.id}`)}
              >
                {annualPaid ? 'Paid to owner' : 'Pay annual rent'}
              </AnimatedButton>
            ) : (
              <p className="mt-3 text-sm text-muted">Owner will see status updates here.</p>
            )}
          </div>
        </div>
        {isTenant && outstandingTotal > 0 && (
          <div className="mt-4 rounded-2xl border border-brand/20 bg-brand/5 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Pay outstanding to owner</p>
              <p className="text-xs text-muted">Complete remaining payments in one place.</p>
            </div>
            <AnimatedButton onClick={() => navigate(`/payments/${lease.id}`)} className="justify-center px-6">
              Go to payment ({outstandingTotal} ETH)
            </AnimatedButton>
          </div>
        )}
      </SectionCard>
      <SectionCard
        title="After payment"
        description="Once both payments are complete, repairs and other tenant tools will unlock automatically."
      >
        <div className="flex flex-wrap gap-3">
          <AnimatedButton onClick={() => navigate(`/payments/${lease.id}`)}>Go to payments</AnimatedButton>
          <button
            type="button"
            className="rounded-2xl border border-outline px-4 py-2 text-sm font-semibold text-muted"
            onClick={() => navigate(`/repairs/${lease.id}`)}
            disabled={!depositPaid || !annualPaid}
          >
            Open repairs
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
