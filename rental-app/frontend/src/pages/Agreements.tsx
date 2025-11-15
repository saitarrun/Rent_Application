import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchLeases } from '../lib/api';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';

export default function Agreements() {
  const { data: leases = [], isLoading } = useQuery({ queryKey: ['leases'], queryFn: fetchLeases });

  return (
    <div className="space-y-6">
      <PageHeader title="Agreements" description="Every lease, its status, and quick links to payments and repairs." />
      {isLoading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <SectionCard>
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
                <th className="p-3" colSpan={3}></th>
              </tr>
            </thead>
            <tbody>
              {leases.map((lease: any) => (
                <tr key={lease.id} className="border-t border-outline/40">
                  <td className="p-3 font-semibold text-foreground">{lease.id.slice(0, 6)}</td>
                  <td className="p-3 text-foreground">{lease.listing?.title || 'Listing'}</td>
                  <td className="p-3 text-muted">{lease.tenant?.email || '—'}</td>
                  <td className="p-3 text-foreground">{Number(lease.annualRentEth || 0).toFixed(2)}</td>
                  <td className="p-3 text-muted">{lease.startISO ? lease.startISO.slice(0, 10) : '—'}</td>
                  <td className="p-3 text-muted">{lease.endISO ? lease.endISO.slice(0, 10) : '—'}</td>
                  <td className="p-3 text-muted">{lease.chainId || '—'}</td>
                  <td className="p-3 font-mono text-xs text-muted">{lease.txHash ? `${lease.txHash.slice(0, 10)}…` : '—'}</td>
                  <td className="p-3 text-right">
                    <Link to={`/agreements/${lease.id}`} className="text-brand font-medium hover:text-brand-hover">
                      View
                    </Link>
                  </td>
                  <td className="p-3 text-right">
                    <Link to={`/payments/${lease.id}`} className="text-sm text-muted hover:text-foreground">
                      Payments
                    </Link>
                  </td>
                  <td className="p-3 text-right">
                    <Link to={`/repairs/${lease.id}`} className="text-sm text-muted hover:text-foreground">
                      Repairs
                    </Link>
                  </td>
                </tr>
              ))}
              {!leases.length && (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-muted">
                    No leases yet.
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
