import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createProperty, fetchProperties, updateProperty } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';
export default function Properties() {
    const role = useAppStore((state) => state.role);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const queryClient = useQueryClient();
    const { data: properties = [], isLoading } = useQuery({
        queryKey: ['properties'],
        queryFn: fetchProperties,
        enabled: role === 'owner'
    });
    const [form, setForm] = useState({ name: '', address: '' });
    const [editingId, setEditingId] = useState(null);
    const mutation = useMutation({
        mutationFn: () => (editingId ? updateProperty(editingId, form) : createProperty(form)),
        onSuccess: () => {
            pushNotice('success', editingId ? 'Property updated' : 'Property created');
            setForm({ name: '', address: '' });
            setEditingId(null);
            queryClient.invalidateQueries({ queryKey: ['properties'] });
        },
        onError: (err) => pushNotice('error', err.response?.data?.message || 'Unable to save property')
    });
    const startEdit = (property) => {
        setEditingId(property.id);
        setForm({ name: property.name, address: property.address });
    };
    const handleSubmit = (event) => {
        event.preventDefault();
        if (!form.name || !form.address)
            return;
        mutation.mutate();
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "Properties", description: "Create and maintain the assets you can attach to leases and listings." }), _jsx(SectionCard, { title: editingId ? 'Edit property' : 'Add property', children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-3", children: [_jsxs("label", { className: "block text-sm text-muted", children: ["Name", _jsx("input", { className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", value: form.name, onChange: (e) => setForm((prev) => ({ ...prev, name: e.target.value })), required: true })] }), _jsxs("label", { className: "block text-sm text-muted", children: ["Address", _jsx("input", { className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", value: form.address, onChange: (e) => setForm((prev) => ({ ...prev, address: e.target.value })), required: true })] }), _jsx("div", { className: "flex justify-end", children: _jsx(AnimatedButton, { type: "submit", disabled: mutation.isPending, children: mutation.isPending ? 'Saving…' : editingId ? 'Update property' : 'Create property' }) })] }) }), _jsx(SectionCard, { title: "Portfolio", children: isLoading ? (_jsx("p", { className: "p-4 text-sm text-muted", children: "Loading properties\u2026" })) : (_jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-muted", children: [_jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "Name" }), _jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "Address" }), _jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "Actions" })] }) }), _jsxs("tbody", { children: [properties.map((property) => (_jsxs("tr", { className: "border-t border-outline/40", children: [_jsx("td", { className: "p-3 font-medium text-foreground", children: property.name }), _jsx("td", { className: "p-3 text-muted", children: property.address }), _jsxs("td", { className: "p-3 flex flex-wrap gap-3", children: [_jsx(Link, { to: `/properties/${property.id}/ledger`, className: "text-sm font-semibold text-brand hover:text-brand-hover", children: "Ledger" }), _jsx("button", { className: "text-sm text-muted hover:text-foreground", onClick: () => startEdit(property), children: "Edit" })] })] }, property.id))), !properties.length && (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "p-4 text-center text-muted", children: "No properties yet." }) }))] })] })) })] }));
}
