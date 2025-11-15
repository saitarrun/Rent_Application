import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getLedger } from '../lib/api';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';

export default function PropertyLedger() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ['ledger', id], queryFn: () => getLedger(id as string), enabled: Boolean(id) });

  if (isLoading || !data) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <PageHeader title={`Ledger for ${data.property.name}`} description="Track dues and receipts per lease." />
      <SectionCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="p-3 font-semibold text-foreground/80">Lease</th>
                <th className="p-3 font-semibold text-foreground/80">Tenant</th>
                <th className="p-3 font-semibold text-foreground/80">Outstanding (ETH)</th>
                <th className="p-3 font-semibold text-foreground/80">Collected (ETH)</th>
              </tr>
            </thead>
            <tbody>
              {data.ledger.map((entry: any) => (
                <tr key={entry.leaseId} className="border-t border-outline/40">
                  <td className="p-3 font-semibold text-foreground">{entry.leaseId.slice(0, 6)}</td>
                  <td className="p-3 text-muted">{entry.tenantId.slice(0, 6)}</td>
                  <td className="p-3 text-foreground">{entry.outstandingEth}</td>
                  <td className="p-3 text-foreground">{entry.collectedEth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
