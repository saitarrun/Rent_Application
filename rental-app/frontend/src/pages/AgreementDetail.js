import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const [tab, setTab] = useState('payments');
    const [form, setForm] = useState({ title: '', detail: '', priority: 'normal', category: 'general', preferredWindow: '' });
    const { data: lease, isLoading } = useQuery({
        queryKey: ['lease', id],
        queryFn: () => fetchLease(id),
        enabled: Boolean(id)
    });
    const repairMutation = useMutation({
        mutationFn: () => createRepair(id, form),
        onSuccess: () => {
            pushNotice('success', 'Repair submitted');
            setForm({ title: '', detail: '', priority: 'normal', category: 'general', preferredWindow: '' });
            queryClient.invalidateQueries({ queryKey: ['lease', id] });
            queryClient.invalidateQueries({ queryKey: ['leases'] });
        },
        onError: (err) => pushNotice('error', err.message || 'Unable to submit repair')
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
        mutationFn: () => signLease(id),
        onSuccess: () => {
            pushNotice('success', 'Lease signed');
            queryClient.invalidateQueries({ queryKey: ['lease', id] });
        },
        onError: (err) => pushNotice('error', err.message || 'Unable to sign lease')
    });
    if (isLoading || !lease)
        return _jsx("p", { children: "Loading\u2026" });
    const canTenantSign = role === 'tenant' && !lease.tenantSignedAt;
    const canOwnerSign = role === 'owner' && !lease.ownerSignedAt;
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-semibold", children: ["Lease ", lease.id.slice(0, 6)] }), _jsx("p", { className: "text-slate-500 text-sm", children: lease.property?.name })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => downloadLeasePdf(lease), className: "px-3 py-2 rounded border bg-white", children: "Download PDF" }), (canTenantSign || canOwnerSign) && (_jsx("button", { onClick: () => signMutation.mutate(), className: "px-3 py-2 rounded bg-slate-900 text-white", disabled: signMutation.isPending, children: signMutation.isPending ? 'Signing…' : 'Sign lease' }))] })] }), _jsxs("div", { className: "bg-white border rounded p-4 grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-slate-500", children: "Monthly rent (ETH)" }), _jsx("p", { className: "text-lg font-semibold", children: lease.monthlyRentEth })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-500", children: "Security deposit (ETH)" }), _jsx("p", { className: "text-lg font-semibold", children: lease.securityDepositEth })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-500", children: "Start / End" }), _jsxs("p", { className: "font-medium", children: [lease.startISO.slice(0, 10), " \u2192 ", lease.endISO.slice(0, 10)] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-500", children: "Tenant wallet" }), _jsx("p", { className: "font-mono text-xs", children: lease.tenantEth })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-500", children: "Status" }), _jsx("span", { className: "inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium capitalize", children: lease.status })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-500", children: "Tenant signature" }), _jsx("p", { className: "font-medium", children: lease.tenantSignedAt ? lease.tenantSignedAt.slice(0, 10) : 'Pending' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-500", children: "Owner signature" }), _jsx("p", { className: "font-medium", children: lease.ownerSignedAt ? lease.ownerSignedAt.slice(0, 10) : 'Pending' })] }), role === 'tenant' && (_jsxs("div", { className: "col-span-2 flex items-center justify-between border-t pt-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-slate-500 text-sm", children: "Autopay" }), _jsx("p", { className: "text-xs text-slate-500", children: "Enable reminders and one-click payments each cycle." })] }), _jsx("button", { className: `px-4 py-2 rounded ${lease.autopayEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`, onClick: () => autopayMutation.mutate(!lease.autopayEnabled), disabled: autopayMutation.isPending, children: lease.autopayEnabled ? 'On' : 'Off' })] }))] }), _jsxs("div", { children: [_jsx("div", { className: "flex gap-2 border-b", children: ['payments', 'repairs'].map((key) => (_jsx("button", { className: `px-4 py-2 text-sm font-medium ${tab === key ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500'}`, onClick: () => setTab(key), children: key === 'payments' ? 'Payments' : 'Repairs' }, key))) }), _jsx("div", { className: "bg-white border rounded-b p-4", children: tab === 'payments' ? (_jsx(PaymentsTable, { leaseId: lease.id, invoices: lease.invoices || [] })) : (_jsxs("div", { className: "space-y-4", children: [role === 'tenant' && (_jsxs("form", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", onSubmit: (e) => {
                                        e.preventDefault();
                                        repairMutation.mutate();
                                    }, children: [_jsx("input", { className: "border rounded px-3 py-2", placeholder: "Title", value: form.title, onChange: (e) => setForm((prev) => ({ ...prev, title: e.target.value })), required: true }), _jsx("input", { className: "border rounded px-3 py-2 md:col-span-2", placeholder: "Detail", value: form.detail, onChange: (e) => setForm((prev) => ({ ...prev, detail: e.target.value })), required: true }), _jsxs("select", { className: "border rounded px-3 py-2", value: form.category, onChange: (e) => setForm((prev) => ({ ...prev, category: e.target.value })), children: [_jsx("option", { value: "general", children: "General" }), _jsx("option", { value: "plumbing", children: "Plumbing" }), _jsx("option", { value: "electrical", children: "Electrical" }), _jsx("option", { value: "appliance", children: "Appliance" })] }), _jsxs("select", { className: "border rounded px-3 py-2", value: form.priority, onChange: (e) => setForm((prev) => ({ ...prev, priority: e.target.value })), children: [_jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "normal", children: "Normal" }), _jsx("option", { value: "high", children: "High" })] }), _jsx("input", { className: "border rounded px-3 py-2", placeholder: "Preferred window (optional)", value: form.preferredWindow, onChange: (e) => setForm((prev) => ({ ...prev, preferredWindow: e.target.value })) }), _jsx("button", { type: "submit", className: "bg-slate-900 text-white rounded px-4 py-2", disabled: repairMutation.isPending, children: "Open request" })] })), _jsx(RepairsTable, { leaseId: lease.id, repairs: lease.repairs || [] })] })) })] })] }));
}
