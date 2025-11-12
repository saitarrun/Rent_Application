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
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'create', element: <Create /> },
      { path: 'listings', element: <Listings /> },
      { path: 'applications', element: <Applications /> },
      { path: 'agreements', element: <Agreements /> },
      { path: 'agreements/:id', element: <AgreementDetail /> },
      { path: 'settings', element: <Settings /> },
      { path: 'properties/:id/ledger', element: <PropertyLedger /> }
    ]
  }
]);

export default router;
