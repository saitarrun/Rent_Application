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

  const handleStatusChange = (repair: any, status: string) => {
    const draft = costDrafts[repair.id];
    const payload: { id: string; status: string; costEth?: number } = { id: repair.id, status };
    const hasExistingCost = repair.costEth !== undefined && repair.costEth !== null;
    if (draft && draft.length) {
      const numeric = Number(draft);
      if (!Number.isNaN(numeric)) {
        payload.costEth = numeric;
      }
    } else if (hasExistingCost) {
      payload.costEth = Number(repair.costEth);
    }

    if ((status === 'resolved' || status === 'closed') && payload.costEth === undefined) {
      pushNotice('error', 'Enter a cost before marking this repair as resolved or closed.');
      return;
    }

    mutation.mutate(payload);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue/10 text-blue border-blue/20';
      case 'in_progress':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'resolved':
        return 'bg-success/10 text-success border-success/20';
      case 'closed':
        return 'bg-foreground/10 text-foreground border-foreground/20';
      default:
        return 'bg-surface-2 text-muted';
    }
  };

  return (
    <div className="space-y-3" role="region" aria-label="Repairs list">
      {repairs.map((repair) => (
        <article
          key={repair.id}
          className="flex flex-col gap-3 rounded-2xl border border-outline bg-surface-1 p-4 shadow-soft"
          aria-label={`Repair: ${repair.title}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <h3 className="text-base font-semibold text-foreground">{repair.title}</h3>
              {repair.detail && (
                <p className="text-sm text-muted">{repair.detail}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs">
                {repair.costEth !== undefined && repair.costEth !== null ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-muted">Owner cost:</span>
                    <span className="font-mono text-foreground">{repair.costEth} ETH</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted">
                    <span>Awaiting owner cost</span>
                  </span>
                )}
                {repair.deductedEth && (
                  <span className="inline-flex items-center gap-1 text-warning font-medium">
                    <span>💰 Deducted:</span>
                    <span className="font-mono">{repair.deductedEth} ETH</span>
                    {repair.deductedAt && <span>{repair.deductedAt.slice(0, 10)}</span>}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {role === 'owner' ? (
                <fieldset className="flex items-center gap-2 border-0 p-0">
                  <legend className="sr-only">Update repair {repair.title}</legend>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`status-${repair.id}`} className="sr-only">
                      Status
                    </label>
                    <select
                      id={`status-${repair.id}`}
                      className={`rounded-2xl border px-3 py-2 text-sm capitalize text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${getStatusColor(repair.status)}`}
                      value={repair.status}
                      onChange={(e) => handleStatusChange(repair, e.target.value)}
                      aria-label={`Status: ${repair.status.replace('_', ' ')}`}
                    >
                      {options.map((o) => (
                        <option key={o} value={o}>
                          {o.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor={`cost-${repair.id}`} className="sr-only">
                      Cost for deduction
                    </label>
                    <input
                      id={`cost-${repair.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-28 rounded-2xl border border-outline bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                      placeholder="Cost"
                      value={costDrafts[repair.id] ?? ''}
                      onChange={(e) => setCostDrafts((prev) => ({ ...prev, [repair.id]: e.target.value }))}
                      aria-label="Cost to deduct from deposit (ETH)"
                      aria-describedby={`cost-help-${repair.id}`}
                    />
                    <p id={`cost-help-${repair.id}`} className="text-xs text-muted sr-only">
                      Enter amount to deduct when marking as resolved or closed
                    </p>
                  </div>
                </fieldset>
              ) : (
                <div
                  className={`rounded-full border px-3 py-1 text-sm capitalize font-medium ${getStatusColor(repair.status)}`}
                  role="status"
                  aria-label={`Repair status: ${repair.status.replace('_', ' ')}`}
                >
                  {repair.status.replace('_', ' ')}
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
      {!repairs.length && (
        <div className="rounded-2xl border border-outline bg-surface-1 p-6 text-center">
          <p className="text-sm text-muted" role="status">
            {role === 'owner' ? 'No repair requests yet.' : 'No repairs submitted yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
