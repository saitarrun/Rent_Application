import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Shield, Wallet } from 'lucide-react';
import Navbar from './components/Navbar';
import { OnboardingModal } from './components/OnboardingModal';
import { requestNonce, verifyWallet } from './lib/api';
import { useAppStore } from './store/useAppStore';
import { Toaster } from 'react-hot-toast';
import { NetworkGuard } from './components/NetworkGuard';
import { AnimatedButton } from './components/AnimatedButton';

const roles: Array<'owner' | 'tenant'> = ['owner', 'tenant'];
const DEFAULT_OWNER_EMAIL = 'owner@rentalsuite.com';

export default function App() {
  const token = useAppStore((state) => state.token);
  const setTokenState = useAppStore((state) => state.setToken);
  const setRoleState = useAppStore((state) => state.setRole);
  const notices = useAppStore((state) => state.notices);
  const dismiss = useAppStore((state) => state.dismissNotice);
  const [email, setEmail] = useState(DEFAULT_OWNER_EMAIL);
  const [role, setRole] = useState<'owner' | 'tenant'>('owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasWallet, setHasWallet] = useState(true);

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
    setHasWallet(typeof window !== 'undefined' && Boolean((window as any).ethereum));
  }, [setRoleState, setTokenState]);

  if (!token) {
    return (
      <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-[#e4efff] via-[#f5fbff] to-[#ffffff] text-foreground">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-20 aspect-square w-80 rounded-full bg-[#bcd8ff]/40 blur-3xl" />
          <div className="absolute bottom-0 right-0 aspect-square w-[28rem] rounded-full bg-[#9ee8ff]/30 blur-[120px]" />
          <div className="absolute inset-x-0 top-32 h-24 bg-gradient-to-r from-transparent via-brand/5 to-transparent blur-2xl" />
        </div>
        <div className="relative mx-auto grid min-h-dvh w-full max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.95fr]">
          <motion.section
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col justify-center text-foreground"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.6em] text-brand">Rental Suite</p>
            <h1 className="text-4xl font-display leading-tight text-[#0a1f44] sm:text-5xl">
              Luxury rentals with on-chain precision.
            </h1>
            <p className="mt-4 max-w-xl text-muted">
              Owners gain a streamlined control center, while tenants can track leases, pay rent, and request repairs in one elegant space.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[{ label: 'Properties managed', value: '120+' }, { label: 'On-chain leases', value: '58' }, { label: 'Cities', value: '15' }].map((stat) => (
                <motion.div
                  key={stat.label}
                  className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_15px_35px_rgba(52,84,209,0.12)] backdrop-blur"
                  whileHover={{ y: -4 }}
                >
                  <p className="text-2xl font-semibold text-[#0f365c]">{stat.value}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">{stat.label}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-10 grid gap-4 text-sm text-muted md:grid-cols-2">
              {[
                { icon: <Shield className="h-5 w-5" />, text: 'Audited smart contracts and custody-free logins.' },
                { icon: <CheckCircle2 className="h-5 w-5" />, text: 'Full tenancy history, invoices, and repairs in one place.' }
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-[0_10px_30px_rgba(15,35,72,0.12)]">
                  <span className="text-brand">{item.icon}</span>
                  <p className="text-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.section>
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="flex items-center"
          >
            <div className="w-full rounded-[32px] border border-white/70 bg-white/95 p-8 shadow-[0_40px_120px_rgba(11,51,96,0.18)]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-muted">Welcome</p>
                  <h2 className="text-2xl font-semibold text-foreground">Connect your wallet</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand">
                  <Wallet className="h-4 w-4" /> {role}
                </div>
              </div>
            {!hasWallet && (
              <div className="mb-4 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                Install MetaMask or enable a compatible wallet extension before continuing.
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
                {roles.map((r) => {
                  const active = role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`rounded-xl border px-3 py-2 capitalize transition ${
                        active
                          ? 'bg-brand text-brand-fg border-transparent shadow-[0_10px_35px_rgba(24,115,240,0.25)]'
                          : 'bg-surface-1 text-muted hover:bg-surface-3'
                      }`}
                      type="button"
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
              <label className="mt-6 block text-sm font-medium text-muted space-y-2">
                <span>Email (used for notices)</span>
                <input
                  className="w-full rounded-2xl border border-outline/80 bg-surface-2 px-3 py-3 text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder={role === 'owner' ? 'owner@example.com' : 'optional for tenants'}
                  required={role === 'owner'}
                />
              </label>
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}
              <AnimatedButton type="button" onClick={handleWalletLogin} disabled={loading} className="mt-6 w-full justify-center">
                {loading ? 'Waiting for signature…' : 'Connect wallet & sign'}
              </AnimatedButton>
              <p className="mt-4 text-center text-xs text-muted">
                By connecting you agree to our Terms of Service and privacy policy.
              </p>
            </div>
          </motion.section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Toaster position="top-right" />
      <OnboardingModal />
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
