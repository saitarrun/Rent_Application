import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import Dashboard from './pages/Dashboard';
import Create from './pages/Create';
import Agreements from './pages/Agreements';
import AgreementDetail from './pages/AgreementDetail';
import Settings from './pages/Settings';
import PropertyLedger from './pages/PropertyLedger';
import Listings from './pages/Listings';
import Applications from './pages/Applications';
import Payments from './pages/Payments';
import Repairs from './pages/Repairs';
import Browse from './pages/Browse';
import Properties from './pages/Properties';
import { useAppStore } from './store/useAppStore';
function AuthGuard({ children }) {
    const token = useAppStore((state) => state.token);
    if (!token) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
function RoleGuard({ role, children }) {
    const token = useAppStore((state) => state.token);
    const currentRole = useAppStore((state) => state.role);
    if (!token || currentRole !== role) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
const router = createBrowserRouter([
    {
        path: '/',
        element: _jsx(App, {}),
        children: [
            { index: true, element: _jsx(Dashboard, {}) },
            {
                path: 'create',
                element: (_jsx(RoleGuard, { role: "owner", children: _jsx(Create, {}) }))
            },
            {
                path: 'listings',
                element: (_jsx(RoleGuard, { role: "owner", children: _jsx(Listings, {}) }))
            },
            {
                path: 'properties',
                element: (_jsx(RoleGuard, { role: "owner", children: _jsx(Properties, {}) }))
            },
            {
                path: 'browse',
                element: (_jsx(RoleGuard, { role: "tenant", children: _jsx(Browse, {}) }))
            },
            { path: 'browse', element: _jsx(Browse, {}) },
            { path: 'applications', element: _jsx(Applications, {}) },
            { path: 'agreements', element: _jsx(Agreements, {}) },
            { path: 'agreements/:id', element: _jsx(AgreementDetail, {}) },
            {
                path: 'payments/:id',
                element: (_jsx(RoleGuard, { role: "tenant", children: _jsx(Payments, {}) }))
            },
            {
                path: 'repairs/:id',
                element: (_jsx(AuthGuard, { children: _jsx(Repairs, {}) }))
            },
            { path: 'settings', element: _jsx(Settings, {}) },
            {
                path: 'properties/:id/ledger',
                element: (_jsx(RoleGuard, { role: "owner", children: _jsx(PropertyLedger, {}) }))
            }
        ]
    },
    {
        path: '/login',
        element: _jsx(App, {})
    }
]);
export default router;
