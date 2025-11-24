import { Link, useLocation } from 'react-router-dom';
import { useAppStore, type Environment } from '../store/useAppStore';
import { WalletStatus } from './WalletStatus';

type NavLinkItem = { label: string; path: string };

const ownerLinks: NavLinkItem[] = [
  { label: 'Overview', path: '/' },
  { label: 'Portfolio', path: '/explore?view=portfolio' },
  { label: 'Listings', path: '/explore' },
  { label: 'Applications', path: '/applications' },
  { label: 'Agreements', path: '/agreements' },
  { label: 'Settings', path: '/settings' }
];

const tenantLinks: NavLinkItem[] = [
  { label: 'Overview', path: '/' },
  { label: 'Listings', path: '/explore' },
  { label: 'Applications', path: '/applications' },
  { label: 'Agreements', path: '/agreements' },
  { label: 'Settings', path: '/settings' }
];

const envOptions: Array<{ value: Environment; label: string; helper: string }> = [
  { value: 'local', label: 'Ganache', helper: 'Local chain' },
  { value: 'sepolia', label: 'Sepolia', helper: 'Testnet' }
];

function EnvironmentToggle() {
  const environment = useAppStore((state) => state.environment);
  const setEnvironment = useAppStore((state) => state.setEnvironment);

  return (
    <div className="flex items-center rounded-full border border-outline/60 bg-white/70 p-1 text-xs shadow-[0_10px_30px_rgba(11,36,71,0.08)]">
      {envOptions.map((option) => {
        const active = environment === option.value;
        return (
          <button
            type="button"
            key={option.value}
            onClick={() => setEnvironment(option.value)}
            className={`flex flex-col rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              active ? 'bg-brand text-brand-fg shadow-[0_8px_20px_rgba(24,115,240,0.35)]' : 'text-muted hover:text-foreground'
            }`}
          >
            <span>{option.label}</span>
            <span className="text-[10px] font-normal uppercase tracking-[0.2em]">{option.helper}</span>
          </button>
        );
      })}
    </div>
  );
}

function useNavLinks(role: 'owner' | 'tenant' | null) {
  if (role === 'owner') return ownerLinks;
  if (role === 'tenant') return tenantLinks;
  return [];
}

export default function Navbar() {
  const token = useAppStore((state) => state.token);
  const role = useAppStore((state) => state.role);
  const logout = useAppStore((state) => state.logout);
  const location = useLocation();

  if (!token) return null;

  const links = useNavLinks(role);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    logout();
  };

  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Guest';

  const isActive = (target: string) => {
    const [targetPath, query] = target.split('?');
    if (location.pathname !== targetPath) return false;
    if (!query) return true;
    return location.search === `?${query}`;
  };

  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-white/80 shadow-[0_8px_30px_rgba(11,36,71,0.08)] backdrop-blur-lg">
      <div className="container flex flex-col gap-3 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-3xl bg-brand-subtle/70 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand">Rental Suite</p>
              <p className="text-xs text-muted">On-chain operations desk</p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              {roleLabel}
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <EnvironmentToggle />
            <WalletStatus />
            <button
              onClick={handleLogout}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted transition hover:text-danger"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {links.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`rounded-full px-4 py-2 transition ${
                    active
                      ? 'bg-brand/10 text-brand shadow-[inset_0_0_0_1px_rgba(24,115,240,0.35)]'
                      : 'text-muted hover:text-foreground hover:bg-surface-2'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
