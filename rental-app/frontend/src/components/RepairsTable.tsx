import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateRepair } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

const options = ['open', 'in_progress', 'resolved', 'closed'] as const;

export default function RepairsTable({ leaseId, repairs }: { leaseId: string; repairs: any[] }) {
  const role = useAppStore((state) => state.user?.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateRepair(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
      pushNotice('success', 'Repair updated');
    },
    onError: (err: any) => pushNotice('error', err.message || 'Update failed')
  });

  return (
    <div className="space-y-2">
      {repairs.map((repair) => (
        <div key={repair.id} className="border rounded p-3 bg-white flex justify-between items-center">
          <div>
            <p className="font-medium">{repair.title}</p>
            <p className="text-sm text-slate-500">{repair.detail}</p>
          </div>
          <div className="flex items-center gap-2">
            {role === 'owner' ? (
              <select
                className="border rounded px-2 py-1"
                value={repair.status}
                onChange={(e) => mutation.mutate({ id: repair.id, status: e.target.value })}
              >
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o.replace('_', ' ')}
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-2 py-1 rounded bg-slate-100 text-sm">{repair.status}</span>
            )}
          </div>
        </div>
      ))}
      {!repairs.length && <p className="text-sm text-slate-500">No repairs yet.</p>}
    </div>
  );
}
