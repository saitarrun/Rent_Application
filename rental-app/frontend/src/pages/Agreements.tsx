import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { closeLease, fetchLeases } from '../lib/api';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { useAppStore } from '../store/useAppStore';

export default function Agreements() {
  const { data: leases = [], isLoading } = useQuery({ queryKey: ['leases'], queryFn: fetchLeases });
  const role = useAppStore((state) => state.role ?? state.user?.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();

  const closeMutation = useMutation({
    mutationFn: (leaseId: string) => closeLease(leaseId),
    onSuccess: () => {
      pushNotice('success', 'Lease closed out and archived.');
      queryClient.invalidateQueries({ queryKey: ['leases'] });
    },
    onError: (err: any) => pushNotice('error', err?.response?.data?.message || 'Unable to close lease')
  });

  const closingId = closeMutation.variables;

  const statusBadge = (status?: string) => {
    const normalized = (status ?? 'pending').toLowerCase();
    if (normalized === 'closed') return { label: 'Closed', classes: 'bg-slate-100 text-muted' };
    if (normalized.includes('active'))
      return { label: 'Active', classes: 'bg-success/15 text-success' };
    if (normalized.includes('deposit'))
      return { label: 'Deposit paid', classes: 'bg-amber-50 text-warning' };
    if (normalized.includes('signed'))
      return { label: 'Signed', classes: 'bg-brand/10 text-brand' };
    return { label: normalized.replace(/_/g, ' '), classes: 'bg-surface-2 text-muted' };
  };

  const renderCloseButton = (lease: any) => {
    if (role !== 'owner' || lease.status === 'closed') return null;
    const pending = closeMutation.isPending && closingId === lease.id;
    return (
      <button
        type="button"
        onClick={() => closeMutation.mutate(lease.id)}
        disabled={pending}
        className="rounded-full border border-outline px-3 py-1 text-xs font-semibold text-muted transition hover:text-danger disabled:opacity-50"
      >
        {pending ? 'Closing…' : 'Close lease'}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Agreements" description="Every lease, its status, and quick links to payments and repairs." />
      {isLoading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <SectionCard>
          <div className="hidden md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="p-3 font-semibold text-foreground/80">Lease</th>
                  <th className="p-3 font-semibold text-foreground/80">Property</th>
                  <th className="p-3 font-semibold text-foreground/80">Tenant</th>
                  <th className="p-3 font-semibold text-foreground/80">Rent (ETH)</th>
                  <th className="p-3 font-semibold text-foreground/80">Start</th>
                  <th className="p-3 font-semibold text-foreground/80">End</th>
                  <th className="p-3 font-semibold text-foreground/80">Chain</th>
                  <th className="p-3 font-semibold text-foreground/80">Tx hash</th>
                  <th className="p-3 font-semibold text-foreground/80">Status</th>
                  <th className="p-3 text-right font-semibold text-foreground/80">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leases.map((lease: any) => {
                  const badge = statusBadge(lease.status);
                  return (
                    <tr key={lease.id} className="border-t border-outline/40">
                    <td className="p-3 font-semibold text-foreground">{lease.id.slice(0, 6)}</td>
                    <td className="p-3 text-foreground">{lease.listing?.title || 'Listing'}</td>
                    <td className="p-3 text-muted">{lease.tenant?.email || '—'}</td>
                    <td className="p-3 text-foreground">{Number(lease.annualRentEth || 0).toFixed(2)}</td>
                    <td className="p-3 text-muted">{lease.startISO ? lease.startISO.slice(0, 10) : '—'}</td>
                    <td className="p-3 text-muted">{lease.endISO ? lease.endISO.slice(0, 10) : '—'}</td>
                    <td className="p-3 text-muted">{lease.chainId || '—'}</td>
                    <td className="p-3 font-mono text-xs text-muted">{lease.txHash ? `${lease.txHash.slice(0, 10)}…` : '—'}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badge.classes}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
                        <Link to={`/agreements/${lease.id}`} className="text-brand font-semibold hover:text-brand-hover">
                          Details
                        </Link>
                        <Link to={`/repairs/${lease.id}`} className="text-muted underline-offset-4 hover:underline">
                          Repairs
                        </Link>
                        {renderCloseButton(lease)}
                      </div>
                    </td>
                    </tr>
                  );
                })}
                {!leases.length && (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-muted">
                      No leases yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {leases.length ? (
              leases.map((lease: any) => {
                const badge = statusBadge(lease.status);
                return (
                  <div key={lease.id} className="rounded-2xl border border-outline/60 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted">Lease #{lease.id.slice(0, 6)}</p>
                      <p className="text-lg font-semibold text-foreground">{lease.listing?.title || 'Listing'}</p>
                      <p className="text-sm text-muted">{lease.tenant?.email || '—'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badge.classes}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-muted">Rent</p>
                      <p className="text-foreground">{Number(lease.annualRentEth || 0).toFixed(2)} ETH</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted">Term</p>
                      <p className="text-foreground">
                        {lease.startISO ? lease.startISO.slice(0, 10) : '—'} → {lease.endISO ? lease.endISO.slice(0, 10) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <Link to={`/agreements/${lease.id}`} className="text-brand font-semibold">
                      View
                    </Link>
                    <Link to={`/repairs/${lease.id}`} className="text-muted underline-offset-4 hover:underline">
                      Repairs
                    </Link>
                    {renderCloseButton(lease)}
                  </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted">No leases yet.</p>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
