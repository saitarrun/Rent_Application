import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import { requestNonce, verifyWallet } from './lib/api';
import { useAppStore } from './store/useAppStore';
import { Toaster } from 'react-hot-toast';
import { NetworkGuard } from './components/NetworkGuard';
import { AnimatedButton } from './components/AnimatedButton';
const roles = ['owner', 'tenant'];
export default function App() {
    const token = useAppStore((state) => state.token);
    const setTokenState = useAppStore((state) => state.setToken);
    const setRoleState = useAppStore((state) => state.setRole);
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
            const resp = await verifyWallet({ address: account, signature });
            const { setToken, setRole } = useAppStore.getState();
            const resolvedRole = resp.user?.role === 'owner' || resp.user?.role === 'tenant' ? resp.user.role : role;
            localStorage.setItem('token', resp.token);
            localStorage.setItem('role', resolvedRole);
            setToken(resp.token);
            setRole(resolvedRole);
            useAppStore.getState().pushNotice('success', `Welcome back, ${noncePayload.role}`);
        }
        catch (err) {
            setError(err?.message || 'Wallet login failed');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedRole = localStorage.getItem('role');
        if (storedToken) {
            setTokenState(storedToken);
        }
        if (storedRole === 'owner' || storedRole === 'tenant') {
            setRoleState(storedRole);
        }
    }, [setRoleState, setTokenState]);
    if (!token) {
        return (_jsx("div", { className: "min-h-dvh bg-background text-foreground flex items-center justify-center px-4", children: _jsxs("div", { className: "bg-surface-2 border border-outline rounded-2xl shadow-soft p-8 w-full max-w-lg space-y-6", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted", children: "Rental Suite" }), _jsx("h1", { className: "text-2xl font-display tracking-tight", children: "Connect your wallet" }), _jsx("p", { className: "text-sm text-muted", children: "Owners approve listings and leases. Tenants can only view their assigned properties and pay rent." })] }), _jsx("div", { className: "grid grid-cols-2 gap-2 text-sm", children: roles.map((r) => {
                            const active = role === r;
                            return (_jsx("button", { onClick: () => setRole(r), className: `rounded-xl border px-3 py-2 capitalize transition ${active ? 'bg-brand text-brand-fg border-transparent shadow-ring' : 'bg-surface-1 text-muted hover:bg-surface-3'}`, type: "button", children: r }, r));
                        }) }), _jsxs("label", { className: "block text-sm font-medium text-muted space-y-2", children: [_jsx("span", { children: "Email (used for notices)" }), _jsx("input", { className: "w-full border border-outline rounded-2xl bg-surface-1 px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60", value: email, onChange: (e) => setEmail(e.target.value), type: "email", placeholder: role === 'owner' ? 'owner@example.com' : 'optional for tenants', required: role === 'owner' })] }), error && _jsx("p", { className: "text-sm text-danger", children: error }), _jsx(AnimatedButton, { type: "button", onClick: handleWalletLogin, disabled: loading, className: "w-full justify-center", children: loading ? 'Waiting for signature…' : 'Connect wallet & sign' })] }) }));
    }
    return (_jsxs("div", { className: "min-h-dvh bg-background text-foreground", children: [_jsx(Toaster, { position: "top-right" }), _jsx(NetworkGuard, {}), _jsx(Navbar, {}), _jsx("main", { className: "container py-10", children: _jsx(Outlet, {}) }), _jsx("div", { className: "fixed bottom-4 right-4 space-y-2", children: notices.map((notice) => (_jsxs("div", { className: "bg-surface-2 border border-outline rounded-2xl shadow-soft px-4 py-3 flex items-center gap-3 animate-slideUp", children: [_jsx("span", { className: "font-semibold text-sm capitalize", children: notice.type }), _jsx("p", { className: "text-sm text-muted", children: notice.message }), _jsx("button", { onClick: () => dismiss(notice.id), className: "text-muted hover:text-foreground", "aria-label": "Dismiss notification", children: "\u00D7" })] }, notice.id))) })] }));
}
