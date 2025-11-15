import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { updateRepair } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
const options = ['open', 'in_progress', 'resolved', 'closed'];
export default function RepairsTable({ leaseId, repairs }) {
    const role = useAppStore((state) => state.role);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const queryClient = useQueryClient();
    const [costDrafts, setCostDrafts] = useState({});
    const mutation = useMutation({
        mutationFn: ({ id, status, costEth }) => updateRepair(id, costEth !== undefined ? { status, costEth } : { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repairs', leaseId] });
            queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
            pushNotice('success', 'Repair updated');
        },
        onError: (err) => pushNotice('error', err.message || 'Update failed')
    });
    const handleStatusChange = (repairId, status) => {
        const draft = costDrafts[repairId];
        const payload = { id: repairId, status };
        if (draft && draft.length) {
            const numeric = Number(draft);
            if (!Number.isNaN(numeric)) {
                payload.costEth = numeric;
            }
        }
        mutation.mutate(payload);
    };
    return (_jsxs("div", { className: "space-y-3", children: [repairs.map((repair) => (_jsx("div", { className: "flex flex-col gap-3 rounded-2xl border border-outline bg-surface-1 p-4 shadow-soft", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-base font-semibold text-foreground", children: repair.title }), repair.detail && _jsx("p", { className: "text-sm text-muted", children: repair.detail }), repair.costEth !== undefined && repair.costEth !== null && (_jsxs("p", { className: "text-xs text-muted", children: ["Cost est: ", repair.costEth, " ETH"] })), repair.deductedEth && (_jsxs("p", { className: "text-xs text-warning", children: ["Deposit deduction: ", repair.deductedEth, " ETH ", repair.deductedAt ? `on ${repair.deductedAt.slice(0, 10)}` : ''] }))] }), _jsx("div", { className: "flex items-center gap-2", children: role === 'owner' ? (_jsxs(_Fragment, { children: [_jsx("select", { className: "rounded-2xl border border-outline bg-surface-2 px-3 py-2 text-sm capitalize text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40", value: repair.status, onChange: (e) => handleStatusChange(repair.id, e.target.value), children: options.map((o) => (_jsx("option", { value: o, children: o.replace('_', ' ') }, o))) }), _jsx("input", { type: "number", step: "0.01", className: "w-28 rounded-2xl border border-outline bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40", placeholder: "Cost", value: costDrafts[repair.id] ?? '', onChange: (e) => setCostDrafts((prev) => ({ ...prev, [repair.id]: e.target.value })) })] })) : (_jsx("span", { className: "rounded-full bg-surface-3 px-3 py-1 text-sm capitalize text-foreground", children: repair.status })) })] }) }, repair.id))), !repairs.length && _jsx("p", { className: "text-sm text-muted", children: "No repairs yet." })] }));
}
