import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createProperty, fetchProperties, updateProperty } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';

export default function Properties() {
  const role = useAppStore((state) => state.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
    enabled: role === 'owner'
  });

  const [form, setForm] = useState({ name: '', address: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => (editingId ? updateProperty(editingId, form) : createProperty(form)),
    onSuccess: () => {
      pushNotice('success', editingId ? 'Property updated' : 'Property created');
      setForm({ name: '', address: '' });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
    onError: (err: any) => pushNotice('error', err.response?.data?.message || 'Unable to save property')
  });

  const startEdit = (property: any) => {
    setEditingId(property.id);
    setForm({ name: property.name, address: property.address });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.address) return;
    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Properties" description="Create and maintain the assets you can attach to leases and listings." />
      <SectionCard title={editingId ? 'Edit property' : 'Add property'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm text-muted">
            Name
            <input
              className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm text-muted">
            Address
            <input
              className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              required
            />
          </label>
          <div className="flex justify-end">
            <AnimatedButton type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : editingId ? 'Update property' : 'Create property'}
            </AnimatedButton>
          </div>
        </form>
      </SectionCard>
      <SectionCard title="Portfolio">
        {isLoading ? (
          <p className="p-4 text-sm text-muted">Loading properties…</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="p-3 font-semibold text-foreground/80">Name</th>
                <th className="p-3 font-semibold text-foreground/80">Address</th>
                <th className="p-3 font-semibold text-foreground/80">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property: any) => (
                <tr key={property.id} className="border-t border-outline/40">
                  <td className="p-3 font-medium text-foreground">{property.name}</td>
                  <td className="p-3 text-muted">{property.address}</td>
                  <td className="p-3 flex flex-wrap gap-3">
                    <Link to={`/properties/${property.id}/ledger`} className="text-sm font-semibold text-brand hover:text-brand-hover">
                      Ledger
                    </Link>
                    <button className="text-sm text-muted hover:text-foreground" onClick={() => startEdit(property)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!properties.length && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted">
                    No properties yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}
