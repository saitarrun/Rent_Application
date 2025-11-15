import { ReactNode } from 'react';
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

function AuthGuard({ children }: { children: ReactNode }) {
  const token = useAppStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RoleGuard({ role, children }: { role: 'owner' | 'tenant'; children: ReactNode }) {
  const token = useAppStore((state) => state.token);
  const currentRole = useAppStore((state) => state.role);
  if (!token || currentRole !== role) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: 'create',
        element: (
          <RoleGuard role="owner">
            <Create />
          </RoleGuard>
        )
      },
      {
        path: 'listings',
        element: (
          <RoleGuard role="owner">
            <Listings />
          </RoleGuard>
        )
      },
      {
        path: 'properties',
        element: (
          <RoleGuard role="owner">
            <Properties />
          </RoleGuard>
        )
      },
      {
        path: 'browse',
        element: (
          <RoleGuard role="tenant">
            <Browse />
          </RoleGuard>
        )
      },
      { path: 'browse', element: <Browse /> },
      { path: 'applications', element: <Applications /> },
      { path: 'agreements', element: <Agreements /> },
      { path: 'agreements/:id', element: <AgreementDetail /> },
      {
        path: 'payments/:id',
        element: (
          <RoleGuard role="tenant">
            <Payments />
          </RoleGuard>
        )
      },
      {
        path: 'repairs/:id',
        element: (
          <AuthGuard>
            <Repairs />
          </AuthGuard>
        )
      },
      { path: 'settings', element: <Settings /> },
      {
        path: 'properties/:id/ledger',
        element: (
          <RoleGuard role="owner">
            <PropertyLedger />
          </RoleGuard>
        )
      }
    ]
  },
  {
    path: '/login',
    element: <App />
  }
]);

export default router;
