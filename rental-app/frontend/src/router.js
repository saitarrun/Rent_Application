import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Dashboard from './pages/Dashboard';
import Create from './pages/Create';
import Agreements from './pages/Agreements';
import AgreementDetail from './pages/AgreementDetail';
import Settings from './pages/Settings';
import PropertyLedger from './pages/PropertyLedger';
import Listings from './pages/Listings';
import Applications from './pages/Applications';
const router = createBrowserRouter([
    {
        path: '/',
        element: _jsx(App, {}),
        children: [
            { index: true, element: _jsx(Dashboard, {}) },
            { path: 'create', element: _jsx(Create, {}) },
            { path: 'listings', element: _jsx(Listings, {}) },
            { path: 'applications', element: _jsx(Applications, {}) },
            { path: 'agreements', element: _jsx(Agreements, {}) },
            { path: 'agreements/:id', element: _jsx(AgreementDetail, {}) },
            { path: 'settings', element: _jsx(Settings, {}) },
            { path: 'properties/:id/ledger', element: _jsx(PropertyLedger, {}) }
        ]
    }
]);
export default router;
