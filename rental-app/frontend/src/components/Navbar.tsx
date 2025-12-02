import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore, type Environment } from '../store/useAppStore';
import { WalletStatus } from './WalletStatus';
import { fetchLeases } from '../lib/api';

type NavLinkItem = { label: string; path: string };

const ownerLinks: NavLinkItem[] = [
  { label: 'Overview', path: '/' },
  { label: 'Portfolio', path: '/explore?view=portfolio' },
  { label: 'Agreements', path: '/agreements' },
  { label: 'Applications', path: '/applications' },
  { label: 'Payments', path: '/payments' },
  { label: 'Repairs', path: '/repairs' },
  { label: 'Settings', path: '/settings' }
];

const tenantLinks: NavLinkItem[] = [
  { label: 'Overview', path: '/' },
  { label: 'Portfolio', path: '/explore' }, // keep placeholder for consistent ordering label
  { label: 'Agreements', path: '/agreements' },
  { label: 'Applications', path: '/applications' },
  { label: 'Payments', path: '/payments' },
  { label: 'Repairs', path: '/repairs' },
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
  const pushNotice = useAppStore((state) => state.pushNotice);
  const navigate = useNavigate();
  const location = useLocation();

  if (!token) return null;

  const links = useNavLinks(role);
  // promote a small set of primary links for easier discovery
  const primaryLabels = ['Agreements', 'Payments', 'Repairs', 'Portfolio'];

  const { data: leases = [] } = useQuery({ queryKey: ['leases'], queryFn: fetchLeases, enabled: Boolean(token) });

  const depositPaid = (lease: any) => {
    const depositAmount = Number(lease?.securityDepositEth ?? lease?.depositEth ?? 0);
    const invoices = lease?.invoices ?? [];
    const receipts = lease?.receipts ?? [];
    const depositInvoiceId = lease ? `deposit-${lease.id}` : '';
    const depositInvoice = invoices.find((invoice: any) => invoice.id === depositInvoiceId);
    const depositReceipt = receipts.find((receipt: any) => receipt.invoiceId === depositInvoiceId);
    return (
      depositAmount === 0 ||
      Number(lease?.depositBalanceEth ?? 0) >= depositAmount ||
      depositInvoice?.status === 'paid' ||
      Boolean(depositReceipt)
    );
  };
  const annualPaid = (lease: any) => {
    const annualAmount = Number(lease?.annualRentEth ?? 0);
    const invoices = lease?.invoices ?? [];
    const receipts = lease?.receipts ?? [];
    const depositInvoiceId = lease ? `deposit-${lease.id}` : '';
    return (
      annualAmount === 0 ||
      invoices.some((invoice: any) => invoice.status === 'paid' && invoice.id !== depositInvoiceId) ||
      receipts.some((receipt: any) => receipt.invoiceId !== depositInvoiceId)
    );
  };

  const eligibleRepairLease =
    role === 'owner'
      ? leases[0]
      : leases.find((lease: any) => lease.status === 'active' && depositPaid(lease) && annualPaid(lease));
  const repairsPath = eligibleRepairLease ? `/repairs/${eligibleRepairLease.id}` : null;

  const paymentsLease =
    role === 'owner'
      ? null
      : leases.find((lease: any) => lease.status === 'active') || leases[0];
  const paymentsPath = role === 'owner' ? '/payments' : paymentsLease ? `/payments/${paymentsLease.id}` : null;

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
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {links
              .sort((a, b) => {
                const tenantOrder = ['Overview', 'Portfolio', 'Agreements', 'Applications', 'Payments', 'Repairs', 'Settings'];
                const ownerOrder = ['Overview', 'Portfolio', 'Agreements', 'Applications', 'Payments', 'Repairs', 'Settings'];
                const desiredOrder = role === 'tenant' ? tenantOrder : ownerOrder;
                const ia = desiredOrder.indexOf(a.label);
                const ib = desiredOrder.indexOf(b.label);
                const va = ia === -1 ? 999 : ia;
                const vb = ib === -1 ? 999 : ib;
                return va - vb;
              })
              .map((link) => {
                const active = isActive(link.path);
                const isPrimary = primaryLabels.includes(link.label);
                const isRepairs = link.label === 'Repairs';
                const isPayments = link.label === 'Payments';
                const isPortfolioPlaceholder = link.label === 'Portfolio' && role === 'tenant';
                const disabledRepairs = isRepairs && !repairsPath;
                const to = isRepairs && repairsPath ? repairsPath : isPayments && paymentsPath ? paymentsPath : isPortfolioPlaceholder ? '/explore' : link.path;
                return (
                  <Link
                    key={link.path}
                    to={to}
                    className={`rounded-full px-4 py-2 transition ${
                      active
                        ? 'bg-brand/10 text-brand shadow-[inset_0_0_0_1px_rgba(24,115,240,0.35)] font-semibold'
                        : disabledRepairs
                        ? 'cursor-not-allowed bg-surface-2 text-muted opacity-70'
                        : isPayments && !paymentsPath
                        ? 'cursor-not-allowed bg-surface-2 text-muted opacity-70'
                        : isPrimary
                        ? 'bg-surface-2 text-foreground hover:bg-surface-3 font-normal'
                        : 'text-muted hover:text-foreground hover:bg-surface-2 font-normal'
                    }`}
                    aria-current={active ? 'page' : undefined}
                    onClick={(e) => {
                      if (disabledRepairs) {
                        e.preventDefault();
                        pushNotice(
                          'info',
                          'Repairs unlock once your security deposit and annual rent are paid.'
                        );
                      } else if (isPayments && !paymentsPath) {
                        e.preventDefault();
                        pushNotice('info', 'Payments will appear once a lease is available.');
                      } else if (isPayments && paymentsPath) {
                        e.preventDefault();
                        navigate(paymentsPath);
                      } else if (isRepairs && repairsPath) {
                        e.preventDefault();
                        navigate(repairsPath);
                      }
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
          </nav>
          {/* Tenant CTA: persistent Explore button for quick discovery */}
          {role === 'tenant' && (
            <div className="ml-2 flex items-center">
              <Link
                to="/explore"
                className="ml-2 hidden rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-95 md:inline-flex"
                title="Explore listings (quick access)"
                aria-label="Explore listings"
              >
                Explore
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
