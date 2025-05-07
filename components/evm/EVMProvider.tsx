import { createConfig, http, WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const epixTestnet = {
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

const config = createConfig({
  chains: [epixTestnet, mainnet],
  transports: {
    [epixTestnet.id]: http(),
    [mainnet.id]: http(),
  },
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