import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './components/Navbar';
import { requestNonce, verifyWallet } from './lib/api';
import { useAppStore } from './store/useAppStore';
const roles = ['owner', 'tenant'];
export default function App() {
    const token = useAppStore((state) => state.token);
    const notices = useAppStore((state) => state.notices);
    const dismiss = useAppStore((state) => state.dismissNotice);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('owner');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const handleWalletLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const provider = window.ethereum;
            if (!provider)
                throw new Error('MetaMask is required');
            if (role === 'owner' && !email)
                throw new Error('Owner email is required');
            const [account] = await provider.request({ method: 'eth_requestAccounts' });
            const noncePayload = await requestNonce({ address: account, role, email: email || undefined });
            const message = `Rental Portal login\nRole: ${noncePayload.role}\nNonce: ${noncePayload.nonce}`;
            const signature = await provider.request({
                method: 'personal_sign',
                params: [message, account]
            });
            await verifyWallet({ address: account, signature });
            useAppStore.getState().pushNotice('success', `Welcome back, ${noncePayload.role}`);
        }
        catch (err) {
            setError(err?.message || 'Wallet login failed');
        }
        finally {
            setLoading(false);
        }
    };
    if (!token) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-100 px-4", children: _jsxs("div", { className: "bg-white shadow rounded-lg p-8 w-full max-w-lg space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Connect your wallet" }), _jsx("p", { className: "text-sm text-slate-500", children: "Owners and tenants sign in with MetaMask. Owners can manage every property; tenants see only leases assigned to their wallet." })] }), _jsx("div", { className: "flex gap-2 text-sm", children: roles.map((r) => (_jsx("button", { onClick: () => setRole(r), className: `flex-1 border rounded px-3 py-2 capitalize ${role === r ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`, type: "button", children: r }, r))) }), _jsxs("label", { className: "block text-sm font-medium text-slate-600", children: ["Email (used for notices)", _jsx("input", { className: "mt-1 w-full border rounded px-3 py-2", value: email, onChange: (e) => setEmail(e.target.value), type: "email", placeholder: role === 'owner' ? 'owner@example.com' : 'optional for tenants', required: role === 'owner' })] }), error && _jsx("p", { className: "text-sm text-red-600", children: error }), _jsx("button", { className: "w-full bg-slate-900 text-white py-2 rounded disabled:opacity-50", type: "button", onClick: handleWalletLogin, disabled: loading, children: loading ? 'Waiting for signature…' : 'Connect wallet & sign' })] }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-slate-50", children: [_jsx(Navbar, {}), _jsx("main", { className: "max-w-6xl mx-auto px-4 py-6", children: _jsx(Outlet, {}) }), _jsx("div", { className: "fixed bottom-4 right-4 space-y-2", children: notices.map((notice) => (_jsxs("div", { className: "bg-white border rounded shadow px-4 py-3 flex items-center gap-3", children: [_jsx("span", { className: "font-semibold text-sm capitalize", children: notice.type }), _jsx("p", { className: "text-sm", children: notice.message }), _jsx("button", { onClick: () => dismiss(notice.id), className: "text-slate-400 hover:text-slate-600", children: "\u00D7" })] }, notice.id))) })] }));
}
