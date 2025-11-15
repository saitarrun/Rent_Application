import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import { requestNonce, verifyWallet } from './lib/api';
import { useAppStore } from './store/useAppStore';
import { Toaster } from 'react-hot-toast';
import { NetworkGuard } from './components/NetworkGuard';
import { AnimatedButton } from './components/AnimatedButton';

const roles: Array<'owner' | 'tenant'> = ['owner', 'tenant'];

export default function App() {
  const token = useAppStore((state) => state.token);
  const setTokenState = useAppStore((state) => state.setToken);
  const setRoleState = useAppStore((state) => state.setRole);
  const notices = useAppStore((state) => state.notices);
  const dismiss = useAppStore((state) => state.dismissNotice);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'tenant'>('owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWalletLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = (window as any).ethereum;
      if (!provider) throw new Error('MetaMask is required');
      if (role === 'owner' && !email) throw new Error('Owner email is required');
      const [account] = await provider.request({ method: 'eth_requestAccounts' });
      const noncePayload = await requestNonce({ address: account, role, email: email || undefined });
      const message = `Rental Portal login\nRole: ${noncePayload.role}\nNonce: ${noncePayload.nonce}`;
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, account]
      });
      const resp = await verifyWallet({ address: account, signature });
      const { setToken, setRole } = useAppStore.getState();
      const resolvedRole = resp.user?.role === 'owner' || resp.user?.role === 'tenant' ? resp.user.role : role;
      localStorage.setItem('token', resp.token);
      localStorage.setItem('role', resolvedRole);
      setToken(resp.token);
      setRole(resolvedRole);
      useAppStore.getState().pushNotice('success', `Welcome back, ${noncePayload.role}`);
    } catch (err: any) {
      setError(err?.message || 'Wallet login failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (storedToken) {
      setTokenState(storedToken);
    }
    if (storedRole === 'owner' || storedRole === 'tenant') {
      setRoleState(storedRole);
    }
  }, [setRoleState, setTokenState]);

  if (!token) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex items-center justify-center px-4">
        <div className="bg-surface-2 border border-outline rounded-2xl shadow-soft p-8 w-full max-w-lg space-y-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted">Rental Suite</p>
            <h1 className="text-2xl font-display tracking-tight">Connect your wallet</h1>
            <p className="text-sm text-muted">
              Owners approve listings and leases. Tenants can only view their assigned properties and pay rent.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {roles.map((r) => {
              const active = role === r;
              return (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-xl border px-3 py-2 capitalize transition ${
                    active ? 'bg-brand text-brand-fg border-transparent shadow-ring' : 'bg-surface-1 text-muted hover:bg-surface-3'
                  }`}
                  type="button"
                >
                  {r}
                </button>
              );
            })}
          </div>
          <label className="block text-sm font-medium text-muted space-y-2">
            <span>Email (used for notices)</span>
            <input
              className="w-full border border-outline rounded-2xl bg-surface-1 px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={role === 'owner' ? 'owner@example.com' : 'optional for tenants'}
              required={role === 'owner'}
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <AnimatedButton type="button" onClick={handleWalletLogin} disabled={loading} className="w-full justify-center">
            {loading ? 'Waiting for signature…' : 'Connect wallet & sign'}
          </AnimatedButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Toaster position="top-right" />
      <NetworkGuard />
      <Navbar />
      <main className="container py-10">
        <Outlet />
      </main>
      <div className="fixed bottom-4 right-4 space-y-2">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className="bg-surface-2 border border-outline rounded-2xl shadow-soft px-4 py-3 flex items-center gap-3 animate-slideUp"
          >
            <span className="font-semibold text-sm capitalize">{notice.type}</span>
            <p className="text-sm text-muted">{notice.message}</p>
            <button onClick={() => dismiss(notice.id)} className="text-muted hover:text-foreground" aria-label="Dismiss notification">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
