import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './components/Navbar';
import { requestNonce, verifyWallet } from './lib/api';
import { useAppStore } from './store/useAppStore';

const roles: Array<'owner' | 'tenant'> = ['owner', 'tenant'];

export default function App() {
  const token = useAppStore((state) => state.token);
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
      await verifyWallet({ address: account, signature });
      useAppStore.getState().pushNotice('success', `Welcome back, ${noncePayload.role}`);
    } catch (err: any) {
      setError(err?.message || 'Wallet login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="bg-white shadow rounded-lg p-8 w-full max-w-lg space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Connect your wallet</h1>
            <p className="text-sm text-slate-500">
              Owners and tenants sign in with MetaMask. Owners can manage every property; tenants see only leases assigned
              to their wallet.
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 border rounded px-3 py-2 capitalize ${
                  role === r ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
                }`}
                type="button"
              >
                {r}
              </button>
            ))}
          </div>
          <label className="block text-sm font-medium text-slate-600">
            Email (used for notices)
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={role === 'owner' ? 'owner@example.com' : 'optional for tenants'}
              required={role === 'owner'}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            className="w-full bg-slate-900 text-white py-2 rounded disabled:opacity-50"
            type="button"
            onClick={handleWalletLogin}
            disabled={loading}
          >
            {loading ? 'Waiting for signature…' : 'Connect wallet & sign'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <div className="fixed bottom-4 right-4 space-y-2">
        {notices.map((notice) => (
          <div key={notice.id} className="bg-white border rounded shadow px-4 py-3 flex items-center gap-3">
            <span className="font-semibold text-sm capitalize">{notice.type}</span>
            <p className="text-sm">{notice.message}</p>
            <button onClick={() => dismiss(notice.id)} className="text-slate-400 hover:text-slate-600">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
