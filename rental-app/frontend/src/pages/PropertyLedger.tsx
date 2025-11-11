import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getLedger } from '../lib/api';

export default function PropertyLedger() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ['ledger', id], queryFn: () => getLedger(id as string), enabled: Boolean(id) });

  if (isLoading || !data) return <p>Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Ledger for {data.property.name}</h1>
        <p className="text-sm text-slate-500">Track dues and receipts per lease.</p>
      </div>
      <div className="overflow-x-auto bg-white border rounded">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-3">Lease</th>
              <th className="p-3">Tenant</th>
              <th className="p-3">Outstanding (ETH)</th>
              <th className="p-3">Collected (ETH)</th>
            </tr>
          </thead>
          <tbody>
            {data.ledger.map((entry: any) => (
              <tr key={entry.leaseId} className="border-t">
                <td className="p-3">{entry.leaseId.slice(0, 6)}</td>
                <td className="p-3">{entry.tenantId.slice(0, 6)}</td>
                <td className="p-3">{entry.outstandingEth}</td>
                <td className="p-3">{entry.collectedEth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
