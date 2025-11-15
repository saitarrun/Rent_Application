import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLease, fetchRepairs, createRepair } from '../lib/api';
import RepairsTable from '../components/RepairsTable';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';
export default function Repairs() {
    const { id } = useParams();
    const role = useAppStore((state) => state.role);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const queryClient = useQueryClient();
    const { data: lease } = useQuery({ queryKey: ['lease', id], queryFn: () => fetchLease(id), enabled: Boolean(id) });
    const { data: repairs = [], isLoading } = useQuery({
        queryKey: ['repairs', id],
        queryFn: () => fetchRepairs(id),
        enabled: Boolean(id)
    });
    const [form, setForm] = useState({ title: '', detail: '', costEth: '' });
    const createMutation = useMutation({
        mutationFn: () => createRepair(id, { ...form, costEth: form.costEth ? Number(form.costEth) : undefined }),
        onSuccess: () => {
            pushNotice('success', 'Repair submitted');
            setForm({ title: '', detail: '', costEth: '' });
            queryClient.invalidateQueries({ queryKey: ['repairs', id] });
            queryClient.invalidateQueries({ queryKey: ['lease', id] });
        },
        onError: (err) => pushNotice('error', err.response?.data?.message || 'Unable to submit repair')
    });
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "Repairs", description: `Lease ${lease?.id || id}` }), role === 'owner' && (_jsx(SectionCard, { children: _jsxs("p", { className: "text-sm text-muted", children: ["Review tenant repair tickets below. Moving a request to ", _jsx("strong", { className: "text-foreground", children: "resolved" }), " or", ' ', _jsx("strong", { className: "text-foreground", children: "closed" }), " with a cost will automatically deduct from the tenant deposit balance."] }) })), role === 'tenant' && (_jsx(SectionCard, { title: "Submit a repair", children: _jsxs("form", { className: "space-y-3", onSubmit: (e) => {
                        e.preventDefault();
                        createMutation.mutate();
                    }, children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted", children: "Title" }), _jsx("input", { className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", value: form.title, onChange: (e) => setForm((prev) => ({ ...prev, title: e.target.value })), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted", children: "Detail" }), _jsx("textarea", { className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", value: form.detail, onChange: (e) => setForm((prev) => ({ ...prev, detail: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted", children: "Estimated cost (ETH)" }), _jsx("input", { className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", type: "number", step: "0.01", value: form.costEth, onChange: (e) => setForm((prev) => ({ ...prev, costEth: e.target.value })) })] }), _jsx(AnimatedButton, { type: "submit", disabled: createMutation.isPending, className: "w-full justify-center", children: createMutation.isPending ? 'Submitting…' : 'Submit repair' })] }) })), _jsx(SectionCard, { title: "History", children: isLoading ? _jsx("p", { className: "text-muted", children: "Loading repairs\u2026" }) : _jsx(RepairsTable, { leaseId: id, repairs: repairs }) })] }));
}
