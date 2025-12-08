import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { fetchLease, signLease, toggleAutopay } from '../lib/api';
import PaymentsTable from '../components/PaymentsTable';
import RepairsTable from '../components/RepairsTable';
import { useAppStore } from '../store/useAppStore';
import { downloadLeasePdf } from '../lib/pdf';
import { ensureNetwork } from '../lib/eth';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';

export default function AgreementDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const role = useAppStore((state) => state.role ?? state.user?.role);
  const wallet = useAppStore((state) => state.wallet);
  const environment = useAppStore((state) => state.environment);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const connectedWallet = useAppStore((state) => state.wallet?.toLowerCase() ?? null);
  const [tab, setTab] = useState<'payments' | 'repairs'>('payments');

  const { data: lease, isLoading } = useQuery({
    queryKey: ['lease', id],
    queryFn: () => fetchLease(id as string),
    enabled: Boolean(id)
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
    mutationFn: async () => {
      if (role === 'tenant') {
        if (!wallet) throw new Error('Wallet not connected');
        await ensureNetwork(environment);
        const provider = (window as any).ethereum;
        const message = `Lease:${id}`;
        const signature = await provider.request({
          method: 'personal_sign',
          params: [message, wallet]
        });
        await signLease(id!, signature);
      } else {
        await signLease(id!);
      }
    },
    onSuccess: () => {
      pushNotice('success', 'Lease signed');
      queryClient.invalidateQueries({ queryKey: ['lease', id] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
    },
    onError: (err: any) => pushNotice('error', err.message || 'Unable to sign lease')
  });

  if (isLoading || !lease) return <p className="text-muted">Loading…</p>;

  const canTenantSign = role === 'tenant' && !lease.tenantSignedAt;
  const canOwnerSign = role === 'owner' && !lease.ownerSignedAt;
  const depositInvoiceId = `deposit-${lease.id}`;
  const receipts = lease.receipts || [];
  const depositReceipt = receipts.find((r: any) => r.invoiceId === depositInvoiceId);
  const rentReceipts = receipts.filter((r: any) => r.invoiceId !== depositInvoiceId);
  const explorerBase =
    Number(lease.chainId) === 11155111
      ? 'https://sepolia.etherscan.io'
      : Number(lease.chainId) === 1
        ? 'https://etherscan.io'
        : null;
  const receiptNftContract = receipts[0]?.nftContract || lease.ownerNftContract;
  const tenantWalletLower = lease.tenantEth?.toLowerCase() ?? null;
  const walletMatchesTenant = connectedWallet && tenantWalletLower && connectedWallet === tenantWalletLower;

  const importNftToWallet = async (contract: string | null, tokenId: string | number | null) => {
    if (!contract || tokenId === null || tokenId === undefined) {
      pushNotice('error', 'NFT contract or token ID missing');
      return;
    }
    const provider = (window as any).ethereum;
    if (!provider?.request) {
      pushNotice('error', 'Wallet not detected');
      return;
    }
    try {
      await provider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options: {
            address: contract,
            tokenId: tokenId.toString()
          }
        }
      });
      pushNotice('success', 'NFT added to wallet');
    } catch (err: any) {
      pushNotice('error', err?.message || 'Unable to add NFT');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Lease ${lease.id.slice(0, 6)}`}
        description={lease.property?.name || 'Lease overview'}
        breadcrumbs={[
          { label: 'Agreements', href: '/agreements' },
          { label: `Lease ${lease.id.slice(0, 6)}` }
        ]}
        actions={
          <>
            <button
              onClick={() => downloadLeasePdf(lease)}
              className="rounded-2xl border border-outline px-4 py-2 text-sm text-foreground hover:bg-surface-1 transition"
              type="button"
            >
              Download PDF
            </button>
            {canTenantSign && (
              <AnimatedButton onClick={() => signMutation.mutate()} disabled={signMutation.isPending} className="text-sm">
                {signMutation.isPending ? 'Signing…' : 'Sign lease'}
              </AnimatedButton>
            )}
            {canOwnerSign && (
              <AnimatedButton onClick={() => signMutation.mutate()} disabled={signMutation.isPending} className="text-sm">
                {signMutation.isPending ? 'Signing…' : 'Sign lease'}
              </AnimatedButton>
            )}
          </>
        }
      />
      <SectionCard>
        <div className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-muted">Monthly rent (ETH)</p>
            <p className="text-lg font-semibold text-foreground">{lease.monthlyRentEth}</p>
          </div>
          <div>
            <p className="text-muted">Security deposit (ETH)</p>
            <p className="text-lg font-semibold text-foreground">{lease.securityDepositEth}</p>
          </div>
          <div>
            <p className="text-muted">Start / End</p>
            <p className="font-medium text-foreground">
              {lease.startISO.slice(0, 10)} → {lease.endISO.slice(0, 10)}
            </p>
          </div>
          <div>
            <p className="text-muted">Tenant wallet</p>
            <p className="font-mono text-xs text-foreground break-all">{lease.tenantEth}</p>
          </div>
          <div>
            <p className="text-muted">Status</p>
            <span className="inline-flex items-center rounded-full bg-surface-3 px-3 py-1 text-xs font-semibold capitalize text-foreground">
              {lease.status}
            </span>
          </div>
          <div>
            <p className="text-muted">Tenant signature</p>
            <p className="font-medium text-foreground">{lease.tenantSignedAt ? lease.tenantSignedAt.slice(0, 10) : 'Pending'}</p>
          </div>
          <div>
            <p className="text-muted">Owner signature</p>
            <p className="font-medium text-foreground">{lease.ownerSignedAt ? lease.ownerSignedAt.slice(0, 10) : 'Pending'}</p>
          </div>
          {role === 'tenant' && (
            <div className="col-span-full flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-outline bg-surface-1 p-4">
              <div>
                <p className="text-sm text-muted">Autopay</p>
                <p className="text-xs text-muted">Enable reminders and one-click payments each cycle.</p>
              </div>
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  lease.autopayEnabled ? 'bg-success/20 text-success' : 'bg-surface-3 text-muted'
                }`}
                onClick={() => autopayMutation.mutate(!lease.autopayEnabled)}
                disabled={autopayMutation.isPending}
                type="button"
              >
                {lease.autopayEnabled ? 'On' : 'Off'}
              </button>
            </div>
          )}
          {lease.ownerNftTokenId && (
            <div className="col-span-full flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-outline bg-surface-1 p-4">
              <div>
                <p className="text-sm text-muted">Lease receipt NFT</p>
                <p className="text-lg font-semibold text-foreground">Token #{lease.ownerNftTokenId}</p>
                <p className="text-xs text-muted">
                  Minted to owner wallet {lease.owner?.ethAddr || lease.ownerId || 'owner'}
                </p>
                {lease.ownerNftContract && (
                  <p className="text-xs text-muted">
                    Contract{' '}
                    <code className="rounded bg-surface-2 px-1 py-0.5 text-[10px] text-foreground">
                      {lease.ownerNftContract}
                    </code>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {lease.ownerNftTxHash && (
                  explorerBase ? (
                    <a
                      className="text-sm font-semibold text-brand hover:text-brand-hover"
                      href={`${explorerBase}/tx/${lease.ownerNftTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Etherscan
                    </a>
                  ) : (
                    <code className="text-xs font-mono text-muted" title={lease.ownerNftTxHash}>
                      {lease.ownerNftTxHash.slice(0, 10)}…
                    </code>
                  )
                )}
                {lease.ownerNftMetadataUri && (
                  <a
                    className="text-sm text-muted underline-offset-4 hover:underline"
                    href={lease.ownerNftMetadataUri}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Metadata
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </SectionCard>
      <SectionCard>
        <div className="flex gap-2 rounded-2xl bg-surface-1 p-1">
          {(['payments', 'repairs'] as const).map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  active ? 'bg-surface-2 text-foreground shadow-soft' : 'text-muted hover:text-foreground'
                }`}
                onClick={() => setTab(key)}
                type="button"
              >
                {key === 'payments' ? 'Payments' : 'Repairs'}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          {tab === 'payments' ? (
            <SectionCard title="Payment history" description="Security deposit and rent receipts for this lease.">
              {depositReceipt || rentReceipts.length ? (
                <ul className="space-y-2 text-sm">
                  {depositReceipt && (
                    <li className="flex items-center justify-between rounded-xl border border-outline px-3 py-2">
                  <div>
                    <p className="font-medium text-foreground">{Number(depositReceipt.paidEth)} ETH</p>
                    <p className="text-xs text-muted">
                      {depositReceipt.paidAtISO?.slice(0, 10) || '—'} • Security deposit
                    </p>
                    {depositReceipt.nftTokenId && (
                      <p className="text-xs text-muted">
                        NFT #{depositReceipt.nftTokenId} • Minted to tenant wallet {lease.tenantEth}{' '}
                        {depositReceipt.nftTxHash && explorerBase ? (
                          <a
                            className="text-brand hover:text-brand-hover"
                            href={`${explorerBase}/tx/${depositReceipt.nftTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            tx
                          </a>
                        ) : depositReceipt.nftTxHash ? (
                          <code className="text-[10px]">{depositReceipt.nftTxHash.slice(0, 10)}…</code>
                        ) : null}
                        {depositReceipt.nftMetadataUri && (
                          <>
                            {' • '}
                            <a className="text-brand hover:text-brand-hover" href={depositReceipt.nftMetadataUri} target="_blank" rel="noreferrer">
                              metadata
                            </a>
                          </>
                        )}
                      </p>
                    )}
                    {depositReceipt.nftTokenId && receiptNftContract && walletMatchesTenant && (
                      <button
                        type="button"
                        className="mt-1 text-xs font-semibold text-brand hover:text-brand-hover"
                        onClick={() => importNftToWallet(receiptNftContract, depositReceipt.nftTokenId)}
                      >
                        Add to MetaMask
                      </button>
                    )}
                    {depositReceipt.nftTokenId && receiptNftContract && !walletMatchesTenant && (
                      <p className="mt-1 text-[11px] text-muted">
                        Connect tenant wallet {lease.tenantEth} to add this NFT.
                      </p>
                    )}
                  </div>
                      {depositReceipt.txHash && (
                        <code className="text-xs font-mono text-muted" title={depositReceipt.txHash}>
                          {depositReceipt.txHash.slice(0, 8)}…
                        </code>
                      )}
                    </li>
                  )}
                  {rentReceipts.map((receipt: any) => (
                    <li
                      key={receipt.id}
                      className="flex items-center justify-between rounded-xl border border-outline px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-foreground">{Number(receipt.paidEth)} ETH</p>
                        <p className="text-xs text-muted">
                          {receipt.paidAtISO?.slice(0, 10) || '—'} • Rent
                        </p>
                        {receipt.nftTokenId && (
                          <p className="text-xs text-muted">
                            NFT #{receipt.nftTokenId} • Minted to tenant wallet {lease.tenantEth}{' '}
                            {receipt.nftTxHash && explorerBase ? (
                              <a
                                className="text-brand hover:text-brand-hover"
                                href={`${explorerBase}/tx/${receipt.nftTxHash}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                tx
                              </a>
                            ) : receipt.nftTxHash ? (
                              <code className="text-[10px]">{receipt.nftTxHash.slice(0, 10)}…</code>
                            ) : null}
                            {receipt.nftMetadataUri && (
                              <>
                                {' • '}
                                <a className="text-brand hover:text-brand-hover" href={receipt.nftMetadataUri} target="_blank" rel="noreferrer">
                                  metadata
                                </a>
                              </>
                            )}
                          </p>
                        )}
                        {receipt.nftTokenId && receiptNftContract && walletMatchesTenant && (
                          <button
                            type="button"
                            className="mt-1 text-xs font-semibold text-brand hover:text-brand-hover"
                            onClick={() => importNftToWallet(receiptNftContract, receipt.nftTokenId)}
                          >
                            Add to MetaMask
                          </button>
                        )}
                        {receipt.nftTokenId && receiptNftContract && !walletMatchesTenant && (
                          <p className="mt-1 text-[11px] text-muted">
                            Connect tenant wallet {lease.tenantEth} to add this NFT.
                          </p>
                        )}
                      </div>
                      {receipt.txHash && (
                        <code className="text-xs font-mono text-muted" title={receipt.txHash}>
                          {receipt.txHash.slice(0, 8)}…
                        </code>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No payments recorded for this lease yet.</p>
              )}
            </SectionCard>
          ) : (
            <RepairsTable leaseId={lease.id} repairs={lease.repairs || []} />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
