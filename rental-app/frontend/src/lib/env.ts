import type { Environment } from '../store/useAppStore';

export const NETWORKS: Record<Environment, { chainHex: string; rpcUrl: string; label: string; chainId: number }> = {
  local: {
    chainHex: '0x539',
    chainId: 1337,
    rpcUrl: 'http://127.0.0.1:8545',
    label: 'Local'
  },
  sepolia: {
    chainHex: '0xaa36a7',
    chainId: 11155111,
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC || 'https://sepolia.infura.io/v3/YOUR_KEY',
    label: 'Sepolia'
  }
};

export function getNetwork(env: Environment) {
  return NETWORKS[env];
}
