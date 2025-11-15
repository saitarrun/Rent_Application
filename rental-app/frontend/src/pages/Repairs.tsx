import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLease, fetchRepairs, createRepair } from '../lib/api';
import RepairsTable from '../components/RepairsTable';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';

export default function Repairs() {
  const { id } = useParams();
  const role = useAppStore((state) => state.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();
  const { data: lease } = useQuery({ queryKey: ['lease', id], queryFn: () => fetchLease(id as string), enabled: Boolean(id) });
  const { data: repairs = [], isLoading } = useQuery({
    queryKey: ['repairs', id],
    queryFn: () => fetchRepairs(id as string),
    enabled: Boolean(id)
  });

  const [form, setForm] = useState({ title: '', detail: '', costEth: '' });

  const createMutation = useMutation({
    mutationFn: () => createRepair(id!, { ...form, costEth: form.costEth ? Number(form.costEth) : undefined }),
    onSuccess: () => {
      pushNotice('success', 'Repair submitted');
      setForm({ title: '', detail: '', costEth: '' });
      queryClient.invalidateQueries({ queryKey: ['repairs', id] });
      queryClient.invalidateQueries({ queryKey: ['lease', id] });
    },
    onError: (err: any) => pushNotice('error', err.response?.data?.message || 'Unable to submit repair')
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Repairs" description={`Lease ${lease?.id || id}`} />
      {role === 'owner' && (
        <SectionCard>
          <p className="text-sm text-muted">
            Review tenant repair tickets below. Moving a request to <strong className="text-foreground">resolved</strong> or{' '}
            <strong className="text-foreground">closed</strong> with a cost will automatically deduct from the tenant deposit balance.
          </p>
        </SectionCard>
      )}
      {role === 'tenant' && (
        <SectionCard title="Submit a repair">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div>
              <label className="text-sm text-muted">Title</label>
              <input
                className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm text-muted">Detail</label>
              <textarea
                className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                value={form.detail}
                onChange={(e) => setForm((prev) => ({ ...prev, detail: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-muted">Estimated cost (ETH)</label>
              <input
                className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                type="number"
                step="0.01"
                value={form.costEth}
                onChange={(e) => setForm((prev) => ({ ...prev, costEth: e.target.value }))}
              />
            </div>
            <AnimatedButton type="submit" disabled={createMutation.isPending} className="w-full justify-center">
              {createMutation.isPending ? 'Submitting…' : 'Submit repair'}
            </AnimatedButton>
          </form>
        </SectionCard>
      )}
      <SectionCard title="History">
        {isLoading ? <p className="text-muted">Loading repairs…</p> : <RepairsTable leaseId={id as string} repairs={repairs} />}
      </SectionCard>
    </div>
  );
}
