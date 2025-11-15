import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
const ownerLinks = [
    { label: 'Dashboard', path: '/' },
    { label: 'Properties', path: '/properties' },
    { label: 'Listings', path: '/listings' },
    { label: 'Applications', path: '/applications' },
    { label: 'Agreements', path: '/agreements' },
    { label: 'Settings', path: '/settings' }
];
const tenantLinks = [
    { label: 'Dashboard', path: '/' },
    { label: 'Browse', path: '/browse' },
    { label: 'Applications', path: '/applications' },
    { label: 'Agreements', path: '/agreements' },
    { label: 'Settings', path: '/settings' }
];
function useNavLinks(role) {
    if (role === 'owner')
        return ownerLinks;
    if (role === 'tenant')
        return tenantLinks;
    return [];
}
export default function Navbar() {
    const token = useAppStore((state) => state.token);
    const role = useAppStore((state) => state.role);
    const environment = useAppStore((state) => state.environment);
    const setEnvironment = useAppStore((state) => state.setEnvironment);
    const logout = useAppStore((state) => state.logout);
    const location = useLocation();
    if (!token)
        return null;
    const links = useNavLinks(role);
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        logout();
    };
    const toggleEnvironment = () => {
        setEnvironment(environment === 'local' ? 'sepolia' : 'local');
    };
    const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Guest';
    return (_jsx("header", { className: "bg-surface-1/80 border-b border-outline shadow-soft backdrop-blur supports-[backdrop-filter]:bg-surface-1/70", children: _jsxs("div", { className: "container flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-lg font-semibold text-foreground", children: "Rental Suite" }), _jsx("p", { className: "text-xs text-muted", children: "Owner & tenant control center" })] }), _jsx("span", { className: "px-2 py-1 text-xs font-semibold rounded-full bg-brand/20 text-brand", children: roleLabel }), _jsx("button", { type: "button", onClick: toggleEnvironment, className: "px-3 py-1.5 text-xs font-semibold rounded-full border border-outline text-muted hover:bg-surface-2 transition", children: environment === 'local' ? 'Ganache' : 'Sepolia' })] }), _jsxs("nav", { className: "flex flex-wrap items-center gap-2 text-sm", children: [links.map((link) => {
                            const active = location.pathname === link.path;
                            return (_jsx(Link, { to: link.path, className: `px-3 py-1.5 rounded-xl transition ${active ? 'bg-brand text-brand-fg shadow-ring' : 'text-muted hover:bg-surface-2'}`, children: link.label }, link.path));
                        }), _jsx("button", { onClick: handleLogout, className: "px-3 py-1.5 rounded-xl text-muted hover:text-danger transition-colors", type: "button", children: "Logout" })] })] }) }));
}
