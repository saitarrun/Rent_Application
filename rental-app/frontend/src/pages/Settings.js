import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';
export default function Settings() {
    const environment = useAppStore((state) => state.environment);
    const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
    const [form, setForm] = useState(null);
    useEffect(() => {
        if (profile)
            setForm(profile);
    }, [profile]);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const mutation = useMutation({
        mutationFn: () => updateProfile(form),
        onSuccess: () => pushNotice('success', 'Profile updated'),
        onError: (err) => pushNotice('error', err.message || 'Update failed')
    });
    if (!form)
        return _jsx("p", { className: "text-muted", children: "Loading\u2026" });
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "Settings", description: "Portfolio defaults and environment targeting." }), _jsxs(SectionCard, { title: "Portfolio profile", children: [_jsxs("label", { className: "block text-sm text-muted", children: ["Portfolio name", _jsx("input", { className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) })] }), _jsxs("label", { className: "block text-sm text-muted", children: ["Contact", _jsx("input", { className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", value: form.contact, onChange: (e) => setForm({ ...form, contact: e.target.value }) })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("label", { className: "text-sm text-muted", children: ["Grace days", _jsx("input", { type: "number", className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", value: form.graceDays, onChange: (e) => setForm({ ...form, graceDays: Number(e.target.value) }) })] }), _jsxs("label", { className: "text-sm text-muted", children: ["Late fee type", _jsxs("select", { className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", value: form.lateFeeType, onChange: (e) => setForm({ ...form, lateFeeType: e.target.value }), children: [_jsx("option", { value: "fixed", children: "Fixed" }), _jsx("option", { value: "percent", children: "Percent" })] })] }), _jsxs("label", { className: "text-sm text-muted", children: ["Late fee value (ETH or %)", _jsx("input", { className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", value: form.lateFeeValue, onChange: (e) => setForm({ ...form, lateFeeValue: e.target.value }) })] })] }), _jsx(AnimatedButton, { onClick: () => mutation.mutate(), disabled: mutation.isPending, children: mutation.isPending ? 'Saving…' : 'Save profile' })] }), _jsx(SectionCard, { title: "Environment", description: "Use the navbar toggle to switch between local and Sepolia networks.", children: _jsxs("p", { className: "text-sm text-muted", children: ["Currently targeting ", environment === 'local' ? 'Local (Ganache 1337)' : 'Sepolia (11155111)', "."] }) })] }));
}
