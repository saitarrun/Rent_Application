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

function useNavLinks(role: 'owner' | 'tenant' | null) {
  if (role === 'owner') return ownerLinks;
  if (role === 'tenant') return tenantLinks;
  return [];
}

export default function Navbar() {
  const token = useAppStore((state) => state.token);
  const role = useAppStore((state) => state.role);
  const environment = useAppStore((state) => state.environment);
  const setEnvironment = useAppStore((state) => state.setEnvironment);
  const logout = useAppStore((state) => state.logout);
  const location = useLocation();

  if (!token) return null;

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

  return (
    <header className="bg-surface-1/80 border-b border-outline shadow-soft backdrop-blur supports-[backdrop-filter]:bg-surface-1/70">
      <div className="container flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">Rental Suite</p>
            <p className="text-xs text-muted">Owner & tenant control center</p>
          </div>
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-brand/20 text-brand">{roleLabel}</span>
          <button
            type="button"
            onClick={toggleEnvironment}
            className="px-3 py-1.5 text-xs font-semibold rounded-full border border-outline text-muted hover:bg-surface-2 transition"
          >
            {environment === 'local' ? 'Ganache' : 'Sepolia'}
          </button>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          {links.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 rounded-xl transition ${
                  active ? 'bg-brand text-brand-fg shadow-ring' : 'text-muted hover:bg-surface-2'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button onClick={handleLogout} className="px-3 py-1.5 rounded-xl text-muted hover:text-danger transition-colors" type="button">
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
