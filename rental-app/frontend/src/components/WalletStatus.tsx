import { Wallet, Check, AlertTriangle } from 'lucide-react';
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';

export function WalletStatus() {
  const environment = useAppStore((state) => state.environment);
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switchPending } = useSwitchChain();

  const { chainLabel, chainId: expectedChainId } = useMemo(() => {
    if (environment === 'local') {
      return { chainLabel: 'Ganache · 1337', chainId: 1337 };
    }
    return { chainLabel: 'Sepolia · 11155111', chainId: 11155111 };
  }, [environment]);

  const connector = connectors.find((c) => c.id === 'injected') ?? connectors[0];
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not connected';
  const mismatch = isConnected && chainId !== expectedChainId;

  const handleConnect = () => {
    if (connector) {
      connect({ connector, chainId: expectedChainId });
    }
  };

  const handleSwitch = () => {
    switchChain({ chainId: expectedChainId });
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-outline/70 bg-white/80 px-3 py-2 text-xs text-muted shadow-[0_15px_35px_rgba(11,36,71,0.08)]">
      <span className="rounded-2xl bg-brand-subtle/70 p-2 text-brand">
        <Wallet className="h-4 w-4" />
      </span>
      <div className="min-w-[140px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted">MetaMask</p>
        <p className="text-sm font-semibold text-foreground">{shortAddress}</p>
        <p className="text-[11px] text-muted">Target: {chainLabel}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {isConnected && !mismatch && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-[11px] font-semibold text-success">
            <Check className="h-3 w-3" /> Synced
          </span>
        )}
        {mismatch && (
          <button
            type="button"
            onClick={handleSwitch}
            className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-3 py-1 text-[11px] font-semibold text-warning hover:bg-warning/20"
            disabled={switchPending}
          >
            <AlertTriangle className="h-3 w-3" />
            {switchPending ? 'Switching…' : 'Switch to ' + chainLabel.replace(' · ', ' ')}
          </button>
        )}
        {!isConnected && (
          <button
            type="button"
            onClick={handleConnect}
            disabled={connectPending || !connector || status === 'connecting'}
            className="rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-brand-fg transition hover:bg-brand-hover disabled:opacity-50"
          >
            {connectPending ? 'Connecting…' : 'Connect'}
          </button>
        )}
        {isConnected && (
          <button
            type="button"
            onClick={() => disconnect()}
            className="text-[11px] font-semibold text-muted underline-offset-4 hover:text-danger hover:underline"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
