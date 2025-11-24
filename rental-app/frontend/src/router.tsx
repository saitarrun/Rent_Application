import { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import Dashboard from './pages/Dashboard';
import Create from './pages/Create';
import Agreements from './pages/Agreements';
import AgreementDetail from './pages/AgreementDetail';
import Settings from './pages/Settings';
import PropertyLedger from './pages/PropertyLedger';
import Applications from './pages/Applications';
import Payments from './pages/Payments';
import Repairs from './pages/Repairs';
import PropertiesPage from './pages/PropertiesPage';
import NextSteps from './pages/NextSteps';
import { useAppStore } from './store/useAppStore';
import ErrorPage from './pages/ErrorPage';

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
    errorElement: <ErrorPage />,
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
      { path: 'explore', element: <PropertiesPage /> },
      { path: 'browse', element: <Navigate to="/explore" replace /> },
      { path: 'listings', element: <Navigate to="/explore" replace /> },
      { path: 'properties', element: <Navigate to="/explore?view=portfolio" replace /> },
      { path: 'applications', element: <Applications /> },
      { path: 'agreements', element: <Agreements /> },
      { path: 'agreements/:id', element: <AgreementDetail /> },
      { path: 'payments', element: <Navigate to="/agreements" replace /> },
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
      {
        path: 'next-steps/:id',
        element: (
          <AuthGuard>
            <NextSteps />
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
    element: <App />,
    errorElement: <ErrorPage />
  }
]);

export default router;
