import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApplications, updateApplicationStatus } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

const statuses = ['submitted', 'reviewing', 'approved', 'rejected'] as const;

export default function Applications() {
  const role = useAppStore((state) => state.user?.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();
  const { data: applications = [], isLoading } = useQuery({ queryKey: ['applications'], queryFn: fetchApplications });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateApplicationStatus(id, status),
    onSuccess: () => {
      pushNotice('success', 'Application updated');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
    },
    onError: (err: any) => pushNotice('error', err.response?.data?.message || 'Unable to update application')
  });

  const title = role === 'owner' ? 'Lease applications' : 'My applications';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-slate-500">
          {role === 'owner'
            ? 'Review tenant submissions and approve to convert them into leases.'
            : 'Track the status of every property you applied for.'}
        </p>
      </div>
      {isLoading ? (
        <p>Loading applications…</p>
      ) : (
        <div className="bg-white border rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-3">Property</th>
                <th className="p-3">City</th>
                <th className="p-3">Applicant</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {applications.map((app: any) => (
                <tr key={app.id} className="border-t">
                  <td className="p-3 font-medium">{app.listing?.title}</td>
                  <td className="p-3">{app.listing?.city}</td>
                  <td className="p-3">{app.applicant?.email || app.applicantEmail}</td>
                  <td className="p-3 capitalize">{app.status}</td>
                  <td className="p-3">
                    {role === 'owner' && (
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={app.status}
                        onChange={(e) => updateMutation.mutate({ id: app.id, status: e.target.value })}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {!applications.length && (
                <tr>
                  <td className="p-4 text-center text-slate-500" colSpan={5}>
                    No applications yet.
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
