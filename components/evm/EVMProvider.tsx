'use client';

import { createConfig, WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { http } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { injected } from 'wagmi/connectors';

// Define EPIX Testnet chain
export const epixTestnet = {
  id: 1917,
  name: 'Epix Testnet',
  network: 'epix-testnet',
  nativeCurrency: {
    name: 'EPIX',
    symbol: 'EPIX',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://evmrpc.testnet.epix.zone/'] },
    public: { http: ['https://evmrpc.testnet.epix.zone/'] },
  },
  blockExplorers: {
    default: { name: 'Epix Testnet Explorer', url: 'http://testscan.epix.zone/' },
  },
  testnet: true,
};

// Create Wagmi config with injected connector (works with MetaMask, Keplr, etc.)
const config = createConfig({
  chains: [epixTestnet, mainnet],
  transports: {
    [epixTestnet.id]: http('https://evmrpc.testnet.epix.zone/'),
    [mainnet.id]: http(),
  },
  connectors: [
    injected()
  ],
});

const queryClient = new QueryClient();

export function EVMProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}