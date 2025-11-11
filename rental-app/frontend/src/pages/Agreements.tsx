import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchLeases } from '../lib/api';

export default function Agreements() {
  const { data: leases = [], isLoading } = useQuery({ queryKey: ['leases'], queryFn: fetchLeases });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agreements</h1>
          <p className="text-sm text-slate-500">Track lease status, invoices, and e-signatures.</p>
        </div>
      </div>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-x-auto bg-white border rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-3">Lease</th>
                <th className="p-3">Property</th>
                <th className="p-3">Tenant</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {leases.map((lease: any) => (
                <tr key={lease.id} className="border-t">
                  <td className="p-3">{lease.id.slice(0, 6)}</td>
                  <td className="p-3">{lease.property?.name}</td>
                  <td className="p-3">{lease.tenant?.email}</td>
                  <td className="p-3">{lease.status}</td>
                  <td className="p-3 text-right">
                    <Link to={`/agreements/${lease.id}`} className="text-slate-900 font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!leases.length && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    No leases yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
