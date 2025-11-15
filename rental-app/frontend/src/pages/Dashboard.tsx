import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchLeases, fetchApplications } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';

export default function Dashboard() {
  const role = useAppStore((state) => state.role ?? state.user?.role);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={ownerView ? 'At-a-glance look at collections, repairs, and open work.' : 'Track the leases and payments tied to your wallet.'}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <SectionCard key={metric.label}>
            <p className="text-xs uppercase tracking-wide text-muted">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{metric.value}</p>
          </SectionCard>
        ))}
      </div>
      <div className={`grid gap-4 ${ownerView ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <SectionCard
          title={ownerView ? 'Outstanding invoices' : 'My invoices'}
          description={ownerView ? 'Top invoices that still need payment.' : 'Invoices assigned to you.'}
        >
          <ul className="space-y-2 text-sm text-foreground">
            {upcomingInvoices.map((invoice: any) => (
              <li key={invoice.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{invoice.amountEth} ETH</p>
                  <p className="text-xs text-muted">Due {dayjs(invoice.dueISO).format('MMM D')}</p>
                </div>
                <span className="text-xs uppercase text-muted">{invoice.status}</span>
              </li>
            ))}
            {!upcomingInvoices.length && <li className="text-sm text-muted">No invoices due.</li>}
          </ul>
        </SectionCard>
        <SectionCard
          title={ownerView ? 'Repair queue' : 'My repairs'}
          description={ownerView ? 'Recent repairs requiring attention.' : 'Requests you have submitted.'}
        >
          <ul className="space-y-2 text-sm text-foreground">
            {myRepairs.map((repair: any) => (
              <li key={repair.id} className="flex items-center justify-between">
                <span>{repair.title}</span>
                <span className="text-xs uppercase text-muted">{repair.status}</span>
              </li>
            ))}
            {!myRepairs.length && <li className="text-sm text-muted">No open repairs.</li>}
          </ul>
        </SectionCard>
        {ownerView && (
          <SectionCard title="Recent payments" description="Latest rent receipts across your portfolio.">
            <ul className="space-y-2 text-sm text-foreground">
              {recentPayments.map((payment: any) => (
                <li key={payment.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{payment.paidEth} ETH</p>
                    <p className="text-xs text-muted">{payment.tenant}</p>
                  </div>
                  <span className="text-xs text-muted">{dayjs(payment.paidAtISO).format('MMM D')}</span>
                </li>
              ))}
              {!recentPayments.length && <li className="text-sm text-muted">No payments yet.</li>}
            </ul>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
