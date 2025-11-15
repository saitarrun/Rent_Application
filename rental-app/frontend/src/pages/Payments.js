import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const isTenant = role === 'tenant';
    const pushNotice = useAppStore((state) => state.pushNotice);
    const queryClient = useQueryClient();
    const { data: lease, isLoading } = useQuery({
        queryKey: ['lease', id],
        queryFn: () => fetchLease(id),
        enabled: Boolean(id)
    });
    if (isLoading || !lease)
        return _jsx("p", { className: "text-muted", children: "Loading\u2026" });
    const chainLeaseId = lease.chainLeaseId || lease.id;
    const depositAmount = Number(lease.securityDepositEth ?? lease.depositEth ?? 0);
    const annualAmount = Number(lease.annualRentEth ?? 0);
    const invoices = lease.invoices ?? [];
    const receipts = lease.receipts ?? [];
    const depositInvoiceId = `deposit-${lease.id}`;
    const depositInvoice = invoices.find((invoice) => invoice.id === depositInvoiceId);
    const depositReceipt = receipts.find((receipt) => receipt.invoiceId === depositInvoiceId);
    const depositPaid = depositAmount > 0 &&
        (Number(lease.depositBalanceEth ?? 0) >= depositAmount ||
            depositInvoice?.status === 'paid' ||
            Boolean(depositReceipt));
    const rentReceipt = receipts.find((receipt) => receipt.invoiceId !== depositInvoiceId);
    const annualPaid = annualAmount > 0 &&
        (invoices.some((invoice) => invoice.status === 'paid' && invoice.id !== depositInvoiceId) || Boolean(rentReceipt));
    const handleDeposit = async () => {
        if (!depositAmount)
            throw new Error('Deposit amount unavailable');
        await ensureNetwork(env);
        const txHash = await payDeposit(chainLeaseId, depositAmount.toString());
        await logDepositPayment(lease.id, { txHash, amountEth: depositAmount });
        pushNotice('success', 'Deposit paid');
        queryClient.invalidateQueries({ queryKey: ['lease', id] });
        queryClient.invalidateQueries({ queryKey: ['leases'] });
        return txHash;
    };
    const handleAnnual = async () => {
        if (!annualAmount)
            throw new Error('Annual rent unavailable');
        await ensureNetwork(env);
        const txHash = await payAnnual(chainLeaseId, annualAmount.toString());
        await logAnnualPayment(lease.id, { txHash, amountEth: annualAmount });
        pushNotice('success', 'Annual rent paid');
        queryClient.invalidateQueries({ queryKey: ['lease', id] });
        queryClient.invalidateQueries({ queryKey: ['leases'] });
        return txHash;
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "Payments", description: `Lease ${lease.id}` }), _jsxs(SectionCard, { children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl border border-outline bg-surface-1 p-4 shadow-soft space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-muted", children: "Deposit (ETH)" }), _jsx("p", { className: "text-2xl font-semibold text-foreground", children: depositAmount || '—' })] }), depositPaid ? (_jsxs("p", { className: "text-sm font-medium text-success", children: ["Deposit paid", depositReceipt?.paidAtISO ? ` on ${depositReceipt.paidAtISO.slice(0, 10)}` : ''] })) : isTenant ? (_jsx(TxButton, { label: "Pay deposit", onSend: handleDeposit, className: "w-full justify-center", disabled: depositPaid })) : (_jsx("p", { className: "text-sm text-muted", children: "Waiting for tenant payment" })), _jsx("p", { className: "text-xs text-muted", children: "Funds settle into the on-chain deposit ledger." })] }), _jsxs("div", { className: "rounded-2xl border border-outline bg-surface-1 p-4 shadow-soft space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-muted", children: "Annual rent (ETH)" }), _jsx("p", { className: "text-2xl font-semibold text-foreground", children: annualAmount || '—' })] }), annualPaid ? (_jsxs("p", { className: "text-sm font-medium text-success", children: ["Rent paid", rentReceipt?.paidAtISO ? ` on ${rentReceipt.paidAtISO.slice(0, 10)}` : ''] })) : isTenant ? (_jsx(TxButton, { label: "Pay annual rent", onSend: handleAnnual, className: "w-full justify-center", disabled: annualPaid })) : (_jsx("p", { className: "text-sm text-muted", children: "Waiting for tenant payment" })), _jsx("p", { className: "text-xs text-muted", children: "Covers 12 months upfront per lease terms." })] })] }), _jsxs("div", { className: "rounded-2xl border border-outline bg-surface-1 p-4 shadow-soft", children: [_jsx("p", { className: "text-sm text-muted", children: "Deposit balance" }), _jsx("p", { className: "text-lg font-semibold text-foreground", children: lease.depositBalanceEth ?? '0' })] })] }), _jsx(SectionCard, { title: "Payment history", description: "Receipts logged for this lease.", children: receipts.length ? (_jsx("ul", { className: "space-y-2 text-sm", children: [...receipts]
                        .sort((a, b) => (a.paidAtISO > b.paidAtISO ? -1 : 1))
                        .map((receipt) => (_jsxs("li", { className: "flex items-center justify-between rounded-xl border border-outline px-3 py-2", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-medium text-foreground", children: [Number(receipt.paidEth), " ETH"] }), _jsxs("p", { className: "text-xs text-muted", children: [receipt.paidAtISO?.slice(0, 10), " \u2022 ", receipt.invoiceId] })] }), _jsxs("span", { className: "text-xs font-mono text-muted", children: [receipt.txHash.slice(0, 8), "\u2026"] })] }, receipt.id))) })) : (_jsx("p", { className: "text-sm text-muted", children: "No receipts yet." })) })] }));
}
