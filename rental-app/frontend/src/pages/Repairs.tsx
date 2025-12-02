import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLease, fetchRepairs, createRepair } from '../lib/api';
import RepairsTable from '../components/RepairsTable';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { InfoBox, RequirementsList } from '../components/HelpComponents';
import { Tooltip } from '../components/Tooltip';

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

  const [form, setForm] = useState({ title: '', detail: '' });

  const createMutation = useMutation({
    mutationFn: () => createRepair(id!, { ...form }),
    onSuccess: () => {
      pushNotice('success', 'Repair submitted');
      setForm({ title: '', detail: '' });
      queryClient.invalidateQueries({ queryKey: ['repairs', id] });
      queryClient.invalidateQueries({ queryKey: ['lease', id] });
    },
    onError: (err: any) => pushNotice('error', err.response?.data?.message || 'Unable to submit repair')
  });

  const depositAmount = Number(lease?.securityDepositEth ?? lease?.depositEth ?? 0);
  const annualAmount = Number(lease?.annualRentEth ?? 0);
  const invoices = lease?.invoices ?? [];
  const receipts = lease?.receipts ?? [];
  const depositInvoiceId = lease ? `deposit-${lease.id}` : '';
  const depositInvoice = invoices.find((invoice: any) => invoice.id === depositInvoiceId);
  const depositReceipt = receipts.find((receipt: any) => receipt.invoiceId === depositInvoiceId);
  const depositPaid =
    depositAmount === 0 ||
    Number(lease?.depositBalanceEth ?? 0) >= depositAmount ||
    depositInvoice?.status === 'paid' ||
    Boolean(depositReceipt);
  const annualPaid =
    annualAmount === 0 ||
    invoices.some((invoice: any) => invoice.status === 'paid' && invoice.id !== depositInvoiceId) ||
    receipts.some((receipt: any) => receipt.invoiceId !== depositInvoiceId);
  const leaseSigned = lease?.tenantSignedAt && lease?.ownerSignedAt;
  const canSubmitRepair = role === 'tenant' && leaseSigned && depositPaid && annualPaid && lease?.status === 'active';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repairs"
        description={`Lease ${lease?.id || id}`}
        breadcrumbs={[
          { label: 'Agreements', href: '/agreements' },
          lease
            ? { label: `Lease ${lease.id.slice(0, 6)}`, href: `/agreements/${lease.id}` }
            : { label: 'Lease' },
          { label: 'Repairs' }
        ]}
      />
      {role === 'owner' && (
        <>
          <InfoBox
            title="Manage Tenant Repairs"
            description={
              <>
                <p className="mb-2">
                  Review and manage tenant repair requests. Update status and apply costs as needed.
                </p>
                <ul className="space-y-1 text-sm ml-4 list-disc">
                  <li><strong>Open:</strong> New repair request submitted</li>
                  <li><strong>In progress:</strong> You're working on or coordinating the repair</li>
                  <li><strong>Resolved:</strong> Repair completed; enter cost to deduct from deposit</li>
                  <li><strong>Closed:</strong> Fully settled with tenant; no deduction applied</li>
                </ul>
              </>
            }
          />
        </>
      )}
      {role === 'tenant' && (
        <>
          <InfoBox
            title="Repair Submission Requirements"
            description={
              <RequirementsList
                items={[
                  { label: 'Lease is signed by both parties', met: leaseSigned },
                  { label: 'Security deposit paid', met: depositPaid },
                  { label: 'Annual rent paid', met: annualPaid },
                  { label: 'Lease is active', met: lease?.status === 'active' }
                ]}
              />
            }
          />
          <SectionCard title="Submit a repair">
            {canSubmitRepair ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                aria-label="Repair submission form"
              >
                <fieldset className="space-y-4">
                  <legend className="sr-only">Repair Details</legend>
                  
                  <div>
                    <label htmlFor="repair-title" className="text-sm font-medium text-muted">
                      Title <span className="text-danger" aria-label="required">*</span>
                    </label>
                    <input
                      id="repair-title"
                      className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Leaking faucet"
                      aria-required="true"
                      aria-describedby="title-help"
                      required
                    />
                    <p id="title-help" className="mt-1 text-xs text-muted">
                      Brief description of the repair issue
                    </p>
                  </div>

                  <div>
                    <label htmlFor="repair-detail" className="text-sm font-medium text-muted">
                      Detail
                    </label>
                    <textarea
                      id="repair-detail"
                      className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                      value={form.detail}
                      onChange={(e) => setForm((prev) => ({ ...prev, detail: e.target.value }))}
                      placeholder="Provide more context about the issue..."
                      aria-describedby="detail-help"
                      rows={3}
                    />
                  <p id="detail-help" className="mt-1 text-xs text-muted">
                    Optional: Location, when issue started, impact
                  </p>
                </div>
                </fieldset>

                <AnimatedButton
                  type="submit"
                  disabled={createMutation.isPending || !form.title}
                  className="w-full justify-center"
                  aria-busy={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Submitting…' : 'Submit repair'}
                </AnimatedButton>
                <p className="text-xs text-muted">
                  Owners set the final cost and tenants pay once the repair is marked resolved.
                </p>
              </form>
            ) : (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-warning/30 bg-warning/5 p-4"
              >
                <p className="text-sm text-muted font-medium">
                  ⚠️ Repair requests unlock once:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted list-disc list-inside">
                  <li>Your lease is fully signed</li>
                  <li>Security deposit has been paid</li>
                  <li>Annual rent has been paid</li>
                  <li>Lease status is active</li>
                </ul>
              </div>
            )}
          </SectionCard>
        </>
      )}
      <SectionCard title="History">
        {isLoading ? <p className="text-muted">Loading repairs…</p> : <RepairsTable leaseId={id as string} repairs={repairs} />}
      </SectionCard>
    </div>
  );
}
