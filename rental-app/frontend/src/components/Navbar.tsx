import { NavLink } from 'react-router-dom';
import { useAppStore, type Environment } from '../store/useAppStore';
import { ensureNetwork } from '../lib/eth';

const baseLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/agreements', label: 'Agreements' },
  { to: '/settings', label: 'Settings' }
];

export default function Navbar() {
  const user = useAppStore((state) => state.user);
  const wallet = useAppStore((state) => state.wallet);
  const environment = useAppStore((state) => state.environment);
  const setEnvironment = useAppStore((state) => state.setEnvironment);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const logout = useAppStore((state) => state.logout);

  const links = user?.role === 'owner' ? [...baseLinks, { to: '/create', label: 'Create lease' }] : baseLinks;

  const handleEnvChange = async (value: Environment) => {
    setEnvironment(value);
    try {
      await ensureNetwork(value);
      pushNotice('success', `${value === 'local' ? 'Local' : 'Sepolia'} wallet ready`);
    } catch (err: any) {
      pushNotice('error', err.message || 'Wallet switch failed');
    }
  };

  if (!user) return null;

  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Rental Portal</span>
          <nav className="flex items-center gap-4 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-2 py-1 rounded ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500 capitalize">{user.role}</span>
          {wallet && <span className="font-mono text-xs hidden md:inline">{wallet.slice(0, 6)}…{wallet.slice(-4)}</span>}
          <button
            onClick={() => handleEnvChange('local')}
            className={`px-3 py-1 rounded border ${environment === 'local' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            Local
          </button>
          <button
            onClick={() => handleEnvChange('sepolia')}
            className={`px-3 py-1 rounded border ${environment === 'sepolia' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            Sepolia
          </button>
          <button onClick={logout} className="px-3 py-1 rounded border border-slate-200 text-slate-600">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
