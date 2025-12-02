import { useMemo, useState } from 'react';
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
import { AnimatedButton } from '../components/AnimatedButton';

export default function Applications() {
  const role = useAppStore((state) => state.role);
  const wallet = useAppStore((state) => state.wallet);
  const environment = useAppStore((state) => state.environment);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7' | '30' | '90'>('all');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

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
          onClick={() => navigate(`/next-steps/${lease.id}`)}
        >
          Next steps
        </button>
      </div>
    );
  };

  const title = role === 'owner' ? 'Lease applications' : 'My applications';

  const filteredApplications = useMemo(() => {
    const now = Date.now();
    const cutoffMap: Record<string, number> = { '7': 7, '30': 30, '90': 90 };
    return applications.filter((app: any) => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      if (cityFilter !== 'all' && app.listing?.city !== cityFilter) return false;
      if (dateFilter !== 'all') {
        const days = cutoffMap[dateFilter];
        if (days) {
          const created = new Date(app.createdAt).getTime();
          if (created < now - days * 24 * 60 * 60 * 1000) return false;
        }
      }
      return true;
    });
  }, [applications, statusFilter, cityFilter, dateFilter]);

  const cityOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    applications.forEach((app: any) => {
      const city = app.listing?.city;
      if (typeof city === 'string' && city.length > 0) {
        set.add(city);
      }
    });
    return Array.from(set);
  }, [applications]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);

  const bulkReject = () => {
    const ids = Object.entries(selectedIds)
      .filter(([, checked]) => checked)
      .map(([id]) => id);
    if (!ids.length) return;
    Promise.all(ids.map((id) => rejectMutation.mutateAsync(id))).finally(() => setSelectedIds({}));
  };

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
      {role === 'owner' && (
        <SectionCard>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="text-muted">
              Status
              <select
                className="ml-2 rounded-xl border border-outline px-3 py-1"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="text-muted">
              City
              <select
                className="ml-2 rounded-xl border border-outline px-3 py-1"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              >
                <option value="all">All</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted">
              Submitted
              <select
                className="ml-2 rounded-xl border border-outline px-3 py-1"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
              >
                <option value="all">Any time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </label>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-muted">{selectedCount} selected</span>
              <AnimatedButton onClick={bulkReject} disabled={!selectedCount || rejectMutation.isPending}>
                Bulk reject
              </AnimatedButton>
            </div>
          </div>
        </SectionCard>
      )}
      {isLoading ? (
        <p className="text-muted">Loading applications…</p>
      ) : (
        <SectionCard>
          <div className="hidden md:block">
            <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                {role === 'owner' && (
                  <th className="p-3">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={!!filteredApplications.length && filteredApplications.every((app: any) => selectedIds[app.id])}
                      onChange={(e) => {
                        const next: Record<string, boolean> = {};
                        filteredApplications.forEach((app: any) => {
                          next[app.id] = e.target.checked;
                        });
                        setSelectedIds(next);
                      }}
                    />
                  </th>
                )}
                <th className="p-3 font-semibold text-foreground/80">Property</th>
                <th className="p-3 font-semibold text-foreground/80">City</th>
                {role === 'owner' && <th className="p-3 font-semibold text-foreground/80">Applicant</th>}
                <th className="p-3 font-semibold text-foreground/80">Status</th>
                <th className="p-3 font-semibold text-foreground/80">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map((app: any) => {
                const lease = role === 'tenant' ? findLeaseForApplication(app) : undefined;
                return (
                  <tr key={app.id} className="border-t border-outline/40">
                    {role === 'owner' && (
                      <td className="p-3">
                        <input type="checkbox" checked={!!selectedIds[app.id]} onChange={() => toggleSelect(app.id)} />
                      </td>
                    )}
                    <td className="p-3 font-medium text-foreground">{app.listing?.title ?? '—'}</td>
                    <td className="p-3 text-muted">{app.listing?.city ?? '—'}</td>
                    {role === 'owner' && <td className="p-3 text-muted">{app.applicantEmail}</td>}
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-2 text-foreground">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                              app.status === 'approved'
                                ? 'bg-green-100 text-success'
                                : app.status === 'rejected'
                                ? 'bg-red-100 text-danger'
                                : 'bg-amber-50 text-warning'
                            }`}
                          >
                            {app.status}
                          </span>
                          <span className="text-xs text-muted">{new Date(app.createdAt).toLocaleDateString()}</span>
                        </span>
                        {lease?.status && (
                          <span className="text-xs text-muted">
                            Lease status: {lease.status}
                            {lease.signedAt ? ' (signed)' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-2">
                        {role === 'owner' && (
                          <button
                            type="button"
                            className="text-sm font-semibold text-brand disabled:text-muted"
                            disabled={!app.details}
                            onClick={() => {
                              if (app.details) {
                                setSelectedApplication(app);
                              }
                            }}
                          >
                            {app.details ? 'View details' : 'No details provided'}
                          </button>
                        )}
                        {role === 'owner' ? renderOwnerActions(app) : renderTenantActions(app)}
                        {role === 'owner' && app.leaseId && (
                          <button
                            type="button"
                            className="text-xs text-muted underline-offset-4 hover:underline"
                            onClick={() => navigate(`/agreements/${app.leaseId}`)}
                          >
                            View lease
                          </button>
                        )}
                        {role === 'owner' && app.status === 'approved' && !app.leaseId && (
                          <button
                            type="button"
                            className="text-xs text-muted underline-offset-4 hover:underline"
                            onClick={() => navigate('/agreements')}
                          >
                            Go to lease
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredApplications.length && (
                <tr>
                  <td className="p-4 text-center text-muted" colSpan={role === 'owner' ? 6 : 5}>
                    No applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <div className="space-y-3 md:hidden">
            {filteredApplications.length ? (
              filteredApplications.map((app: any) => {
                const lease = role === 'tenant' ? findLeaseForApplication(app) : undefined;
                return (
                  <div key={app.id} className="rounded-2xl border border-outline/60 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase text-muted">{app.listing?.city ?? '—'}</p>
                        <p className="text-lg font-semibold text-foreground">{app.listing?.title ?? '—'}</p>
                        {role === 'owner' && <p className="text-sm text-muted">{app.applicantEmail}</p>}
                      </div>
                      {role === 'owner' && (
                        <input type="checkbox" checked={!!selectedIds[app.id]} onChange={() => toggleSelect(app.id)} className="mt-1" />
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                          app.status === 'approved'
                            ? 'bg-green-100 text-success'
                            : app.status === 'rejected'
                            ? 'bg-red-100 text-danger'
                            : 'bg-amber-50 text-warning'
                        }`}
                      >
                        {app.status}
                      </span>
                      <span className="text-xs text-muted">{new Date(app.createdAt).toLocaleDateString()}</span>
                    </div>
                    {lease?.status && (
                      <p className="text-xs text-muted mt-1">Lease status: {lease.status}{lease.signedAt ? ' (signed)' : ''}</p>
                    )}
                    <div className="mt-3 flex flex-col gap-2 text-sm">
                      {role === 'owner' && (
                        <button
                          type="button"
                          className="text-brand font-semibold disabled:text-muted text-left"
                          disabled={!app.details}
                          onClick={() => app.details && setSelectedApplication(app)}
                        >
                          {app.details ? 'View details' : 'No details provided'}
                        </button>
                      )}
                      {role === 'owner' ? renderOwnerActions(app) : renderTenantActions(app)}
                      {role === 'owner' && app.leaseId && (
                        <button
                          type="button"
                          className="text-xs text-muted underline-offset-4 hover:underline text-left"
                          onClick={() => navigate(`/agreements/${app.leaseId}`)}
                        >
                          View lease
                        </button>
                      )}
                      {role === 'owner' && app.status === 'approved' && !app.leaseId && (
                        <button
                          type="button"
                          className="text-xs text-muted underline-offset-4 hover:underline text-left"
                          onClick={() => navigate('/agreements')}
                        >
                          Go to lease
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted">No applications yet.</p>
            )}
          </div>
        </SectionCard>
      )}
      {selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
        />
      )}
    </div>
  );
}

