import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchLeases, fetchApplications } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

export default function Dashboard() {
  const role = useAppStore((state) => state.user?.role);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-slate-500 text-sm">{role === 'owner' ? 'Track dues, payments, and repairs' : 'See your upcoming rent and requests'}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded p-4">
          <p className="text-sm text-slate-500">Active leases</p>
          <p className="text-2xl font-semibold">{leases.length}</p>
        </div>
        <div className="bg-white border rounded p-4">
          <p className="text-sm text-slate-500">Outstanding invoices</p>
          <p className="text-2xl font-semibold">{upcomingInvoices.length}</p>
        </div>
        {ownerView ? (
          <>
            <div className="bg-white border rounded p-4">
              <p className="text-sm text-slate-500">Collected (ETH)</p>
              <p className="text-2xl font-semibold">{collected.toFixed(2)}</p>
            </div>
            <div className="bg-white border rounded p-4">
              <p className="text-sm text-slate-500">Open applications</p>
              <p className="text-2xl font-semibold">{pendingApplications}</p>
            </div>
          </>
        ) : (
          <div className="bg-white border rounded p-4">
            <p className="text-sm text-slate-500">Next due date</p>
            <p className="text-2xl font-semibold">
              {nextDue ? dayjs(nextDue.dueISO).format('MMM D') : 'Paid up'}
            </p>
          </div>
        )}
      </div>
      <div className={`grid grid-cols-1 ${ownerView ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        <div className="bg-white border rounded p-4">
          <p className="font-semibold mb-2">{ownerView ? 'Outstanding invoices' : 'My invoices'}</p>
          <ul className="space-y-2 text-sm">
            {upcomingInvoices.map((invoice: any) => (
              <li key={invoice.id} className="flex justify-between">
                <span>
                  {invoice.amountEth} ETH due {dayjs(invoice.dueISO).format('MMM D')}
                </span>
                <span className="text-slate-500">{invoice.status}</span>
              </li>
            ))}
            {!upcomingInvoices.length && <li className="text-slate-500">No invoices due.</li>}
          </ul>
        </div>
        <div className="bg-white border rounded p-4">
          <p className="font-semibold mb-2">{ownerView ? 'Repair queue' : 'My repairs'}</p>
          <ul className="space-y-2 text-sm">
            {myRepairs.map((repair: any) => (
              <li key={repair.id} className="flex justify-between">
                <span>{repair.title}</span>
                <span className="text-slate-500">{repair.status}</span>
              </li>
            ))}
            {!myRepairs.length && <li className="text-slate-500">No open repairs.</li>}
          </ul>
        </div>
        {ownerView && (
          <div className="bg-white border rounded p-4">
            <p className="font-semibold mb-2">Recent payments</p>
            <ul className="space-y-2 text-sm">
              {recentPayments.map((payment: any) => (
                <li key={payment.id} className="flex justify-between">
                  <span>
                    {payment.paidEth} ETH from {payment.tenant}
                  </span>
                  <span className="text-slate-500">{dayjs(payment.paidAtISO).format('MMM D')}</span>
                </li>
              ))}
              {!recentPayments.length && <li className="text-slate-500">No payments yet.</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
