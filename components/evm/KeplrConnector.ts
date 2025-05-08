'use client';

import { Chain, CreateConnectorFn } from '@wagmi/core';
import { isKeplrEVMAvailable, switchToEpixNetwork } from '@/utils/keplrEvm';
import { custom } from 'viem';

/**
 * Factory function to create a Keplr connector
 * This approach avoids class inheritance issues in server components
 */
export const keplrConnector: CreateConnectorFn = (config) => {
  // Only create the connector on the client side
  if (typeof window === 'undefined') {
    return {
      id: 'keplr',
      name: 'Keplr',
      type: 'keplr',
      ready: false,
      connect: async () => { throw new Error('Cannot connect on server side'); },
      disconnect: async () => { },
      getAccount: async () => { throw new Error('Cannot get account on server side'); },
      getChainId: async () => { throw new Error('Cannot get chain ID on server side'); },
      getProvider: async () => null,
      getWalletClient: async () => { throw new Error('Cannot get wallet client on server side'); },
      isAuthorized: async () => false,
      switchChain: async () => { throw new Error('Cannot switch chain on server side'); },
    };
  }

  // Check if Keplr is available
  const ready = isKeplrEVMAvailable();
  let provider: Window['keplr']['ethereum'] | undefined;
  let walletClient: any;

  return {
    id: 'keplr',
    name: 'Keplr',
    type: 'keplr',
    ready,

    async connect() {
      if (!isKeplrEVMAvailable()) {
        throw new Error('Keplr is not available');
      }

      // Store provider for later use
      provider = window.keplr!.ethereum!;

      // Request accounts
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });

      // Get current chain ID
      const chainId = await provider.request({ method: 'eth_chainId' });
      const id = parseInt(chainId as string, 16);

      // Check if the chain is supported
      const chain = config.chains.find((c) => c.id === id);

      // If not on EPIX network, try to switch
      if (!chain) {
        try {
          // Try to switch to EPIX testnet
          await switchToEpixNetwork(false);

          // Get updated chain ID
          const updatedChainId = await provider.request({ method: 'eth_chainId' });
          const updatedId = parseInt(updatedChainId as string, 16);

          return {
            account: accounts[0] as `0x${string}`,
            chain: { id: updatedId, unsupported: false },
          };
        } catch (error) {
          console.error('Failed to switch to EPIX network:', error);

          return {
            account: accounts[0] as `0x${string}`,
            chain: { id, unsupported: true },
          };
        }
      }

      return {
        account: accounts[0] as `0x${string}`,
        chain: { id, unsupported: false },
      };
    },

    async disconnect() {
      if (!provider) return;

      // Revoke permissions
      try {
        await provider.request({
          method: 'wallet_revokePermissions',
          params: [
            {
              eth_accounts: {},
            },
          ],
        });
      } catch (error) {
        console.error('Failed to revoke Keplr permissions:', error);
      }

      // Reset state
      provider = undefined;
      walletClient = undefined;
    },

    async getAccount() {
      if (!provider) throw new Error('Not connected');

      const accounts = await provider.request({
        method: 'eth_accounts',
      });

      return accounts[0] as `0x${string}`;
    },

    async getChainId() {
      if (!provider) throw new Error('Not connected');

      const chainId = await provider.request({ method: 'eth_chainId' });
      return parseInt(chainId as string, 16);
    },

    async getProvider() {
      if (!provider) {
        if (isKeplrEVMAvailable()) {
          provider = window.keplr!.ethereum!;
        }
      }
      return provider;
    },

    async getWalletClient({ chainId }: { chainId?: number } = {}) {
      const provider = await this.getProvider();
      if (!provider) throw new Error('Provider not found');

      const account = await this.getAccount();
      const chain = config.chains.find((c) => c.id === (chainId || await this.getChainId()));
      if (!chain) throw new Error('Chain not found');

      return {
        account,
        chain,
        transport: custom(provider),
      };
    },

    async isAuthorized() {
      if (!isKeplrEVMAvailable()) return false;

      try {
        const provider = await this.getProvider();
        if (!provider) return false;

        const accounts = await provider.request({
          method: 'eth_accounts',
        });

        return accounts.length > 0;
      } catch {
        return false;
      }
    },

    async switchChain({ chainId }: { chainId: number }) {
      if (!provider) throw new Error('Not connected');

      const id = `0x${chainId.toString(16)}`;

      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: id }],
        });
      } catch (error: any) {
        // If the chain hasn't been added to Keplr yet (error code 4902)
        if (error.code === 4902) {
          const chain = config.chains.find((c) => c.id === chainId);
          if (!chain) throw new Error(`Chain with ID ${chainId} not found`);

          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: id,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [chain.rpcUrls.default.http[0]],
                blockExplorerUrls: chain.blockExplorers?.default
                  ? [chain.blockExplorers.default.url]
                  : undefined,
              },
            ],
          });

          // Try switching again
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: id }],
          });
        } else {
          throw error;
        }
      }

      // Find the chain
      const chain = config.chains.find((c) => c.id === chainId);
      if (!chain) throw new Error(`Chain with ID ${chainId} not found`);

      return chain;
    }
  };
};
