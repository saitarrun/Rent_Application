import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateRepair } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
const options = ['open', 'in_progress', 'resolved', 'closed'];
export default function RepairsTable({ leaseId, repairs }) {
    const role = useAppStore((state) => state.user?.role);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: ({ id, data }) => updateRepair(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
            pushNotice('success', 'Repair updated');
        },
        onError: (err) => pushNotice('error', err.message || 'Update failed')
    });
    const handleSchedule = (repair) => {
        const scheduledAt = window.prompt('Schedule visit (e.g., 2024-07-01 10:00)');
        if (scheduledAt) {
            mutation.mutate({ id: repair.id, data: { scheduledAt } });
        }
    };
    return (_jsxs("div", { className: "space-y-2", children: [repairs.map((repair) => (_jsx("div", { className: "border rounded p-3 bg-white space-y-2", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: repair.title }), _jsx("p", { className: "text-sm text-slate-500", children: repair.detail }), _jsxs("p", { className: "text-xs text-slate-400", children: ["Category: ", repair.category] }), repair.preferredWindow && _jsxs("p", { className: "text-xs text-slate-400", children: ["Preferred: ", repair.preferredWindow] }), repair.scheduledAt && _jsxs("p", { className: "text-xs text-emerald-600", children: ["Scheduled: ", repair.scheduledAt] })] }), _jsx("div", { className: "flex items-center gap-2", children: role === 'owner' ? (_jsxs(_Fragment, { children: [_jsx("select", { className: "border rounded px-2 py-1", value: repair.status, onChange: (e) => mutation.mutate({ id: repair.id, data: { status: e.target.value } }), children: options.map((o) => (_jsx("option", { value: o, children: o.replace('_', ' ') }, o))) }), _jsx("button", { className: "text-sm text-slate-900", onClick: () => handleSchedule(repair), children: "Schedule" })] })) : (_jsx("span", { className: "px-2 py-1 rounded bg-slate-100 text-sm", children: repair.status })) })] }) }, repair.id))), !repairs.length && _jsx("p", { className: "text-sm text-slate-500", children: "No repairs yet." })] }));
}
