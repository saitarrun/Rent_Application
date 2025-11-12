import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateRepair } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

const options = ['open', 'in_progress', 'resolved', 'closed'] as const;

export default function RepairsTable({ leaseId, repairs }: { leaseId: string; repairs: any[] }) {
  const role = useAppStore((state) => state.user?.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateRepair(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
      pushNotice('success', 'Repair updated');
    },
    onError: (err: any) => pushNotice('error', err.message || 'Update failed')
  });

  const handleSchedule = (repair: any) => {
    const scheduledAt = window.prompt('Schedule visit (e.g., 2024-07-01 10:00)');
    if (scheduledAt) {
      mutation.mutate({ id: repair.id, data: { scheduledAt } });
    }
  };

  return (
    <div className="space-y-2">
      {repairs.map((repair) => (
        <div key={repair.id} className="border rounded p-3 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{repair.title}</p>
              <p className="text-sm text-slate-500">{repair.detail}</p>
              <p className="text-xs text-slate-400">Category: {repair.category}</p>
              {repair.preferredWindow && <p className="text-xs text-slate-400">Preferred: {repair.preferredWindow}</p>}
              {repair.scheduledAt && <p className="text-xs text-emerald-600">Scheduled: {repair.scheduledAt}</p>}
            </div>
            <div className="flex items-center gap-2">
              {role === 'owner' ? (
                <>
                  <select
                    className="border rounded px-2 py-1"
                    value={repair.status}
                    onChange={(e) => mutation.mutate({ id: repair.id, data: { status: e.target.value } })}
                  >
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <button className="text-sm text-slate-900" onClick={() => handleSchedule(repair)}>
                    Schedule
                  </button>
                </>
              ) : (
                <span className="px-2 py-1 rounded bg-slate-100 text-sm">{repair.status}</span>
              )}
            </div>
          </div>
        </div>
      ))}
      {!repairs.length && <p className="text-sm text-slate-500">No repairs yet.</p>}
    </div>
  );
}
