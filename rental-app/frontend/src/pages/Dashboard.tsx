import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { fetchLeases, fetchApplications } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';
import EmptyState from '../components/EmptyState';
import { ChainStatusCard } from '../components/ChainStatusCard';

export default function Dashboard() {
  const role = useAppStore((state) => state.role ?? state.user?.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const navigate = useNavigate();
  const [onboardingToastShown, setOnboardingToastShown] = useState(false);
  const { data: leases = [] } = useQuery({ queryKey: ['leases'], queryFn: fetchLeases });
  const { data: applications = [] } = useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
    enabled: role === 'owner'
  });

  const ownerView = role === 'owner';
  const upcomingInvoices = leases
    .flatMap((lease: any) => lease.invoices || [])
    .filter((invoice: any) => invoice.status !== 'paid')
    .sort((a: any, b: any) => (a.dueISO > b.dueISO ? 1 : -1))
    .slice(0, ownerView ? 5 : 3);

  const myRepairs = leases
    .flatMap((lease: any) => lease.repairs || [])
    .sort((a: any, b: any) => (a.updatedAt > b.updatedAt ? -1 : 1))
    .slice(0, 5);

  const collected = ownerView
    ? leases
        .flatMap((lease: any) => lease.receipts || [])
        .reduce((sum: number, receipt: any) => sum + Number(receipt.paidEth || 0), 0)
    : 0;

  const recentPayments = ownerView
    ? leases
        .flatMap((lease: any) =>
          (lease.receipts || []).map((receipt: any) => ({
            id: receipt.id,
            leaseId: lease.id,
            tenant: lease.tenant?.email || lease.tenantId,
            paidEth: receipt.paidEth,
            paidAtISO: receipt.paidAtISO
          }))
        )
        .sort((a: any, b: any) => (a.paidAtISO > b.paidAtISO ? -1 : 1))
        .slice(0, 5)
    : [];

  const nextDue = !ownerView ? upcomingInvoices[0] : null;
  const pendingApplications = ownerView ? applications.filter((app: any) => app.status === 'submitted' || app.status === 'reviewing').length : 0;

  const metrics = ownerView
    ? [
        { label: 'Active leases', value: leases.length },
        { label: 'Outstanding invoices', value: upcomingInvoices.length },
        { label: 'Collected (ETH)', value: collected.toFixed(2) },
        { label: 'Open applications', value: pendingApplications }
      ]
    : [
        { label: 'Active leases', value: leases.length },
        { label: 'Outstanding invoices', value: upcomingInvoices.length },
        {
          label: 'Next due date',
          value: nextDue ? dayjs(nextDue.dueISO).format('MMM D') : 'Paid up'
        }
      ];

  const heroBullets = ownerView
    ? ['Approve leases faster with a synced pipeline.', 'Keep tabs on deposits, invoices, and payments.']
    : ['Finish onboarding to unlock repairs & perks.', 'Stay notified about invoices and receipts.'];

  const metricAccents = [
    'from-[#eff5ff] via-[#fdfdff] to-[#e3ecff]',
    'from-[#fff5f0] via-[#fffaf6] to-[#ffe6da]',
    'from-[#effcfe] via-[#fefeff] to-[#dff4ff]',
    'from-[#f6f0ff] via-[#fbf8ff] to-[#efe4ff]'
  ];

  const pipelineEmptyConfig: Record<
    'applications' | 'signatures' | 'deposits' | 'active' | 'ending',
    { title: string; description: string; actionLabel: string; action: () => void }
  > = {
    applications: {
      title: 'No applications in review',
      description: 'Share your listing link to invite tenants to apply.',
      actionLabel: 'View applications',
      action: () => navigate('/applications')
    },
    signatures: {
      title: 'All signatures collected',
      description: 'Every pending lease has been signed for now.',
      actionLabel: 'Open agreements',
      action: () => navigate('/agreements')
    },
    deposits: {
      title: 'No deposits outstanding',
      description: 'Tenants are current on their security deposits.',
      actionLabel: 'Review payments',
      action: () => navigate('/payments')
    },
    active: {
      title: 'No active leases yet',
      description: 'Once you approve a lease it will appear here.',
      actionLabel: 'Manage listings',
      action: () => navigate('/explore?view=portfolio')
    },
    ending: {
      title: 'Nothing ending soon',
      description: 'We will flag leases that are within 60 days of ending.',
      actionLabel: 'View agreements',
      action: () => navigate('/agreements')
    }
  };

  const [pipelineFilter, setPipelineFilter] = useState<'applications' | 'signatures' | 'deposits' | 'active' | 'ending'>('applications');

  const pipelineData = useMemo<
    Record<'applications' | 'signatures' | 'deposits' | 'active' | 'ending', any[]>
  >(() => {
    const now = dayjs();
    const submittedApps = applications.filter((app: any) => app.status === 'submitted');
    const pendingSignatures = leases.filter(
      (lease: any) => lease.status === 'pending' || !lease.tenantSignedAt || !lease.ownerSignedAt
    );
    const depositOutstanding = leases.filter((lease: any) => {
      const deposit = Number(lease.securityDepositEth ?? 0);
      const balance = Number(lease.depositBalanceEth ?? 0);
      return deposit > 0 && balance < deposit;
    });
    const activeLeases = leases.filter((lease: any) => lease.status === 'active');
    const endingSoon = leases.filter((lease: any) => dayjs(lease.endISO).diff(now, 'day') <= 60);
    return {
      applications: submittedApps,
      signatures: pendingSignatures,
      deposits: depositOutstanding,
      active: activeLeases,
      ending: endingSoon
    };
  }, [applications, leases]);

  const outstandingLease = useMemo(() => {
    if (ownerView) return null;
    return leases.find((lease: any) => {
      const depositAmount = Number(lease.securityDepositEth ?? 0);
      const depositPaid = depositAmount === 0 || Number(lease.depositBalanceEth ?? 0) >= depositAmount;
      const annualAmount = Number(lease.annualRentEth ?? 0);
      const annualPaid =
        annualAmount === 0 || lease.receipts?.some((receipt: any) => Number(receipt.paidEth ?? 0) >= annualAmount);
      return (lease.status === 'pending' || lease.status === 'active') && (!depositPaid || !annualPaid);
    });
  }, [ownerView, leases]);

  useEffect(() => {
    if (!ownerView && outstandingLease && !onboardingToastShown) {
      pushNotice('info', 'Finish onboarding to unlock repairs and tenant tools.');
      setOnboardingToastShown(true);
    }
  }, [ownerView, outstandingLease, onboardingToastShown, pushNotice]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={ownerView ? 'At-a-glance look at collections, repairs, and open work.' : 'Track the leases and payments tied to your wallet.'}
      />
      <ChainStatusCard />
      {!ownerView && outstandingLease && (
        <SectionCard
          title="Complete onboarding"
          description="Pay the deposit and annual rent to activate your lease."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">
                {outstandingLease.listing?.title ?? outstandingLease.property?.name ?? 'Lease'} #{outstandingLease.id.slice(0, 6)}
              </p>
            </div>
            <AnimatedButton onClick={() => navigate(`/next-steps/${outstandingLease.id}`)}>
              View next steps
            </AnimatedButton>
          </div>
        </SectionCard>
      )}
      <section className="relative overflow-hidden rounded-[44px] border border-white/70 bg-gradient-to-br from-[#f7fbff] via-[#eef4ff] to-[#dfe9ff] p-8 shadow-[0_45px_120px_rgba(9,40,88,0.15)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-6 top-8 h-48 w-48 rounded-full bg-brand/10 blur-[130px]" />
          <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-[#7cd1ff]/20 blur-[140px]" />
        </div>
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-6 text-[#112649] lg:max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-brand">Weekly pulse</p>
            <h2 className="text-3xl font-semibold text-[#0a2249]">
              {ownerView ? 'Stay ahead of every lease lifecycle.' : 'Manage your rental journey with clarity.'}
            </h2>
            <p className="text-base text-[#233a63] leading-relaxed">
              {ownerView
                ? 'Monitor applications, deposits, and rent receipts in one elevated workspace.'
                : 'Know exactly what is due, what is paid, and when repairs unlock.'}
            </p>
            <ul className="grid gap-3 text-sm text-[#1d2f4f] sm:grid-cols-2">
              {heroBullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm shadow-[0_15px_30px_rgba(15,35,72,0.12)]">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-brand text-xs">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full lg:max-w-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              {metrics.map((metric, index) => (
                <div
                  key={metric.label}
                  className={`relative overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-br ${
                    metricAccents[index % metricAccents.length]
                  } p-5 text-[#102548] shadow-[0_25px_70px_rgba(12,42,89,0.15)]`}
                >
                  <div className="pointer-events-none absolute -right-6 top-4 h-16 w-16 rounded-full bg-white/40 blur-2xl" />
                  <p className="text-[11px] uppercase tracking-[0.35em] text-[#5f6b82]">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {ownerView && (
        <SectionCard title="Leases pipeline" description="Monitor progress from application to activation.">
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              { key: 'applications', label: 'Applications', count: pipelineData.applications.length },
              { key: 'signatures', label: 'Pending signatures', count: pipelineData.signatures.length },
              { key: 'deposits', label: 'Deposits due', count: pipelineData.deposits.length },
              { key: 'active', label: 'Active', count: pipelineData.active.length },
              { key: 'ending', label: 'Ending soon', count: pipelineData.ending.length }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPipelineFilter(item.key as typeof pipelineFilter)}
                className={`rounded-full border px-4 py-1.5 font-semibold transition ${
                  pipelineFilter === item.key
                    ? 'border-transparent bg-brand text-white shadow-[0_12px_25px_rgba(24,115,240,0.35)]'
                    : 'border-outline/70 text-muted hover:border-brand/40 hover:text-brand'
                }`}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {(pipelineData[pipelineFilter] as any[]).slice(0, 4).map((leaseOrApp: any) => {
              if (pipelineFilter === 'applications') {
                return (
                  <li
                    key={leaseOrApp.id}
                    className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_12px_30px_rgba(12,42,89,0.08)]"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{leaseOrApp.listing?.title ?? 'Listing'}</p>
                      <p className="text-xs text-muted">{leaseOrApp.applicantEmail}</p>
                    </div>
                    <span className="text-xs text-muted">{dayjs(leaseOrApp.createdAt).format('MMM D')}</span>
                  </li>
                );
              }
              return (
                <li
                  key={leaseOrApp.id}
                  className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_12px_30px_rgba(12,42,89,0.08)]"
                >
                  <div>
                    <p className="font-semibold text-foreground">{leaseOrApp.listing?.title ?? leaseOrApp.property?.name ?? 'Lease'}</p>
                    <p className="text-xs text-muted">
                      {leaseOrApp.tenant?.email ?? leaseOrApp.tenantId} • {leaseOrApp.status}
                    </p>
                  </div>
                  <span className="text-xs text-muted">
                    {pipelineFilter === 'ending'
                      ? `Ends ${dayjs(leaseOrApp.endISO).format('MMM D')}`
                      : dayjs(leaseOrApp.createdAt).format('MMM D')}
                  </span>
                </li>
              );
            })}
            {!(pipelineData[pipelineFilter] as any[]).length && (
              <li>
                <EmptyState
                  compact
                  title={pipelineEmptyConfig[pipelineFilter].title}
                  description={pipelineEmptyConfig[pipelineFilter].description}
                  actionLabel={pipelineEmptyConfig[pipelineFilter].actionLabel}
                  onAction={pipelineEmptyConfig[pipelineFilter].action}
                />
              </li>
            )}
          </ul>
        </SectionCard>
      )}
      <div className={`grid gap-4 ${ownerView ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <SectionCard
          title={ownerView ? 'Outstanding invoices' : 'My invoices'}
          description={ownerView ? 'Top invoices that still need payment.' : 'Invoices assigned to you.'}
        >
          <ul className="space-y-3 text-sm text-foreground">
            {upcomingInvoices.map((invoice: any) => (
              <li
                key={invoice.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[22px] border border-white/80 bg-white/95 px-5 py-4 shadow-[0_18px_40px_rgba(12,42,89,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(12,42,89,0.16)]"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-base font-semibold text-[#0f2343]">{invoice.amountEth} ETH</p>
                  <p className="text-sm text-muted">Due {dayjs(invoice.dueISO).format('MMM D')}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.14em] text-muted">{invoice.status}</span>
              </li>
            ))}
            {!upcomingInvoices.length && (
              <li className="rounded-[22px] border border-dashed border-outline/60 bg-white/80 px-5 py-4">
                <EmptyState
                  title={ownerView ? 'No invoices due' : 'You are paid up'}
                  description={
                    ownerView
                      ? 'Every outstanding invoice has been collected. We will alert you when new invoices appear.'
                      : 'There are no payments pending for your leases.'
                  }
                  actionLabel="Review payments"
                  onAction={() => navigate('/payments')}
                  compact
                />
              </li>
            )}
          </ul>
        </SectionCard>
        <SectionCard
          title={ownerView ? 'Repair queue' : 'My repairs'}
          description={ownerView ? 'Recent repairs requiring attention.' : 'Requests you have submitted.'}
        >
          <ul className="space-y-3 text-sm text-foreground">
            {myRepairs.map((repair: any) => (
              <li
                key={repair.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[22px] border border-white/80 bg-white/95 px-5 py-4 shadow-[0_18px_40px_rgba(12,42,89,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(12,42,89,0.16)]"
              >
                <span className="text-base font-semibold text-[#0f2343]">{repair.title}</span>
                <span className="text-xs uppercase tracking-[0.14em] text-muted">{repair.status}</span>
              </li>
            ))}
            {!myRepairs.length && (
              <li className="rounded-[22px] border border-dashed border-outline/60 bg-white/80 px-5 py-4">
                <EmptyState
                  title={ownerView ? 'No open repairs' : 'No repair requests yet'}
                  description={
                    ownerView
                      ? 'We will surface requests here as soon as tenants submit them.'
                      : 'You can submit a repair ticket once your lease is active.'
                  }
                  actionLabel={ownerView ? 'Go to repairs' : undefined}
                  onAction={ownerView ? () => navigate('/repairs') : undefined}
                  compact
                />
              </li>
            )}
          </ul>
        </SectionCard>
        {ownerView && (
          <SectionCard title="Recent payments" description="Latest rent receipts across your portfolio.">
            <ul className="space-y-3 text-sm text-foreground">
              {recentPayments.map((payment: any) => {
                const date = dayjs(payment.paidAtISO);
                return (
                  <li
                    key={payment.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[22px] border border-white/80 bg-white/95 px-5 py-4 shadow-[0_18px_40px_rgba(12,42,89,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(12,42,89,0.16)]"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-base font-semibold text-[#0f2343]">{payment.paidEth} ETH</p>
                      <p className="truncate text-sm text-muted">{payment.tenant}</p>
                    </div>
                    <div className="text-right text-xs uppercase tracking-[0.18em] text-muted">
                      <div className="text-[13px] font-semibold text-[#0f2343] leading-tight">{date.format('MMM')}</div>
                      <div className="text-sm text-[#55627d] leading-tight">{date.format('D')}</div>
                    </div>
                  </li>
                );
              })}
              {!recentPayments.length && (
                <li
                  className="rounded-[22px] border border-dashed border-outline/60 bg-white/80 px-5 py-4"
                >
                  <EmptyState
                    title="No payments yet"
                    description="As soon as tenants submit rent, it will appear here with receipt details."
                    actionLabel="Open payments"
                    onAction={() => navigate('/payments')}
                    compact
                  />
                </li>
              )}
            </ul>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
