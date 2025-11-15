import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { WagmiProvider, createConfig } from 'wagmi';
import { sepolia } from 'viem/chains';
import { defineChain, http } from 'viem';
import { injected } from 'wagmi/connectors';
import router from './router';
import './styles.css';

const queryClient = new QueryClient();

const ganache = defineChain({
  id: 1337,
  name: 'Ganache',
  network: 'ganache',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] }
  }
});

const wagmiConfig = createConfig({
  chains: [ganache, sepolia],
  connectors: [injected()],
  transports: {
    [ganache.id]: http(ganache.rpcUrls.default.http[0]),
    [sepolia.id]: http()
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config= {wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
