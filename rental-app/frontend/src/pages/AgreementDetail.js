import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
    const [tab, setTab] = useState('payments');
    const { data: lease, isLoading } = useQuery({
        queryKey: ['lease', id],
        queryFn: () => fetchLease(id),
        enabled: Boolean(id)
    });
    const autopayMutation = useMutation({
        mutationFn: (autopay) => toggleAutopay(id, autopay),
        onSuccess: () => {
            pushNotice('success', 'Autopay preference saved');
            queryClient.invalidateQueries({ queryKey: ['lease', id] });
            queryClient.invalidateQueries({ queryKey: ['leases'] });
        },
        onError: (err) => pushNotice('error', err.response?.data?.message || 'Unable to update autopay')
    });
    const signMutation = useMutation({
        mutationFn: async () => {
            if (role === 'tenant') {
                if (!wallet)
                    throw new Error('Wallet not connected');
                await ensureNetwork(environment);
                const provider = window.ethereum;
                const message = `Lease:${id}`;
                const signature = await provider.request({
                    method: 'personal_sign',
                    params: [message, wallet]
                });
                await signLease(id, signature);
            }
            else {
                await signLease(id);
            }
        },
        onSuccess: () => {
            pushNotice('success', 'Lease signed');
            queryClient.invalidateQueries({ queryKey: ['lease', id] });
            queryClient.invalidateQueries({ queryKey: ['leases'] });
        },
        onError: (err) => pushNotice('error', err.message || 'Unable to sign lease')
    });
    if (isLoading || !lease)
        return _jsx("p", { className: "text-muted", children: "Loading\u2026" });
    const canTenantSign = role === 'tenant' && !lease.tenantSignedAt;
    const canOwnerSign = false; // owner signing happens off-chain only
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: `Lease ${lease.id.slice(0, 6)}`, description: lease.property?.name || 'Lease overview', actions: _jsxs(_Fragment, { children: [_jsx("button", { onClick: () => downloadLeasePdf(lease), className: "rounded-2xl border border-outline px-4 py-2 text-sm text-foreground hover:bg-surface-1 transition", type: "button", children: "Download PDF" }), canTenantSign && (_jsx(AnimatedButton, { onClick: () => signMutation.mutate(), disabled: signMutation.isPending, className: "text-sm", children: signMutation.isPending ? 'Signing…' : 'Sign lease' }))] }) }), _jsx(SectionCard, { children: _jsxs("div", { className: "grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted", children: "Monthly rent (ETH)" }), _jsx("p", { className: "text-lg font-semibold text-foreground", children: lease.monthlyRentEth })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted", children: "Security deposit (ETH)" }), _jsx("p", { className: "text-lg font-semibold text-foreground", children: lease.securityDepositEth })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted", children: "Deposit balance" }), _jsx("p", { className: "text-lg font-semibold text-foreground", children: lease.depositBalanceEth ?? '0' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted", children: "Start / End" }), _jsxs("p", { className: "font-medium text-foreground", children: [lease.startISO.slice(0, 10), " \u2192 ", lease.endISO.slice(0, 10)] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted", children: "Tenant wallet" }), _jsx("p", { className: "font-mono text-xs text-foreground break-all", children: lease.tenantEth })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted", children: "Status" }), _jsx("span", { className: "inline-flex items-center rounded-full bg-surface-3 px-3 py-1 text-xs font-semibold capitalize text-foreground", children: lease.status })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted", children: "Tenant signature" }), _jsx("p", { className: "font-medium text-foreground", children: lease.tenantSignedAt ? lease.tenantSignedAt.slice(0, 10) : 'Pending' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted", children: "Owner signature" }), _jsx("p", { className: "font-medium text-foreground", children: lease.ownerSignedAt ? lease.ownerSignedAt.slice(0, 10) : 'Pending' })] }), role === 'tenant' && (_jsxs("div", { className: "col-span-full flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-outline bg-surface-1 p-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-muted", children: "Autopay" }), _jsx("p", { className: "text-xs text-muted", children: "Enable reminders and one-click payments each cycle." })] }), _jsx("button", { className: `rounded-2xl px-4 py-2 text-sm font-semibold ${lease.autopayEnabled ? 'bg-success/20 text-success' : 'bg-surface-3 text-muted'}`, onClick: () => autopayMutation.mutate(!lease.autopayEnabled), disabled: autopayMutation.isPending, type: "button", children: lease.autopayEnabled ? 'On' : 'Off' })] }))] }) }), _jsxs(SectionCard, { children: [_jsx("div", { className: "flex gap-2 rounded-2xl bg-surface-1 p-1", children: ['payments', 'repairs'].map((key) => {
                            const active = tab === key;
                            return (_jsx("button", { className: `flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${active ? 'bg-surface-2 text-foreground shadow-soft' : 'text-muted hover:text-foreground'}`, onClick: () => setTab(key), type: "button", children: key === 'payments' ? 'Payments' : 'Repairs' }, key));
                        }) }), _jsx("div", { className: "mt-4", children: tab === 'payments' ? (_jsx(PaymentsTable, { leaseId: lease.id, invoices: lease.invoices || [] })) : (_jsx(RepairsTable, { leaseId: lease.id, repairs: lease.repairs || [] })) })] })] }));
}
