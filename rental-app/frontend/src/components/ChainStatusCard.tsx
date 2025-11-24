import { Shield, Network, Fuel, Wallet } from 'lucide-react';
import { useAccount, useBalance, useChainId, useConnect, useSwitchChain } from 'wagmi';
import { useMemo } from 'react';
import SectionCard from './SectionCard';
import { AnimatedButton } from './AnimatedButton';
import { useAppStore } from '../store/useAppStore';

function formatAddress(address?: string | null) {
  if (!address) return 'Not connected yet';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const networkCopy = {
  local: {
    title: 'Ganache lab',
    description: 'Local fork for QA and scripted leases. Prefunded wallets ship with 1000 ETH.',
    chainId: 1337
  },
  sepolia: {
    title: 'Sepolia staging',
    description: 'Public Ethereum testnet for demos. Use an Alchemy/Infura RPC and faucet ETH.',
    chainId: 11155111
  }
};

export function ChainStatusCard() {
  const environment = useAppStore((state) => state.environment);
  const { title, description, chainId: expectedChainId } = networkCopy[environment];
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending: connectPending } = useConnect();
  const { switchChain, isPending: switchPending } = useSwitchChain();
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address,
    chainId,
    query: { enabled: Boolean(address && chainId) }
  });

  const connector = useMemo(() => connectors.find((item) => item.id === 'injected') ?? connectors[0], [connectors]);
  const mismatch = isConnected && chainId !== expectedChainId;

  return (
    <SectionCard
      title="Wallet & chain health"
      description="Keep MetaMask aligned with the selected environment so lease payments land on the right network."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-surface-2/80 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand/10 p-2 text-brand">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted">Chain ID {expectedChainId}</p>
            </div>
          </div>
          <p className="text-sm text-muted">{description}</p>
          <div className="flex flex-wrap gap-2">
            {mismatch ? (
              <button
                type="button"
                onClick={() => switchChain({ chainId: expectedChainId })}
                className="inline-flex items-center gap-2 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-2 text-sm font-semibold text-warning"
                disabled={switchPending}
              >
                <Shield className="h-4 w-4" />
                {switchPending ? 'Switching…' : 'Switch MetaMask'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-2xl border border-success/30 bg-success/10 px-4 py-2 text-sm font-semibold text-success">
                <Shield className="h-4 w-4" /> Network aligned
              </span>
            )}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl bg-surface-2/80 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand/10 p-2 text-brand">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{formatAddress(address)}</p>
              <p className="text-xs text-muted">{isConnected ? 'MetaMask session active' : 'Awaiting wallet signature'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-outline/60 bg-white/80 px-4 py-3 text-sm">
            <Fuel className="h-4 w-4 text-brand" />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted">Native ETH balance</p>
              <p className="text-lg font-semibold text-foreground">
                {balanceLoading ? 'Fetching…' : balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : '0.0000 ETH'}
              </p>
            </div>
          </div>
          {!isConnected && (
            <AnimatedButton
              onClick={() => connector && connect({ connector, chainId: expectedChainId })}
              disabled={!connector || connectPending}
              className="w-full justify-center"
            >
              {connectPending ? 'Connecting…' : 'Connect MetaMask'}
            </AnimatedButton>
          )}
          {isConnected && (
            <p className="text-sm text-muted">
              Need test ETH? {environment === 'local' ? 'Restart Ganache for fresh prefunded accounts.' : 'Use an official Sepolia faucet before collecting rent.'}
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
