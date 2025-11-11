import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

export default function Settings() {
  const environment = useAppStore((state) => state.environment);
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const pushNotice = useAppStore((state) => state.pushNotice);

  const mutation = useMutation({
    mutationFn: () => updateProfile(form),
    onSuccess: () => pushNotice('success', 'Profile updated'),
    onError: (err: any) => pushNotice('error', err.message || 'Update failed')
  });

  if (!form) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-500">Profile, notifications, and network target.</p>
      </div>
      <div className="bg-white border rounded p-4 space-y-4">
        <label className="block text-sm text-slate-600">
          Portfolio name
          <input className="mt-1 w-full border rounded px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block text-sm text-slate-600">
          Contact
          <input className="mt-1 w-full border rounded px-3 py-2" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        </label>
        <div className="grid grid-cols-3 gap-4">
          <label className="text-sm text-slate-600">
            Grace days
            <input
              type="number"
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.graceDays}
              onChange={(e) => setForm({ ...form, graceDays: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm text-slate-600">
            Late fee type
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.lateFeeType}
              onChange={(e) => setForm({ ...form, lateFeeType: e.target.value })}
            >
              <option value="fixed">Fixed</option>
              <option value="percent">Percent</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Late fee value (ETH or %)
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.lateFeeValue}
              onChange={(e) => setForm({ ...form, lateFeeValue: e.target.value })}
            />
          </label>
        </div>
        <button onClick={() => mutation.mutate()} className="px-4 py-2 bg-slate-900 text-white rounded" disabled={mutation.isPending}>
          Save profile
        </button>
      </div>
      <div className="bg-white border rounded p-4">
        <p className="font-semibold">Environment</p>
        <p className="text-sm text-slate-500">Currently targeting {environment === 'local' ? 'Local (Ganache 1337)' : 'Sepolia (11155111)'}. Use the toggle in the navbar to switch and MetaMask will follow.</p>
      </div>
    </div>
  );
}
