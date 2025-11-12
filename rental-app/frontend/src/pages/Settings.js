import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
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
        return _jsx("p", { children: "Loading\u2026" });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Settings" }), _jsx("p", { className: "text-sm text-slate-500", children: "Profile, notifications, and network target." })] }), _jsxs("div", { className: "bg-white border rounded p-4 space-y-4", children: [_jsxs("label", { className: "block text-sm text-slate-600", children: ["Portfolio name", _jsx("input", { className: "mt-1 w-full border rounded px-3 py-2", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) })] }), _jsxs("label", { className: "block text-sm text-slate-600", children: ["Contact", _jsx("input", { className: "mt-1 w-full border rounded px-3 py-2", value: form.contact, onChange: (e) => setForm({ ...form, contact: e.target.value }) })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "text-sm text-slate-600", children: ["Grace days", _jsx("input", { type: "number", className: "mt-1 w-full border rounded px-3 py-2", value: form.graceDays, onChange: (e) => setForm({ ...form, graceDays: Number(e.target.value) }) })] }), _jsxs("label", { className: "text-sm text-slate-600", children: ["Late fee type", _jsxs("select", { className: "mt-1 w-full border rounded px-3 py-2", value: form.lateFeeType, onChange: (e) => setForm({ ...form, lateFeeType: e.target.value }), children: [_jsx("option", { value: "fixed", children: "Fixed" }), _jsx("option", { value: "percent", children: "Percent" })] })] }), _jsxs("label", { className: "text-sm text-slate-600", children: ["Late fee value (ETH or %)", _jsx("input", { className: "mt-1 w-full border rounded px-3 py-2", value: form.lateFeeValue, onChange: (e) => setForm({ ...form, lateFeeValue: e.target.value }) })] })] }), _jsx("button", { onClick: () => mutation.mutate(), className: "px-4 py-2 bg-slate-900 text-white rounded", disabled: mutation.isPending, children: "Save profile" })] }), _jsxs("div", { className: "bg-white border rounded p-4", children: [_jsx("p", { className: "font-semibold", children: "Environment" }), _jsxs("p", { className: "text-sm text-slate-500", children: ["Currently targeting ", environment === 'local' ? 'Local (Ganache 1337)' : 'Sepolia (11155111)', ". Use the toggle in the navbar to switch and MetaMask will follow."] })] })] }));
}