type ApplicationDetailsModalProps = {
  application: any;
  onClose: () => void;
};

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return '—';
  return `$${Number(value).toLocaleString()}`;
}

const formatWallet = (wallet?: string | null) => {
  if (!wallet) return '—';
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
};

function downloadDocument(doc: any) {
  if (!doc?.data) return;
  const link = document.createElement('a');
  link.href = `data:${doc.type || 'application/octet-stream'};base64,${doc.data}`;
  link.download = doc.name || 'document';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function ApplicationDetailsModal({ application, onClose }: ApplicationDetailsModalProps) {
  const details = application.details;
  const documents: any[] = Array.isArray(application.documents) ? application.documents : [];
  const copyWallet = () => {
    if (application.wallet && navigator?.clipboard) {
      navigator.clipboard.writeText(application.wallet).catch(() => {});
    }
  };

  const InfoPanel = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
    <div
      className={`h-full rounded-[20px] border border-outline/50 bg-white p-5 shadow-[0_16px_38px_rgba(12,42,89,0.08)] ${className ?? ''}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">{title}</p>
      <div className="mt-3 flex flex-col gap-2 text-sm text-foreground">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/50 bg-white shadow-[0_48px_180px_rgba(12,42,89,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-outline/40 px-8 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-muted">Application for</p>
            <h2 className="text-3xl font-semibold leading-tight text-foreground">
              {application.listing?.title ?? 'Listing'}
            </h2>
            <p className="text-sm text-muted">{`${application.listing?.city ?? '—'}, ${application.listing?.state ?? ''}`}</p>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-outline text-lg font-semibold text-muted transition hover:bg-surface-1"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {details ? (
          <div className="space-y-6 px-8 py-6 max-h-[80vh] overflow-y-auto">
            <div className="grid gap-6 md:grid-cols-2">
              <InfoPanel title="Applicant" className="h-full">
                <div className="space-y-2">
                  <p className="text-xl font-semibold leading-tight">{details.legalName || '—'}</p>
                  <p className="text-sm text-muted truncate">{details.email || application.applicantEmail}</p>
                  <p className="text-sm text-muted">{details.phone || '—'}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted">
                    {formatWallet(application.wallet)}
                    {application.wallet && (
                      <button
                        type="button"
                        onClick={copyWallet}
                        className="rounded-full border border-outline/60 px-3 py-1 text-[11px] font-semibold text-brand transition hover:bg-brand/5"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                  {details.preferredMoveIn && (
                    <p className="text-sm text-muted">Move-in: {details.preferredMoveIn}</p>
                  )}
                </div>
              </InfoPanel>
              <InfoPanel title="Income" className="h-full">
                <p className="text-sm">
                  <span className="font-semibold">Status:</span> {details.employmentStatus || '—'}
                </p>
                <p className="text-sm text-muted">Employer: {details.employerName || '—'}</p>
                <p className="text-sm text-muted">Annual: {formatCurrency(details.annualIncome)}</p>
                {details.monthlyIncome && (
                  <p className="text-sm text-muted">Monthly: {formatCurrency(details.monthlyIncome)}</p>
                )}
                {details.creditScore && <p className="text-sm text-muted">Credit score: {details.creditScore}</p>}
              </InfoPanel>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <InfoPanel title="Household" className="h-full">
                {details.occupants?.length ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {details.occupants.map((occupant: any, index: number) => (
                      <li key={`${occupant.name}-${index}`}>
                        {occupant.name} • {occupant.relationship || '—'}
                        {occupant.age ? ` (${occupant.age})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Only applicant listed.</p>
                )}
              </InfoPanel>
              <InfoPanel title="Notes" className="h-full">
                <p className="text-sm text-muted">{details.notes || 'No additional notes provided.'}</p>
              </InfoPanel>
            </div>
            <InfoPanel title="Documents" className="md:col-span-2">
              {documents.length ? (
                <ul className="mt-2 space-y-2 text-sm">
                  {documents.map((doc, index) => (
                    <li
                      key={`${doc.name}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-outline/70 bg-white px-3 py-2"
                    >
                      <span className="font-medium text-foreground">{doc.name}</span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand"
                        onClick={() => downloadDocument(doc)}
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No documents uploaded.</p>
              )}
            </InfoPanel>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">This application predates the new intake flow and has no extra details.</p>
        )}
      </div>
    </div>
  );
}
