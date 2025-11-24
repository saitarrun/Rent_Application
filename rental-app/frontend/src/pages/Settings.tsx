import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';

export default function Settings() {
  const environment = useAppStore((state) => state.environment);
  const role = useAppStore((state) => state.role);
  const user = useAppStore((state) => state.user);
  const wallet = useAppStore((state) => state.wallet);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const isOwner = role === 'owner';

  const {
    data: profile,
    error: profileError,
    isLoading: profileLoading
  } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: isOwner
  });
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (isOwner && profile) {
      setForm(profile);
    }
    if (!isOwner) {
      setForm(null);
    }
  }, [isOwner, profile]);

  const mutation = useMutation({
    mutationFn: () => updateProfile(form),
    onSuccess: () => pushNotice('success', 'Profile updated'),
    onError: (err: any) => pushNotice('error', err.message || 'Update failed')
  });

  const renderOwnerProfile = () => {
    if (!form) {
      return (
        <SectionCard title="Portfolio profile">
          {profileError ? (
            <p className="text-sm text-danger">{(profileError as Error).message || 'Failed to load profile'}</p>
          ) : (
            <p className="text-sm text-muted">{profileLoading ? 'Loading profile…' : 'No profile data available'}</p>
          )}
        </SectionCard>
      );
    }

    return (
      <SectionCard title="Portfolio profile">
        <label className="block text-sm text-muted">
          Portfolio name
          <input
            className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block text-sm text-muted">
          Contact
          <input
            className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm text-muted">
            Grace days
            <input
              type="number"
              className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              value={form.graceDays}
              onChange={(e) => setForm({ ...form, graceDays: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm text-muted">
            Late fee type
            <select
              className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              value={form.lateFeeType}
              onChange={(e) => setForm({ ...form, lateFeeType: e.target.value })}
            >
              <option value="fixed">Fixed</option>
              <option value="percent">Percent</option>
            </select>
          </label>
          <label className="text-sm text-muted">
            Late fee value (ETH or %)
            <input
              className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              value={form.lateFeeValue}
              onChange={(e) => setForm({ ...form, lateFeeValue: e.target.value })}
            />
          </label>
        </div>
        <AnimatedButton onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save profile'}
        </AnimatedButton>
      </SectionCard>
    );
  };

  const renderTenantPanel = () => (
    <SectionCard title="Account preferences" description="Tenant settings focus on wallet access and notifications.">
      <p className="text-sm text-muted">
        Signed in as <span className="text-foreground">{user?.email ?? 'tenant'}</span>. Portfolio defaults are managed by
        your property owner.
      </p>
      <p className="text-sm text-muted">
        Need to update your details? Contact your owner directly or email{' '}
        <a className="text-brand hover:underline" href="mailto:support@rentalsuite.com">
          support@rentalsuite.com
        </a>
        .
      </p>
    </SectionCard>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Portfolio defaults and environment targeting." />
      {isOwner ? renderOwnerProfile() : renderTenantPanel()}
      <SectionCard title="Environment" description="Use the navbar toggle to switch between local and Sepolia networks.">
        <p className="text-sm text-muted">
          Currently targeting {environment === 'local' ? 'Local (Ganache 1337)' : 'Sepolia (11155111)'}.
        </p>
        <div className="mt-4 rounded-2xl border border-outline bg-surface-1 p-4 text-sm text-muted">
          <p className="font-medium text-foreground">Connected wallet</p>
          <p className="font-mono text-base">{wallet ?? 'Not connected'}</p>
        </div>
      </SectionCard>
    </div>
  );
}
