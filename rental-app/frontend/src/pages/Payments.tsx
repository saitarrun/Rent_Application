import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLease, logAnnualPayment, logDepositPayment } from '../lib/api';
import { ensureNetwork, payAnnual, payDeposit } from '../lib/eth';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { TxButton } from '../components/TxButton';

export default function Payments() {
  const { id } = useParams();
  const env = useAppStore((state) => state.environment);
  const role = useAppStore((state) => state.role ?? state.user?.role);
  const wallet = useAppStore((state) => state.wallet);
  const isTenant = role === 'tenant';
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();
  const { data: lease, isLoading } = useQuery({
    queryKey: ['lease', id],
    queryFn: () => fetchLease(id as string),
    enabled: Boolean(id)
  });
  if (isLoading || !lease) return <p className="text-muted">Loading…</p>;

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
      <SectionCard>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-outline bg-surface-1 p-4 shadow-soft space-y-3">
            <div>
              <p className="text-sm text-muted">Deposit (ETH)</p>
              <p className="text-2xl font-semibold text-foreground">{depositAmount || '—'}</p>
            </div>
            {depositPaid ? (
              <p className="text-sm font-medium text-success">
                Deposit paid{depositReceipt?.paidAtISO ? ` on ${depositReceipt.paidAtISO.slice(0, 10)}` : ''}
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
                />
                {!tenantWalletMatches && (
                  <p className="text-xs text-danger">
                    Connected wallet does not match the lease wallet. Switch to{' '}
                    {lease.tenantEth ? lease.tenantEth : 'your lease wallet'} in MetaMask.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">Waiting for tenant payment</p>
            )}
            <p className="text-xs text-muted">Funds settle into the on-chain deposit ledger.</p>
          </div>
          <div className="rounded-2xl border border-outline bg-surface-1 p-4 shadow-soft space-y-3">
            <div>
              <p className="text-sm text-muted">Annual rent (ETH)</p>
              <p className="text-2xl font-semibold text-foreground">{annualAmount || '—'}</p>
            </div>
            {annualPaid ? (
              <p className="text-sm font-medium text-success">
                Rent paid{rentReceipt?.paidAtISO ? ` on ${rentReceipt.paidAtISO.slice(0, 10)}` : ''}
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
                />
                {!tenantWalletMatches && (
                  <p className="text-xs text-danger">
                    Connected wallet does not match the lease wallet. Switch to{' '}
                    {lease.tenantEth ? lease.tenantEth : 'your lease wallet'} in MetaMask.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">Waiting for tenant payment</p>
            )}
            <p className="text-xs text-muted">Covers 12 months upfront per lease terms.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-outline bg-surface-1 p-4 shadow-soft">
          <p className="text-sm text-muted">Deposit balance</p>
          <p className="text-lg font-semibold text-foreground">{lease.depositBalanceEth ?? '0'}</p>
        </div>
      </SectionCard>
      <SectionCard title="Payment history" description="Receipts logged for this lease.">
        {receipts.length ? (
          <ul className="space-y-2 text-sm">
            {[...receipts]
              .sort((a: any, b: any) => (a.paidAtISO > b.paidAtISO ? -1 : 1))
              .map((receipt: any) => (
                <li key={receipt.id} className="flex items-center justify-between rounded-xl border border-outline px-3 py-2">
                  <div>
                    <p className="font-medium text-foreground">{Number(receipt.paidEth)} ETH</p>
                    <p className="text-xs text-muted">{receipt.paidAtISO?.slice(0, 10)} • {receipt.invoiceId}</p>
                  </div>
                  <span className="text-xs font-mono text-muted">{receipt.txHash.slice(0, 8)}…</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No receipts yet.</p>
        )}
      </SectionCard>
    </div>
  );
}
