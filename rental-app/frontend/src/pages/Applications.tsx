import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  approveApplication,
  fetchApplications,
  fetchLeases,
  rejectApplication,
  signLease
} from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { ensureNetwork } from '../lib/eth';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';

export default function Applications() {
  const role = useAppStore((state) => state.role);
  const wallet = useAppStore((state) => state.wallet);
  const environment = useAppStore((state) => state.environment);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications
  });

  const { data: tenantLeases = [] } = useQuery({
    queryKey: ['leases'],
    queryFn: fetchLeases,
    enabled: role === 'tenant'
  });

  const findLeaseForApplication = (app: any) => {
    if (role !== 'tenant' || !app.listing?.id) return undefined;
    return tenantLeases.find(
      (lease: any) =>
        lease.listingId === app.listing.id ||
        lease.listing?.id === app.listing.id ||
        String(lease.chainLeaseId) === String(app.leaseId)
    );
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveApplication(id),
    onSuccess: () => {
      pushNotice('success', 'Application approved');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
    },
    onError: (err: any) => pushNotice('error', err.response?.data?.message || 'Unable to approve application')
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectApplication(id),
    onSuccess: () => {
      pushNotice('success', 'Application rejected');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err: any) => pushNotice('error', err.response?.data?.message || 'Unable to reject application')
  });

  const signMutation = useMutation({
    mutationFn: async (leaseId: string) => {
      if (!wallet) throw new Error('Wallet not connected');
      await ensureNetwork(environment);
      const provider = (window as any).ethereum;
      const message = `RentalApp Lease ${leaseId}`;
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, wallet]
      });
      await signLease(leaseId, signature);
    },
    onSuccess: () => {
      pushNotice('success', 'Lease signed');
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err: any) => pushNotice('error', err.response?.data?.message || err.message || 'Unable to sign lease')
  });

  const renderOwnerActions = (app: any) => {
    if (app.status !== 'submitted') {
      return <span className="text-xs text-muted">Processed</span>;
    }
    return (
      <div className="flex gap-2">
        <button
          className="rounded-xl border border-outline px-3 py-1.5 text-sm text-success hover:bg-success/10"
          onClick={() => approveMutation.mutate(app.id)}
          disabled={approveMutation.isPending}
        >
          {approveMutation.isPending ? 'Approving…' : 'Approve'}
        </button>
        <button
          className="rounded-xl border border-outline px-3 py-1.5 text-sm text-danger hover:bg-danger/10"
          onClick={() => rejectMutation.mutate(app.id)}
          disabled={rejectMutation.isPending}
        >
          {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    );
  };

  const renderTenantActions = (app: any) => {
    if (app.status === 'rejected') {
      return <span className="text-xs text-red-500">Rejected</span>;
    }
    if (app.status !== 'approved') {
      return <span className="text-xs text-muted">Waiting on owner</span>;
    }
    const lease = findLeaseForApplication(app);
    if (!lease) {
      return <span className="text-xs text-muted">Provisioning lease…</span>;
    }
    return (
      <div className="flex flex-wrap items-center gap-3">
        {!lease.signedAt && (
          <button
            className="text-sm font-medium text-brand hover:text-brand-hover"
            onClick={() => signMutation.mutate(lease.id)}
            disabled={signMutation.isPending}
          >
            {signMutation.isPending ? 'Signing…' : 'Sign lease'}
          </button>
        )}
        <button
          className="text-sm text-muted underline-offset-4 hover:underline"
          type="button"
          onClick={() => navigate(`/payments/${lease.id}`)}
        >
          Payments
        </button>
      </div>
    );
  };

  const title = role === 'owner' ? 'Lease applications' : 'My applications';

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={
          role === 'owner'
            ? 'Review rental interest and convert approved applicants into on-chain leases.'
            : 'Track each application, sign leases, and jump into payments when approved.'
        }
      />
      {isLoading ? (
        <p className="text-muted">Loading applications…</p>
      ) : (
        <SectionCard>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="p-3 font-semibold text-foreground/80">Property</th>
                <th className="p-3 font-semibold text-foreground/80">City</th>
                {role === 'owner' && <th className="p-3 font-semibold text-foreground/80">Applicant</th>}
                <th className="p-3 font-semibold text-foreground/80">Status</th>
                <th className="p-3 font-semibold text-foreground/80">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app: any) => {
                const lease = role === 'tenant' ? findLeaseForApplication(app) : undefined;
                return (
                  <tr key={app.id} className="border-t border-outline/40">
                    <td className="p-3 font-medium text-foreground">{app.listing?.title ?? '—'}</td>
                    <td className="p-3 text-muted">{app.listing?.city ?? '—'}</td>
                    {role === 'owner' && <td className="p-3 text-muted">{app.applicantEmail}</td>}
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className="capitalize text-foreground">{app.status}</span>
                        {lease?.status && (
                          <span className="text-xs text-muted">
                            Lease status: {lease.status}
                            {lease.signedAt ? ' (signed)' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {role === 'owner' ? renderOwnerActions(app) : renderTenantActions(app)}
                    </td>
                  </tr>
                );
              })}
              {!applications.length && (
                <tr>
                  <td className="p-4 text-center text-muted" colSpan={role === 'owner' ? 5 : 4}>
                    No applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionCard>
      )}
    </div>
  );
}
