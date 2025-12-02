import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLease, fetchLeases, logAnnualPayment, logDepositPayment } from '../lib/api';
import { ensureNetwork, payAnnual, payDeposit } from '../lib/eth';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { TxButton } from '../components/TxButton';
import { HelpText, InfoBox, RequirementsList } from '../components/HelpComponents';
import { Tooltip } from '../components/Tooltip';

export default function Payments() {
  const { id } = useParams();
  const env = useAppStore((state) => state.environment);
  const role = useAppStore((state) => state.role ?? state.user?.role);
  const wallet = useAppStore((state) => state.wallet);
  const isTenant = role === 'tenant';
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();
  const { data: lease, isLoading, refetch } = useQuery({
    queryKey: ['lease', id],
    queryFn: () => fetchLease(id as string),
    enabled: Boolean(id)
  });
  const { data: ownerLeases = [], isLoading: loadingLeases } = useQuery({
    queryKey: ['leases'],
    queryFn: fetchLeases,
    enabled: role === 'owner' && !id
  });

  if (role === 'owner' && !id) {
    if (loadingLeases) return <p className="text-muted">Loading…</p>;
    const flattenedReceipts = ownerLeases
      .flatMap((l: any) => (l.receipts || []).map((r: any) => ({ ...r, lease: l })))
      .sort((a: any, b: any) => (a.paidAtISO > b.paidAtISO ? -1 : 1));
    return (
      <div className="space-y-6">
        <PageHeader
          title="Payments"
          description="All tenant payments across your leases."
          breadcrumbs={[{ label: 'Payments' }]}
        />
        <SectionCard title="Receipts">
          {flattenedReceipts.length ? (
            <div role="region" aria-label="All tenant receipts">
              <ul className="space-y-2 text-sm">
                {flattenedReceipts.map((receipt: any) => (
                  <li
                    key={receipt.id}
                    className="flex items-center justify-between rounded-xl border border-outline px-3 py-2"
                    aria-label={`Payment of ${receipt.paidEth} ETH on ${receipt.paidAtISO?.slice(0, 10)} for lease ${receipt.lease?.id}`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{Number(receipt.paidEth)} ETH</p>
                      <p className="text-xs text-muted">
                        {receipt.paidAtISO?.slice(0, 10) || '—'} • Lease {receipt.lease?.id || '-'} •{' '}
                        {receipt.invoiceId === `deposit-${receipt.lease?.id}` ? 'Security deposit' : 'Rent'}
                      </p>
                      <p className="text-xs text-muted">
                        Tenant: {receipt.lease?.tenant?.email || receipt.lease?.tenantId || '—'}
                      </p>
                    </div>
                    {receipt.txHash && (
                      <code className="text-xs font-mono text-muted" title={receipt.txHash}>
                        {receipt.txHash.slice(0, 8)}…
                      </code>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted">No payments recorded yet.</p>
          )}
        </SectionCard>
      </div>
    );
  }

  if (isLoading || !lease) return <p className="text-muted">Loading…</p>;

  const [payAllPending, setPayAllPending] = useState(false);
  const normalizedLeaseWallet = lease.tenantEth?.toLowerCase() ?? null;
  const normalizedConnected = wallet?.toLowerCase() ?? null;
  const tenantWalletMatches =
    !isTenant || (normalizedLeaseWallet !== null && normalizedConnected !== null && normalizedLeaseWallet === normalizedConnected);

  const chainLeaseId = lease.chainLeaseId || lease.id;
  const depositAmount = Number(lease.securityDepositEth ?? lease.depositEth ?? 0);
  const annualAmount = Number(lease.annualRentEth ?? 0);
  const invoices = lease.invoices ?? [];
  const receipts = lease.receipts ?? [];
  const depositInvoiceId = `deposit-${lease.id}`;
  const depositInvoice = invoices.find((invoice: any) => invoice.id === depositInvoiceId);
  const depositReceipt = receipts.find((receipt: any) => receipt.invoiceId === depositInvoiceId);
  const depositPaid =
    depositAmount > 0 &&
    (Number(lease.depositBalanceEth ?? 0) >= depositAmount ||
      depositInvoice?.status === 'paid' ||
      Boolean(depositReceipt));
  const rentReceipt = receipts.find((receipt: any) => receipt.invoiceId !== depositInvoiceId);
  const annualPaid =
    annualAmount > 0 &&
    (invoices.some((invoice: any) => invoice.status === 'paid' && invoice.id !== depositInvoiceId) || Boolean(rentReceipt));
  const outstandingTotal =
    (depositPaid ? 0 : depositAmount > 0 ? depositAmount : 0) +
    (annualPaid ? 0 : annualAmount > 0 ? annualAmount : 0);

  const handleDeposit = async () => {
    if (!depositAmount) throw new Error('Deposit amount unavailable');
    if (isTenant && !tenantWalletMatches) {
      throw new Error(
        lease.tenantEth ? `Connect wallet ${lease.tenantEth} to submit payments.` : 'Connect your lease wallet to submit payments.'
      );
    }
    await ensureNetwork(env);
    const txHash = await payDeposit(chainLeaseId, depositAmount.toString());
    await logDepositPayment(lease.id, { txHash, amountEth: depositAmount });
    pushNotice('success', 'Deposit paid');
    queryClient.invalidateQueries({ queryKey: ['lease', id] });
    queryClient.invalidateQueries({ queryKey: ['leases'] });
    return txHash;
  };

  const handleAnnual = async () => {
    if (!annualAmount) throw new Error('Annual rent unavailable');
    if (isTenant && !tenantWalletMatches) {
      throw new Error(
        lease.tenantEth ? `Connect wallet ${lease.tenantEth} to submit payments.` : 'Connect your lease wallet to submit payments.'
      );
    }
    await ensureNetwork(env);
    const txHash = await payAnnual(chainLeaseId, annualAmount.toString());
    await logAnnualPayment(lease.id, { txHash, amountEth: annualAmount });
    pushNotice('success', 'Annual rent paid');
    queryClient.invalidateQueries({ queryKey: ['lease', id] });
    queryClient.invalidateQueries({ queryKey: ['leases'] });
    return txHash;
  };

  const handlePayAll = async () => {
    if (outstandingTotal <= 0) {
      throw new Error('No outstanding payments.');
    }
    if (isTenant && !tenantWalletMatches) {
      throw new Error(
        lease.tenantEth ? `Connect wallet ${lease.tenantEth} to submit payments.` : 'Connect your lease wallet to submit payments.'
      );
    }
    setPayAllPending(true);
    try {
      await ensureNetwork(env);
      let lastHash = '';
      if (!depositPaid && depositAmount) {
        lastHash = await payDeposit(chainLeaseId, depositAmount.toString());
        await logDepositPayment(lease.id, { txHash: lastHash, amountEth: depositAmount });
      }
      if (!annualPaid && annualAmount) {
        lastHash = await payAnnual(chainLeaseId, annualAmount.toString());
        await logAnnualPayment(lease.id, { txHash: lastHash, amountEth: annualAmount });
      }
      pushNotice('success', 'Payments sent to owner');
      queryClient.invalidateQueries({ queryKey: ['lease', id] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      return lastHash;
    } finally {
      setPayAllPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description={`Lease ${lease.id}`}
        breadcrumbs={[
          { label: 'Agreements', href: '/agreements' },
          { label: `Lease ${lease.id.slice(0, 6)}`, href: `/agreements/${lease.id}` },
          { label: 'Payments' }
        ]}
      />
      {isTenant && (
        <InfoBox
          title="Payment Instructions"
          description="Complete the one-time security deposit and annual rent payments directly to the owner. Make sure your wallet is connected and matches your lease wallet."
        />
      )}
      {!isTenant && (
        <InfoBox
          title="Monitoring Tenant Payments"
          description="Track when your tenant submits deposit and rent payments. Once both are confirmed on-chain, you can manage repairs and deposit deductions."
        />
      )}
      <SectionCard>
        <div className="grid gap-4 md:grid-cols-2" role="region" aria-label="Payment amounts">
          <article className="rounded-2xl border border-outline bg-surface-1 p-4 shadow-soft space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-muted">Security Deposit</h3>
                <Tooltip content="Security deposit held on-chain. Returned at lease end or used for repairs." side="right">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand/10 text-xs text-brand cursor-help" role="img" aria-label="Help">
                    ?
                  </span>
                </Tooltip>
              </div>
              <p className="text-2xl font-semibold text-foreground" aria-label={`Deposit amount: ${depositAmount} ETH`}>
                {depositAmount || '—'}
                {depositAmount && <span className="text-sm text-muted ml-2">ETH</span>}
              </p>
            </div>
            {depositPaid ? (
              <p className="text-sm font-semibold text-success" role="status">
                ✓ Paid to owner{depositReceipt?.paidAtISO ? ` on ${depositReceipt.paidAtISO.slice(0, 10)}` : ''}
              </p>
            ) : isTenant ? (
              <>
                <TxButton
                  label={
                    tenantWalletMatches
                      ? 'Pay deposit'
                      : normalizedLeaseWallet
                        ? `Connect ${lease.tenantEth}`
                        : 'Connect wallet'
                  }
                  onSend={handleDeposit}
                  className="w-full justify-center"
                  disabled={depositPaid || !tenantWalletMatches}
                  aria-describedby="deposit-help"
                />
                {!tenantWalletMatches && (
                <p className="text-xs text-danger" role="alert">
                  ⚠️ Connected wallet does not match the lease wallet. Switch to{' '}
                  {lease.tenantEth ? lease.tenantEth : 'your lease wallet'} in MetaMask.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted" role="status">
              Waiting for tenant payment
            </p>
          )}
          <p id="deposit-help" className="text-xs text-muted">
            Funds settle into the on-chain deposit ledger for the owner.
          </p>
        </article>

          <article className="rounded-2xl border border-outline bg-surface-1 p-4 shadow-soft space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-muted">Annual Rent</h3>
                <Tooltip content="12 months of rent paid upfront per lease terms. Records payment to the blockchain." side="right">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand/10 text-xs text-brand cursor-help" role="img" aria-label="Help">
                    ?
                  </span>
                </Tooltip>
              </div>
              <p className="text-2xl font-semibold text-foreground" aria-label={`Annual rent amount: ${annualAmount} ETH`}>
                {annualAmount || '—'}
                {annualAmount && <span className="text-sm text-muted ml-2">ETH</span>}
              </p>
            </div>
            {annualPaid ? (
              <p className="text-sm font-semibold text-success" role="status">
                ✓ Paid to owner{rentReceipt?.paidAtISO ? ` on ${rentReceipt.paidAtISO.slice(0, 10)}` : ''}
              </p>
            ) : isTenant ? (
              <>
                <TxButton
                  label={
                    tenantWalletMatches
                      ? 'Pay annual rent'
                      : normalizedLeaseWallet
                        ? `Connect ${lease.tenantEth}`
                        : 'Connect wallet'
                  }
                  onSend={handleAnnual}
                  className="w-full justify-center"
                  disabled={annualPaid || !tenantWalletMatches}
                  aria-describedby="rent-help"
                />
                {!tenantWalletMatches && (
                  <p className="text-xs text-danger" role="alert">
                    ⚠️ Connected wallet does not match the lease wallet. Switch to{' '}
                    {lease.tenantEth ? lease.tenantEth : 'your lease wallet'} in MetaMask.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted" role="status">
                Waiting for tenant payment
              </p>
            )}
            <p id="rent-help" className="text-xs text-muted">
              Covers 12 months upfront per lease terms, paid directly to the owner.
            </p>
          </article>
        </div>

        {isTenant && outstandingTotal > 0 && (
          <div className="mt-4 rounded-2xl border border-brand/20 bg-brand/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Pay outstanding to owner</p>
                <p className="text-xs text-muted">
                  One click pays remaining deposit and rent directly to the owner.
                </p>
              </div>
              <TxButton
                label={`Pay ${outstandingTotal} ETH`}
                onSend={handlePayAll}
                disabled={!tenantWalletMatches || payAllPending}
                className="justify-center px-6"
              />
            </div>
            {!tenantWalletMatches && (
              <p className="mt-2 text-xs text-danger" role="alert">
                Connect the lease wallet to pay the owner.
              </p>
            )}
          </div>
        )}

      </SectionCard>
      <SectionCard title="Payment history" description="Security deposit and annual rent receipts.">
        {depositReceipt || rentReceipt ? (
          <div role="region" aria-label="Payment receipts list">
            <ul className="space-y-2 text-sm">
              {depositReceipt && (
                <li
                  className="flex items-center justify-between rounded-xl border border-outline px-3 py-2"
                  aria-label={`Security deposit of ${depositReceipt.paidEth} ETH on ${depositReceipt.paidAtISO?.slice(0, 10)}`}
                >
                  <div>
                    <p className="font-medium text-foreground">{Number(depositReceipt.paidEth)} ETH</p>
                    <p className="text-xs text-muted">
                      {depositReceipt.paidAtISO?.slice(0, 10) || '—'} • Security deposit
                    </p>
                  </div>
                  {depositReceipt.txHash && (
                    <code className="text-xs font-mono text-muted" title={depositReceipt.txHash}>
                      {depositReceipt.txHash.slice(0, 8)}…
                    </code>
                  )}
                </li>
              )}
              {rentReceipt && (
                <li
                  className="flex items-center justify-between rounded-xl border border-outline px-3 py-2"
                  aria-label={`Annual rent of ${rentReceipt.paidEth} ETH on ${rentReceipt.paidAtISO?.slice(0, 10)}`}
                >
                  <div>
                    <p className="font-medium text-foreground">{Number(rentReceipt.paidEth)} ETH</p>
                    <p className="text-xs text-muted">
                      {rentReceipt.paidAtISO?.slice(0, 10) || '—'} • Annual rent
                    </p>
                  </div>
                  {rentReceipt.txHash && (
                    <code className="text-xs font-mono text-muted" title={rentReceipt.txHash}>
                      {rentReceipt.txHash.slice(0, 8)}…
                    </code>
                  )}
                </li>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted" role="status">
            No receipts yet. Payments will appear here once confirmed on-chain.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
