import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { ensureNetwork } from '../lib/eth';
export default function Navbar() {
    const user = useAppStore((state) => state.user);
    const wallet = useAppStore((state) => state.wallet);
    const environment = useAppStore((state) => state.environment);
    const setEnvironment = useAppStore((state) => state.setEnvironment);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const logout = useAppStore((state) => state.logout);
    if (!user)
        return null;
    const links = [
        { to: '/', label: 'Dashboard' },
        { to: '/listings', label: user.role === 'owner' ? 'Listings' : 'Browse' },
        { to: '/applications', label: 'Applications' },
        { to: '/agreements', label: 'Agreements' },
        { to: '/settings', label: 'Settings' }
    ];
    if (user.role === 'owner') {
        links.splice(4, 0, { to: '/create', label: 'Create lease' });
    }
    const handleEnvChange = async (value) => {
        setEnvironment(value);
        try {
            await ensureNetwork(value);
            pushNotice('success', `${value === 'local' ? 'Local' : 'Sepolia'} wallet ready`);
        }
        catch (err) {
            pushNotice('error', err.message || 'Wallet switch failed');
        }
    };
    return (_jsx("header", { className: "bg-white border-b", children: _jsxs("div", { className: "max-w-6xl mx-auto flex items-center justify-between px-4 py-4", children: [_jsxs("div", { className: "flex items-center gap-6", children: [_jsx("span", { className: "font-semibold", children: "Rental Portal" }), _jsx("nav", { className: "flex items-center gap-4 text-sm", children: links.map((link) => (_jsx(NavLink, { to: link.to, className: ({ isActive }) => `px-2 py-1 rounded ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`, children: link.label }, link.to))) })] }), _jsxs("div", { className: "flex items-center gap-3 text-sm", children: [_jsx("span", { className: "text-slate-500 capitalize", children: user.role }), wallet && _jsxs("span", { className: "font-mono text-xs hidden md:inline", children: [wallet.slice(0, 6), "\u2026", wallet.slice(-4)] }), _jsx("button", { onClick: () => handleEnvChange('local'), className: `px-3 py-1 rounded border ${environment === 'local' ? 'bg-slate-900 text-white' : 'text-slate-600'}`, children: "Local" }), _jsx("button", { onClick: () => handleEnvChange('sepolia'), className: `px-3 py-1 rounded border ${environment === 'sepolia' ? 'bg-slate-900 text-white' : 'text-slate-600'}`, children: "Sepolia" }), _jsx("button", { onClick: logout, className: "px-3 py-1 rounded border border-slate-200 text-slate-600", children: "Sign out" })] })] }) }));
}
