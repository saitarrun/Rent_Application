import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { fetchLease, createRepair, signLease, toggleAutopay } from '../lib/api';
import PaymentsTable from '../components/PaymentsTable';
import RepairsTable from '../components/RepairsTable';
import { useAppStore } from '../store/useAppStore';
import { downloadLeasePdf } from '../lib/pdf';

export default function AgreementDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const role = useAppStore((state) => state.user?.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const [tab, setTab] = useState<'payments' | 'repairs'>('payments');
  const [form, setForm] = useState({ title: '', detail: '', priority: 'normal', category: 'general', preferredWindow: '' });

  const { data: lease, isLoading } = useQuery({
    queryKey: ['lease', id],
    queryFn: () => fetchLease(id as string),
    enabled: Boolean(id)
  });

  const repairMutation = useMutation({
    mutationFn: () => createRepair(id!, form),
    onSuccess: () => {
      pushNotice('success', 'Repair submitted');
      setForm({ title: '', detail: '', priority: 'normal', category: 'general', preferredWindow: '' });
      queryClient.invalidateQueries({ queryKey: ['lease', id] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
    },
    onError: (err: any) => pushNotice('error', err.message || 'Unable to submit repair')
  });

  const autopayMutation = useMutation({
    mutationFn: (autopay: boolean) => toggleAutopay(id!, autopay),
    onSuccess: () => {
      pushNotice('success', 'Autopay preference saved');
      queryClient.invalidateQueries({ queryKey: ['lease', id] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
    },
    onError: (err: any) => pushNotice('error', err.response?.data?.message || 'Unable to update autopay')
  });

  const signMutation = useMutation({
    mutationFn: () => signLease(id!),
    onSuccess: () => {
      pushNotice('success', 'Lease signed');
      queryClient.invalidateQueries({ queryKey: ['lease', id] });
    },
    onError: (err: any) => pushNotice('error', err.message || 'Unable to sign lease')
  });

  if (isLoading || !lease) return <p>Loading…</p>;

  const canTenantSign = role === 'tenant' && !lease.tenantSignedAt;
  const canOwnerSign = role === 'owner' && !lease.ownerSignedAt;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lease {lease.id.slice(0, 6)}</h1>
          <p className="text-slate-500 text-sm">{lease.property?.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadLeasePdf(lease)} className="px-3 py-2 rounded border bg-white">
            Download PDF
          </button>
          {(canTenantSign || canOwnerSign) && (
            <button
              onClick={() => signMutation.mutate()}
              className="px-3 py-2 rounded bg-slate-900 text-white"
              disabled={signMutation.isPending}
            >
              {signMutation.isPending ? 'Signing…' : 'Sign lease'}
            </button>
          )}
        </div>
      </div>
      <div className="bg-white border rounded p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500">Monthly rent (ETH)</p>
          <p className="text-lg font-semibold">{lease.monthlyRentEth}</p>
        </div>
        <div>
          <p className="text-slate-500">Security deposit (ETH)</p>
          <p className="text-lg font-semibold">{lease.securityDepositEth}</p>
        </div>
        <div>
          <p className="text-slate-500">Start / End</p>
          <p className="font-medium">
            {lease.startISO.slice(0, 10)} → {lease.endISO.slice(0, 10)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Tenant wallet</p>
          <p className="font-mono text-xs">{lease.tenantEth}</p>
        </div>
        <div>
          <p className="text-slate-500">Status</p>
          <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium capitalize">
            {lease.status}
          </span>
        </div>
        <div>
          <p className="text-slate-500">Tenant signature</p>
          <p className="font-medium">{lease.tenantSignedAt ? lease.tenantSignedAt.slice(0, 10) : 'Pending'}</p>
        </div>
        <div>
          <p className="text-slate-500">Owner signature</p>
          <p className="font-medium">{lease.ownerSignedAt ? lease.ownerSignedAt.slice(0, 10) : 'Pending'}</p>
        </div>
        {role === 'tenant' && (
          <div className="col-span-2 flex items-center justify-between border-t pt-3">
            <div>
              <p className="text-slate-500 text-sm">Autopay</p>
              <p className="text-xs text-slate-500">Enable reminders and one-click payments each cycle.</p>
            </div>
            <button
              className={`px-4 py-2 rounded ${lease.autopayEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}
              onClick={() => autopayMutation.mutate(!lease.autopayEnabled)}
              disabled={autopayMutation.isPending}
            >
              {lease.autopayEnabled ? 'On' : 'Off'}
            </button>
          </div>
        )}
      </div>
      <div>
        <div className="flex gap-2 border-b">
          {['payments', 'repairs'].map((key) => (
            <button
              key={key}
              className={`px-4 py-2 text-sm font-medium ${tab === key ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500'}`}
              onClick={() => setTab(key as 'payments' | 'repairs')}
            >
              {key === 'payments' ? 'Payments' : 'Repairs'}
            </button>
          ))}
        </div>
        <div className="bg-white border rounded-b p-4">
          {tab === 'payments' ? (
            <PaymentsTable leaseId={lease.id} invoices={lease.invoices || []} />
          ) : (
            <div className="space-y-4">
              {role === 'tenant' && (
                <form
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    repairMutation.mutate();
                  }}
                >
                  <input
                    className="border rounded px-3 py-2"
                    placeholder="Title"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                  <input
                    className="border rounded px-3 py-2 md:col-span-2"
                    placeholder="Detail"
                    value={form.detail}
                    onChange={(e) => setForm((prev) => ({ ...prev, detail: e.target.value }))}
                    required
                  />
                  <select
                    className="border rounded px-3 py-2"
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="general">General</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="appliance">Appliance</option>
                  </select>
                  <select
                    className="border rounded px-3 py-2"
                    value={form.priority}
                    onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                  <input
                    className="border rounded px-3 py-2"
                    placeholder="Preferred window (optional)"
                    value={form.preferredWindow}
                    onChange={(e) => setForm((prev) => ({ ...prev, preferredWindow: e.target.value }))}
                  />
                  <button type="submit" className="bg-slate-900 text-white rounded px-4 py-2" disabled={repairMutation.isPending}>
                    Open request
                  </button>
                </form>
              )}
              <RepairsTable leaseId={lease.id} repairs={lease.repairs || []} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
