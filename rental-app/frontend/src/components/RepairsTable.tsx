import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { updateRepair } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

const options = ['open', 'in_progress', 'resolved', 'closed'] as const;

export default function RepairsTable({ leaseId, repairs }: { leaseId: string; repairs: any[] }) {
  const role = useAppStore((state) => state.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();
  const [costDrafts, setCostDrafts] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: ({ id, status, costEth }: { id: string; status: string; costEth?: number }) =>
      updateRepair(id, costEth !== undefined ? { status, costEth } : { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs', leaseId] });
      queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
      pushNotice('success', 'Repair updated');
    },
    onError: (err: any) => pushNotice('error', err.message || 'Update failed')
  });

  const handleStatusChange = (repairId: string, status: string) => {
    const draft = costDrafts[repairId];
    const payload: { id: string; status: string; costEth?: number } = { id: repairId, status };
    if (draft && draft.length) {
      const numeric = Number(draft);
      if (!Number.isNaN(numeric)) {
        payload.costEth = numeric;
      }
    }
    mutation.mutate(payload);
  };

  return (
    <div className="space-y-3">
      {repairs.map((repair) => (
        <div key={repair.id} className="flex flex-col gap-3 rounded-2xl border border-outline bg-surface-1 p-4 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">{repair.title}</p>
              {repair.detail && <p className="text-sm text-muted">{repair.detail}</p>}
              {repair.costEth !== undefined && repair.costEth !== null && (
                <p className="text-xs text-muted">Cost est: {repair.costEth} ETH</p>
              )}
              {repair.deductedEth && (
                <p className="text-xs text-warning">
                  Deposit deduction: {repair.deductedEth} ETH {repair.deductedAt ? `on ${repair.deductedAt.slice(0, 10)}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {role === 'owner' ? (
                <>
                  <select
                    className="rounded-2xl border border-outline bg-surface-2 px-3 py-2 text-sm capitalize text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    value={repair.status}
                    onChange={(e) => handleStatusChange(repair.id, e.target.value)}
                  >
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    className="w-28 rounded-2xl border border-outline bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    placeholder="Cost"
                    value={costDrafts[repair.id] ?? ''}
                    onChange={(e) => setCostDrafts((prev) => ({ ...prev, [repair.id]: e.target.value }))}
                  />
                </>
              ) : (
                <span className="rounded-full bg-surface-3 px-3 py-1 text-sm capitalize text-foreground">{repair.status}</span>
              )}
            </div>
          </div>
        </div>
      ))}
      {!repairs.length && <p className="text-sm text-muted">No repairs yet.</p>}
    </div>
  );
}
