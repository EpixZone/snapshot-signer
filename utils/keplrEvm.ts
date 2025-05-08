'use client';

// Utility functions for Keplr EVM integration

// Type definitions for Keplr EVM
declare global {
  interface Window {
    keplr?: {
      ethereum?: {
        request: (args: { method: string; params?: any[] }) => Promise<any>;
        on: (eventName: string, listener: (...args: any[]) => void) => void;
        removeListener: (eventName: string, listener: (...args: any[]) => void) => void;
        isKeplr?: boolean;
      };
      signEthereum?: (
        chainId: string,
        signer: string,
        data: string | Uint8Array,
        type: 'message' | 'transaction' | 'eip-712'
      ) => Promise<Uint8Array>;
      sendEthereumTx?: (chainId: string, tx: Uint8Array) => Promise<string>;
      suggestERC20?: (chainId: string, contractAddress: string) => Promise<void>;
    };
  }
}

// EPIX Testnet chain configuration
export const EPIX_TESTNET = {
  chainId: '0x77d', // 1917 in hex
  chainName: 'Epix Testnet',
  nativeCurrency: {
    name: 'EPIX',
    symbol: 'EPIX',
    decimals: 18,
  },
  rpcUrls: ['https://evmrpc.testnet.epix.zone/'],
  blockExplorerUrls: ['http://testscan.epix.zone/'],
};

// EPIX Mainnet chain configuration (for future use)
export const EPIX_MAINNET = {
  chainId: '0x77b', // 1915 in hex
  chainName: 'Epix Mainnet',
  nativeCurrency: {
    name: 'EPIX',
    symbol: 'EPIX',
    decimals: 18,
  },
  rpcUrls: ['https://evmrpc.epix.zone/'],
  blockExplorerUrls: ['https://scan.epix.zone/'],
};

/**
 * Check if Keplr is installed and has EVM support
 */
export const isKeplrEVMAvailable = (): boolean => {
  return !!(window.keplr && window.keplr.ethereum);
};

/**
 * Request Keplr EVM accounts
 */
export const requestKeplrEVMAccounts = async (): Promise<string[]> => {
  if (!isKeplrEVMAvailable()) {
    throw new Error('Keplr EVM is not available');
  }

  try {
    // Request permissions first
    await window.keplr!.ethereum!.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }],
    });

    // Then get accounts
    const accounts = await window.keplr!.ethereum!.request({
      method: 'eth_requestAccounts',
    });

    return accounts;
  } catch (error) {
    console.error('Failed to request Keplr EVM accounts:', error);
    throw error;
  }
};

/**
 * Add EPIX network to Keplr if it doesn't exist
 */
export const addEpixNetworkToKeplr = async (isMainnet = false): Promise<void> => {
  if (!isKeplrEVMAvailable()) {
    throw new Error('Keplr EVM is not available');
  }

  try {
    const chainConfig = isMainnet ? EPIX_MAINNET : EPIX_TESTNET;

    await window.keplr!.ethereum!.request({
      method: 'wallet_addEthereumChain',
      params: [chainConfig],
    });

    console.log(`Added ${isMainnet ? 'Mainnet' : 'Testnet'} EPIX network to Keplr`);
  } catch (error: any) {
    // If the error is because the chain already exists, don't throw
    if (error.code === 4001) {
      console.log('User rejected adding the EPIX network to Keplr');
    } else if (error.message && error.message.includes('already exists')) {
      console.log('EPIX network already exists in Keplr');
    } else {
      console.error('Failed to add EPIX network to Keplr:', error);
      throw error;
    }
  }
};

/**
 * Switch to EPIX network in Keplr
 */
export const switchToEpixNetwork = async (isMainnet = false): Promise<void> => {
  if (!isKeplrEVMAvailable()) {
    throw new Error('Keplr EVM is not available');
  }

  try {
    const chainId = isMainnet ? EPIX_MAINNET.chainId : EPIX_TESTNET.chainId;

    await window.keplr!.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });

    console.log(`Switched to ${isMainnet ? 'Mainnet' : 'Testnet'} EPIX network in Keplr`);
  } catch (error: any) {
    // If the chain hasn't been added to Keplr yet (error code 4902)
    if (error.code === 4902) {
      await addEpixNetworkToKeplr(isMainnet);
      await switchToEpixNetwork(isMainnet);
    } else {
      console.error('Failed to switch to EPIX network in Keplr:', error);
      throw error;
    }
  }
};

/**
 * Create a Web3Provider-compatible provider from Keplr's ethereum provider
 * This allows us to use Keplr with ethers.js or other Web3 libraries
 */
export const getKeplrEVMProvider = () => {
  if (!isKeplrEVMAvailable()) {
    throw new Error('Keplr EVM is not available');
  }

  return window.keplr!.ethereum!;
};

export default {
  isKeplrEVMAvailable,
  requestKeplrEVMAccounts,
  addEpixNetworkToKeplr,
  switchToEpixNetwork,
  getKeplrEVMProvider,
};
