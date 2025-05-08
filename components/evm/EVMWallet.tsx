'use client';

import { useAccount, useDisconnect, useChainId, useChains, useSwitchChain } from 'wagmi';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { Box, Stack, Button, Text } from "@interchain-ui/react";
import styled from "styled-components";
import { ConnectButton, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import merge from 'lodash.merge';
import { useEffect, useState } from 'react';
import { isKeplrEVMAvailable, addEpixNetworkToKeplr } from '@/utils/keplrEvm';

const vestingContractABI = [
  {
    name: "getClaimableAmount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "allocations",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "totalAmount", type: "uint256" },
      { name: "claimedAmount", type: "uint256" },
      { name: "exists", type: "bool" }
    ]
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    name: "getGlobalStats",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "_totalAllocated", type: "uint256" },
      { name: "_totalClaimed", type: "uint256" },
      { name: "_totalUsers", type: "uint256" },
      { name: "_remainingClaimable", type: "uint256" },
      { name: "_totalTimesClaimed", type: "uint256" }
    ]
  },
  {
    name: "bizdevAllocation",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "addr", type: "address" },
      { name: "totalAmount", type: "uint256" },
      { name: "claimedAmount", type: "uint256" },
      { name: "bonusAmount", type: "uint256" },
      { name: "bonusUnlocked", type: "bool" },
      { name: "isPaused", type: "bool" }
    ]
  },
  {
    name: "originalBizdevBonus",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "claimBizdevBonus",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    name: "pauseBizdevClaiming",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    name: "resumeBizdevClaiming",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    name: "clawBackBizdevRemaining",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "clawBackBizdevBonus",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ type: "uint256" }]
  }
] as const;

type AllocationData = [bigint, bigint, boolean] & {
  totalAmount: bigint;
  claimedAmount: bigint;
  exists: boolean;
};

type GlobalStatsData = [bigint, bigint, bigint, bigint, bigint] & {
  _totalAllocated: bigint;
  _totalClaimed: bigint;
  _totalUsers: bigint;
  _remainingClaimable: bigint;
  _totalTimesClaimed: bigint;
};

type BizdevAllocationData = [string, bigint, bigint, bigint, boolean, boolean] & {
  addr: string;
  totalAmount: bigint;
  claimedAmount: bigint;
  bonusAmount: bigint;
  bonusUnlocked: boolean;
  isPaused: boolean;
};

const VESTING_CONTRACT_ADDRESS = '0x9a561b46E0489a766a1663596dCdEe65b9AB5dd8' as `0x${string}`;

// Add debug logging function
const debug = (message: string, data?: any) => {
  console.log(`[EVMWallet Debug] ${message}`, data || '');
};

// Format large numbers for better readability
const formatLargeNumber = (value: string): string => {
  // If the number has more than 8 decimal places, truncate to 8
  const parts = value.split('.');
  if (parts.length === 2 && parts[1].length > 8) {
    return `${parts[0]}.${parts[1].substring(0, 8)}`;
  }
  return value;
};

// Custom avatar component for EPIX
const CustomAvatar = ({ address, size }: { address: string, size: number }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent'
      }}
    >
      <img
        src="/images/logo.png"
        alt="EPIX"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

// Create a custom theme for RainbowKit that matches the EPIX design
const epixTheme = merge(darkTheme(), {
  colors: {
    accentColor: '#8a4bdb',
    accentColorForeground: '#ffffff',
    connectButtonBackground: 'transparent',
    connectButtonText: '#5954cd',
    modalBackground: '#2d2a67',
    modalText: '#69e9f5',
    modalTextSecondary: '#ffffff',
    actionButtonBorder: '#8a4bdb',
    generalBorder: '#8a4bdb',
    menuItemBackground: '#5954cd',
  },
  radii: {
    connectButton: '50px',
    modal: '20px',
  },
  shadows: {
    connectButton: '0px 4px 4px 0px #00000040',
  },
} as const);

// Styled wrapper for proper modal positioning
const WalletWrapper = styled.div`
  .connect-button {
    border-radius: 50px !important;
    border: 3px solid #8a4bdb !important;
    box-shadow: 0px 4px 4px 0px #00000040 !important;
    background-image: linear-gradient(
      90deg,
      #b6ffb5 3.5%,
      #69e9f5 35%,
      #4ac8d2 66%,
      #31bdc6 101.97%,
      #31bdc6 101.98%,
      #8a4bdb 101.99%,
      #5954cd 102%
    ) !important;
    color: #5954cd !important;
    font-weight: 500 !important;
    padding: 12px 20px !important;
    min-width: 220px !important;
    text-align: center !important;
    transition: all 0.4s !important;

    &:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0px 6px 8px 0px #00000040 !important;
    }
  }
`;

const StyledButton = styled(Button)`
  border-radius: 50px;
  border-width: 3px;
  box-shadow: 0px 4px 4px 0px #00000040;
  border-style: solid;
  color: #5954cd;
  background: transparent;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  padding: 24px 0;
  width: 220px;
  z-index: 10;
  text-wrap: auto;
  background-image: linear-gradient(
    90deg,
    #b6ffb5 3.5%,
    #69e9f5 35%,
    #4ac8d2 66%,
    #31bdc6 101.97%,
    #31bdc6 101.98%,
    #8a4bdb 101.99%,
    #5954cd 102%
  );
  border-color: #8a4bdb;
  &:hover {
    transition: all 0.4s;
    cursor: pointer;
    transform: translateY(-2px);
    box-shadow: 0px 6px 8px 0px #00000040;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  @media (max-width: 768px) {
    padding: 15px 0;
    font-size: 14px;
    width: 180px;
  }

  @media (max-width: 480px) {
    padding: 12px 0;
    font-size: 13px;
    width: 150px;
  }
`;



const BonusButton = styled(Button)`
  border-radius: 50px;
  border-width: 3px;
  box-shadow: 0px 4px 4px 0px #00000040;
  border-style: solid;
  color: #5954cd;
  background: transparent;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  padding: 24px 0;
  width: 220px;
  z-index: 10;
  text-wrap: auto;
  background-image: linear-gradient(
    90deg,
    #ffd700 3.5%,
    #ffb347 35%,
    #ffa500 66%,
    #ff8c00 101.97%
  );
  border-color: #ffa500;
  &:hover {
    transition: all 0.4s;
    cursor: pointer;
    transform: translateY(-2px);
    box-shadow: 0px 6px 8px 0px #00000040;
  }

  @media (max-width: 768px) {
    padding: 15px 0;
    font-size: 14px;
    width: 180px;
  }

  @media (max-width: 480px) {
    padding: 12px 0;
    font-size: 13px;
    width: 150px;
  }
`;

// Styled container for wallet info
const WalletInfoContainer = styled(Box)`
  background: rgba(42, 39, 103, 0.7);
  border-radius: 20px;
  border: 2px solid #8a4bdb;
  padding: 24px;
  margin-top: 24px;
  box-shadow: inset 12px 16px 40px #0000001a, 10px 6px 50px -20px #00000030;

  @media (max-width: 768px) {
    padding: 20px 16px;
  }

  @media (max-width: 480px) {
    padding: 16px 12px;
  }
`;

// Styled text for wallet info
const InfoText = styled(Text)`
  color: #69e9f5;
  font-size: 18px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  span {
    color: white;
    font-weight: 500;
    word-break: break-word;
    overflow-wrap: break-word;
    text-overflow: ellipsis;
    font-family: monospace;
  }

  @media (max-width: 768px) {
    font-size: 16px;
  }

  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

// Styled text for bonus info
const BonusInfoText = styled(Text)`
  color: #ffd700;
  font-size: 18px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  span {
    color: white;
    font-weight: 500;
    word-break: break-word;
    overflow-wrap: break-word;
    text-overflow: ellipsis;
    font-family: monospace;
  }

  @media (max-width: 768px) {
    font-size: 16px;
  }

  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

// Styled text for warning info
const WarningInfoText = styled(Text)`
  color: #ff6b6b;
  font-size: 18px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  span {
    color: white;
    font-weight: 500;
    word-break: break-word;
    overflow-wrap: break-word;
    text-overflow: ellipsis;
    font-family: monospace;
  }

  @media (max-width: 768px) {
    font-size: 16px;
  }

  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

// Styled divider
const Divider = styled(Box)`
  margin-top: 16px;
  margin-bottom: 16px;
  height: 1px;
  background-color: rgba(138, 75, 219, 0.3);
  width: 100%;
`;

// Styled heading
const Heading = styled.h1`
  color: #69e9f5 !important;
  font-size: 32px;
  margin-bottom: 24px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

// Styled logo container
const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;

  img {
    height: 60px;
  }
`;

// Styled container for the entire app
const AppContainer = styled(Box)`
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }

  @media (max-width: 480px) {
    padding: 12px 8px;
  }
`;

// Styled progress indicator
const ProgressIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 24px 0;

  .progress-bar {
    width: 100%;
    height: 8px;
    background: rgba(42, 39, 103, 0.5);
    border-radius: 4px;
    overflow: hidden;
    position: relative;

    .progress-fill {
      position: absolute;
      height: 100%;
      background-image: linear-gradient(
        90deg,
        #b6ffb5 3.5%,
        #69e9f5 35%,
        #4ac8d2 66%,
        #31bdc6 101.97%
      );
      transition: width 0.3s ease;
    }
  }
`;

// Styled global stats container
const GlobalStatsContainer = styled(Box)`
  background: rgba(42, 39, 103, 0.7);
  border-radius: 20px;
  border: 2px solid #8a4bdb;
  padding: 24px;
  margin-top: 24px;
  box-shadow: inset 12px 16px 40px #0000001a, 10px 6px 50px -20px #00000030;

  @media (max-width: 768px) {
    padding: 20px 16px;
  }

  @media (max-width: 480px) {
    padding: 16px 12px;
  }
`;

// Styled global stats grid
const StatsGrid = styled(Box) <{ simplified?: boolean }>`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 16px;

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: ${props => props.simplified ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)'};
  }

  @media (min-width: 992px) {
    grid-template-columns: ${props => props.simplified ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)'};
  }
`;

// Styled stats card
const StatsCard = styled(Box)`
  background: rgba(42, 39, 103, 0.5);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;

  h3 {
    color: #69e9f5;
    font-size: 16px;
    margin-bottom: 8px;
    font-weight: 500;
  }

  p {
    color: white;
    font-size: 18px;
    font-weight: 600;
    word-break: break-word;
    overflow-wrap: break-word;
    font-family: monospace;
  }

  @media (max-width: 768px) {
    p {
      font-size: 16px;
    }
  }

  @media (max-width: 480px) {
    padding: 12px 8px;

    h3 {
      font-size: 14px;
    }

    p {
      font-size: 14px;
    }
  }
`;

// Styled global progress bar container
const GlobalProgressContainer = styled(Box)`
  margin-top: 24px;
  padding: 0 16px;
`;

// Styled global progress bar
const GlobalProgressBar = styled.div`
  width: 100%;
  height: 12px;
  background: rgba(42, 39, 103, 0.5);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  margin-bottom: 8px;
`;

// Styled global progress fill
const GlobalProgressFill = styled.div<{ progress: number }>`
  position: absolute;
  height: 100%;
  width: ${props => `${props.progress}%`};
  background-image: linear-gradient(
    90deg,
    #b6ffb5 3.5%,
    #69e9f5 35%,
    #4ac8d2 66%,
    #31bdc6 101.97%
  );
  transition: width 0.5s ease;
`;

// Styled progress label
const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  color: #69e9f5;
  font-size: 14px;
  margin-bottom: 16px;

  span.percentage {
    color: white;
    font-weight: 500;
  }
`;

// Styled notification component
const NotificationContainer = styled.div<{ type: 'info' | 'success' | 'error' }>`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-width: 350px;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out forwards;
  background-color: ${props =>
    props.type === 'info' ? 'rgba(42, 39, 103, 0.9)' :
      props.type === 'success' ? 'rgba(22, 160, 133, 0.9)' :
        'rgba(231, 76, 60, 0.9)'
  };
  border: 2px solid ${props =>
    props.type === 'info' ? '#69e9f5' :
      props.type === 'success' ? '#2ecc71' :
        '#e74c3c'
  };

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  &.closing {
    animation: slideOut 0.3s ease-in forwards;
  }
`;

const NotificationTitle = styled.h4`
  margin: 0 0 8px 0;
  color: white;
  font-size: 18px;
  font-weight: 600;
`;

const NotificationMessage = styled.p`
  margin: 0;
  color: white;
  font-size: 14px;
`;

// Notification component
interface NotificationProps {
  title: string;
  message: string;
  type: 'info' | 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  title,
  message,
  type,
  duration = 5000,
  onClose
}) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      const animationTimer = setTimeout(() => {
        onClose();
      }, 300); // Match the animation duration

      return () => clearTimeout(animationTimer);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <NotificationContainer type={type} className={isClosing ? 'closing' : ''}>
      <NotificationTitle>{title}</NotificationTitle>
      <NotificationMessage>{message}</NotificationMessage>
    </NotificationContainer>
  );
};

export function EVMWallet() {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const chains = useChains();
  const { switchChain } = useSwitchChain();

  // State to track transaction hashes
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isKeplrWallet, setIsKeplrWallet] = useState(false);

  // State for notifications
  interface NotificationState {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error';
  }

  const [notifications, setNotifications] = useState<NotificationState[]>([]);

  // Check if the connected wallet is Keplr
  useEffect(() => {
    if (isConnected) {
      // Check if Keplr is available in the browser
      const keplrAvailable = isKeplrEVMAvailable();

      // Check if the provider is from Keplr
      // We need to check this asynchronously
      const checkIfKeplrProvider = async () => {
        try {
          // Get the provider from the connector
          const provider = await connector?.getProvider();

          // Check if the provider has the Keplr flag or is from Keplr
          const isKeplrProvider = provider &&
            ((provider as any).isKeplr === true ||
              (window.keplr && window.keplr.ethereum === provider));

          setIsKeplrWallet(keplrAvailable && isKeplrProvider);

          debug('Wallet Connection Info:', {
            keplrAvailable,
            connectorId: connector?.id,
            isKeplrProvider,
            isKeplrWallet: keplrAvailable && isKeplrProvider
          });
        } catch (error) {
          console.error('Error checking if provider is Keplr:', error);
          setIsKeplrWallet(false);
        }
      };

      checkIfKeplrProvider();
    } else {
      setIsKeplrWallet(false);
    }
  }, [isConnected, connector]);

  // Function to show notifications
  const showNotification = (title: string, message: string, type: 'info' | 'success' | 'error') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, title, message, type }]);
    return id;
  };

  // Function to remove a notification
  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  debug('Wallet State:', { address, isConnected, chainId });

  // Check if we need to switch to EPIX testnet
  useEffect(() => {
    if (isConnected) {
      if (chainId !== 1917) {
        // User is connected but not on EPIX testnet
        debug('Connected to wrong network, attempting to switch to EPIX testnet');

        // Add a longer delay for Keplr to ensure the initial connection is fully established
        const delay = isKeplrWallet ? 1000 : 500;

        try {
          const timer = setTimeout(() => {
            debug(`Switching chain after ${delay}ms delay, isKeplrWallet: ${isKeplrWallet}`);
            switchChain({ chainId: 1917 });
          }, delay);

          return () => clearTimeout(timer);
        } catch (error) {
          debug('Error switching chain:', error);
        }
      } else {
        debug('Already connected to EPIX testnet');
      }
    }
  }, [isConnected, chainId, switchChain, isKeplrWallet]);

  // Read total allocation and claimed amount
  const { data: allocationData, error: allocationError, refetch: refetchAllocation } = useReadContract({
    address: VESTING_CONTRACT_ADDRESS,
    abi: vestingContractABI,
    functionName: 'allocations',
    args: address ? [address.toLowerCase() as `0x${string}`] : undefined,
    query: { enabled: !!address }
  }) as { data: AllocationData | undefined, error: Error | null, refetch: () => Promise<any> };

  // Read global stats from contract
  const { data: globalStatsData, error: globalStatsError, refetch: refetchGlobalStats } = useReadContract({
    address: VESTING_CONTRACT_ADDRESS,
    abi: vestingContractABI,
    functionName: 'getGlobalStats',
    query: { enabled: true }
  }) as { data: GlobalStatsData | undefined, error: Error | null, refetch: () => Promise<any> };

  // Read bizdev allocation from contract
  const { data: bizdevAllocationData, error: bizdevAllocationError, refetch: refetchBizdevAllocation } = useReadContract({
    address: VESTING_CONTRACT_ADDRESS,
    abi: vestingContractABI,
    functionName: 'bizdevAllocation',
    query: { enabled: true }
  }) as { data: BizdevAllocationData | undefined, error: Error | null, refetch: () => Promise<any> };

  // Read original bizdev bonus amount from contract
  const { data: originalBizdevBonusData, error: originalBizdevBonusError, refetch: refetchOriginalBizdevBonus } = useReadContract({
    address: VESTING_CONTRACT_ADDRESS,
    abi: vestingContractABI,
    functionName: 'originalBizdevBonus',
    query: { enabled: true }
  }) as { data: bigint | undefined, error: Error | null, refetch: () => Promise<any> };

  // Process allocation data
  const allocation = allocationData ? {
    totalAmount: allocationData[0],
    claimedAmount: allocationData[1],
    exists: allocationData[2]
  } : undefined;

  // Log allocation data or error
  if (allocationData) {
    debug('Raw Allocation Data:', allocationData);
    debug('Processed Allocation:', {
      totalAmount: allocation?.totalAmount ? formatEther(allocation.totalAmount) : '0',
      claimedAmount: allocation?.claimedAmount ? formatEther(allocation.claimedAmount) : '0',
      exists: allocation?.exists
    });
  }
  if (allocationError) {
    debug('Allocation Error:', allocationError);
  }

  // Read claimable amount
  const { data: claimableAmount, error: claimableError, refetch: refetchClaimable } = useReadContract({
    address: VESTING_CONTRACT_ADDRESS,
    abi: vestingContractABI,
    functionName: 'getClaimableAmount',
    args: address ? [address.toLowerCase() as `0x${string}`] : undefined,
    query: { enabled: !!address }
  }) as { data: bigint | undefined, error: Error | null, refetch: () => Promise<any> };

  // Log claimable amount or error
  if (claimableAmount) {
    debug('Claimable Amount:', formatEther(claimableAmount));
  }
  if (claimableError) {
    debug('Claimable Error:', claimableError);
  }

  // Calculate and log the locked tokens amount
  useEffect(() => {
    if (allocation?.totalAmount && claimableAmount !== undefined) {
      const lockedTokens = allocation.totalAmount - (allocation.claimedAmount || BigInt(0)) - claimableAmount;
      debug('Locked EPIX Calculation:', {
        totalAmount: formatEther(allocation.totalAmount),
        claimedAmount: formatEther(allocation.claimedAmount || BigInt(0)),
        claimableAmount: formatEther(claimableAmount),
        lockedTokens: formatEther(lockedTokens)
      });
    }
  }, [allocation, claimableAmount]);

  // Process global stats data
  const globalStats = globalStatsData ? {
    totalAllocated: globalStatsData[0],
    totalClaimed: globalStatsData[1],
    totalUsers: globalStatsData[2],
    remainingClaimable: globalStatsData[3],
    totalTimesClaimed: globalStatsData[4]
  } : undefined;

  // Log global stats data or error
  if (globalStatsData) {
    debug('Raw Global Stats Data:', globalStatsData);
    debug('Processed Global Stats:', {
      totalAllocated: globalStats?.totalAllocated ? formatEther(globalStats.totalAllocated) : '0',
      totalClaimed: globalStats?.totalClaimed ? formatEther(globalStats.totalClaimed) : '0',
      totalUsers: globalStats?.totalUsers ? globalStats.totalUsers.toString() : '0',
      remainingClaimable: globalStats?.remainingClaimable ? formatEther(globalStats.remainingClaimable) : '0',
      totalTimesClaimed: globalStats?.totalTimesClaimed ? globalStats.totalTimesClaimed.toString() : '0'
    });
  }
  if (globalStatsError) {
    debug('Global Stats Error:', globalStatsError);
  }

  // Process bizdev allocation data
  const bizdevAllocation = bizdevAllocationData ? {
    addr: bizdevAllocationData[0],
    totalAmount: bizdevAllocationData[1],
    claimedAmount: bizdevAllocationData[2],
    bonusAmount: bizdevAllocationData[3],
    bonusUnlocked: bizdevAllocationData[4],
    isPaused: bizdevAllocationData[5]
  } : undefined;

  // Check if current user is the bizdev partner
  const isBizdevPartner = address && bizdevAllocation ?
    address.toLowerCase() === bizdevAllocation.addr.toLowerCase() : false;

  // Log bizdev allocation data or error
  if (bizdevAllocationData) {
    debug('Raw Bizdev Allocation Data:', bizdevAllocationData);
    debug('Processed Bizdev Allocation:', {
      addr: bizdevAllocation?.addr,
      totalAmount: bizdevAllocation?.totalAmount ? formatEther(bizdevAllocation.totalAmount) : '0',
      claimedAmount: bizdevAllocation?.claimedAmount ? formatEther(bizdevAllocation.claimedAmount) : '0',
      bonusAmount: bizdevAllocation?.bonusAmount ? formatEther(bizdevAllocation.bonusAmount) : '0',
      totalWithBonus: bizdevAllocation?.totalAmount && bizdevAllocation?.bonusAmount ?
        formatEther(bizdevAllocation.totalAmount + bizdevAllocation.bonusAmount) : '0',
      bonusUnlocked: bizdevAllocation?.bonusUnlocked,
      isPaused: bizdevAllocation?.isPaused
    });
    debug('Is Bizdev Partner:', isBizdevPartner);

    // Additional debug info for bizdev partner
    if (isBizdevPartner) {
      debug('Bizdev Partner Connected - Displaying allocation from bizdevAllocation');
      debug('Original Bizdev Bonus:', originalBizdevBonusData ? formatEther(originalBizdevBonusData) : '0');
      debug('Current Bizdev Bonus:', bizdevAllocation.bonusAmount ? formatEther(bizdevAllocation.bonusAmount) : '0');
      debug('Bizdev Total Allocation (including bonus):',
        formatEther(bizdevAllocation.totalAmount + (originalBizdevBonusData || BigInt(0))));
    }
  }
  if (bizdevAllocationError) {
    debug('Bizdev Allocation Error:', bizdevAllocationError);
  }

  // Log original bizdev bonus data or error
  if (originalBizdevBonusData) {
    debug('Original Bizdev Bonus:', formatEther(originalBizdevBonusData));
  }
  if (originalBizdevBonusError) {
    debug('Original Bizdev Bonus Error:', originalBizdevBonusError);
  }

  const { writeContract, isPending: isClaimLoading, data: claimTxHash } = useWriteContract();
  const { writeContract: writeBonusContract, isPending: isBonusClaimLoading, data: bonusTxHash } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isWaitingForTx, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash,
    },
  });

  // Function to refresh all data
  const refreshAllData = async () => {
    debug('Refreshing all data...');
    try {
      await Promise.all([
        refetchAllocation(),
        refetchGlobalStats(),
        refetchBizdevAllocation(),
        refetchOriginalBizdevBonus(),
        refetchClaimable()
      ]);
    } catch (error) {
      debug('Error refreshing data:', error);
      showNotification(
        'Refresh Failed',
        'Failed to update token information',
        'error'
      );
    }
  };

  // Update txHash when a transaction is submitted
  useEffect(() => {
    if (claimTxHash && claimTxHash !== txHash) {
      debug('New claim transaction submitted:', claimTxHash);
      setTxHash(claimTxHash);
      showNotification(
        'Transaction Submitted',
        'Your claim transaction has been submitted',
        'info'
      );
    } else if (bonusTxHash && bonusTxHash !== txHash) {
      debug('New bonus claim transaction submitted:', bonusTxHash);
      setTxHash(bonusTxHash);
      showNotification(
        'Transaction Submitted',
        'Your bonus claim transaction has been submitted',
        'info'
      );
    }
  }, [claimTxHash, bonusTxHash]);

  // Refresh data when transaction is successful
  useEffect(() => {
    if (isTxSuccess && txHash) {
      debug('Transaction successful, refreshing data:', txHash);
      refreshAllData();
      setTxHash(null); // Reset txHash after successful refresh
      showNotification(
        'Transaction Successful',
        'Your tokens have been claimed successfully',
        'success'
      );
    }
  }, [isTxSuccess, txHash]);

  const handleClaim = async () => {
    if (!address || !chainId) return;
    debug('Initiating claim...', { address, chainId });
    const chain = chains.find((c) => c.id === chainId);
    try {
      await writeContract({
        address: VESTING_CONTRACT_ADDRESS,
        abi: vestingContractABI,
        functionName: 'claim',
        chain,
        account: address as `0x${string}`,
      });
      debug('Claim transaction submitted');
    } catch (error) {
      debug('Claim Error:', error);
      console.error('Failed to claim:', error);
      showNotification(
        'Claim Failed',
        'Failed to submit claim transaction',
        'error'
      );
    }
  };

  const handleClaimBonus = async () => {
    if (!address || !chainId || !isBizdevPartner) return;
    debug('Initiating bonus claim...', { address, chainId });
    const chain = chains.find((c) => c.id === chainId);
    try {
      await writeBonusContract({
        address: VESTING_CONTRACT_ADDRESS,
        abi: vestingContractABI,
        functionName: 'claimBizdevBonus',
        chain,
        account: address as `0x${string}`,
      });
      debug('Bonus claim transaction submitted');
    } catch (error) {
      debug('Bonus Claim Error:', error);
      console.error('Failed to claim bonus:', error);
      showNotification(
        'Bonus Claim Failed',
        'Failed to submit bonus claim transaction',
        'error'
      );
    }
  };



  // Custom styled ConnectButton component
  const CustomConnectButton = () => (
    <WalletWrapper>
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="connect-button"
                      >
                        Connect Wallet
                      </button>
                      <Text color="#69e9f5" fontSize="16px">
                        {keplrAvailable
                          ? "Connect with Keplr to claim your tokens. You'll need to approve two connection requests: first for Ethereum, then for EPIX Testnet."
                          : "Connect your wallet to claim your EPIX tokens"}
                      </Text>
                    </div>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={openChainModal}
                        type="button"
                        className="connect-button"
                        style={{
                          backgroundImage: 'linear-gradient(90deg, #ff5e5e, #ff8f8f) !important',
                        }}
                      >
                        Switch to EPIX Network
                      </button>
                      <Text color="#ff6b6b" fontSize="16px">Please switch to the EPIX Testnet to continue</Text>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="connect-button"
                    >
                      {account.displayName}
                    </button>
                    {isKeplrWallet && (
                      <Text color="#69e9f5" fontSize="16px">Connected with Keplr Wallet</Text>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </WalletWrapper>
  );

  // Calculate progress percentage based on claimed amount
  const calculateProgress = () => {
    // For bizdev partner
    if (isBizdevPartner && bizdevAllocation) {
      const totalAmount = bizdevAllocation.totalAmount + (originalBizdevBonusData || BigInt(0));
      if (!totalAmount || totalAmount === BigInt(0)) return 0;

      // The claimed amount now includes the bonus if it was claimed
      // No need to add the bonus amount separately
      const claimedAmount = bizdevAllocation.claimedAmount;

      return Number((claimedAmount * BigInt(100)) / totalAmount);
    }
    // For regular users
    if (!allocation?.totalAmount || allocation.totalAmount === BigInt(0)) return 0;
    return Number((allocation.claimedAmount * BigInt(100)) / allocation.totalAmount);
  };

  // Calculate global progress percentage
  const calculateGlobalProgress = () => {
    if (!globalStats?.totalAllocated || globalStats.totalAllocated === BigInt(0)) return 0;

    // Handle case where claimed amount might exceed allocated amount
    if (globalStats.totalClaimed > globalStats.totalAllocated) {
      return 100; // Return 100% if claimed exceeds allocated
    }

    return Number((globalStats.totalClaimed * BigInt(100)) / globalStats.totalAllocated);
  };

  // Calculate locked EPIX amount
  const calculateLockedTokens = () => {
    if (isBizdevPartner && bizdevAllocation) {
      const totalAmount = bizdevAllocation.totalAmount + (originalBizdevBonusData || BigInt(0));
      const claimed = bizdevAllocation.claimedAmount;
      const claimable = claimableAmount || BigInt(0);
      return totalAmount - claimed - claimable;
    } else if (allocation?.totalAmount) {
      const totalAmount = allocation.totalAmount;
      const claimed = allocation.claimedAmount || BigInt(0);
      const claimable = claimableAmount || BigInt(0);
      return totalAmount - claimed - claimable;
    }
    return BigInt(0);
  };

  // Check if Keplr is available for the UI
  const keplrAvailable = isKeplrEVMAvailable();

  // Function to add EPIX network to Keplr
  const handleAddEpixToKeplr = async () => {
    try {
      await addEpixNetworkToKeplr(false); // false for testnet
      showNotification(
        'Switched Network',
        'Keplr wallet switched to EPIX Testnet',
        'success'
      );
    } catch (error) {
      console.error('Failed to add EPIX network to Keplr:', error);
      showNotification(
        'Network Addition Failed',
        'Failed to add EPIX Testnet to your Keplr wallet',
        'error'
      );
    }
  };

  // Auto-add EPIX network to Keplr when it's detected
  useEffect(() => {
    if (keplrAvailable && isKeplrWallet) {
      // Only try to add the network if the user is connected with Keplr
      handleAddEpixToKeplr();
    }
  }, [keplrAvailable, isKeplrWallet]);

  return (
    <RainbowKitProvider
      theme={epixTheme}
      avatar={CustomAvatar}
      initialChain={1917} // Set EPIX Testnet as the initial chain
      showRecentTransactions={true}
    >
      <WalletWrapper>
        {/* Render notifications */}
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            title={notification.title}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
        <AppContainer>
          <Box display="flex" justifyContent="center" marginBottom="24px">
            <CustomConnectButton />
          </Box>

          {/* Always show global stats summary */}
          {!isConnected && (
            <>
              <GlobalStatsContainer>
                <Heading style={{ fontSize: '24px', marginBottom: '16px', textAlign: 'center' }}>EPIX Vesting Stats</Heading>
                {globalStatsError ? (
                  <Box textAlign="center" padding="16px">
                    <Text color="#ff6b6b" fontSize="16px">Error loading global stats. Please try again later.</Text>
                  </Box>
                ) : globalStats ? (
                  <>
                    <StatsGrid simplified={true}>
                      <StatsCard>
                        <h3>Total Allocated</h3>
                        <p>{formatLargeNumber(formatEther(globalStats.totalAllocated))} EPIX</p>
                      </StatsCard>
                      <StatsCard>
                        <h3>Total Claimed</h3>
                        <p>{formatLargeNumber(formatEther(globalStats.totalClaimed))} EPIX</p>
                      </StatsCard>
                      <StatsCard>
                        <h3>Times Claimed</h3>
                        <p>{globalStats.totalTimesClaimed.toString()}</p>
                      </StatsCard>
                    </StatsGrid>
                    <GlobalProgressContainer>
                      <ProgressLabel>
                        <span>Claiming Progress</span>
                        <span className="percentage">{calculateGlobalProgress().toFixed(2)}%</span>
                      </ProgressLabel>
                      <GlobalProgressBar>
                        <GlobalProgressFill progress={calculateGlobalProgress()} />
                      </GlobalProgressBar>
                    </GlobalProgressContainer>
                  </>
                ) : (
                  <Box textAlign="center" padding="16px">
                    <Text color="#69e9f5" fontSize="16px">Connect your wallet to view stats.</Text>
                  </Box>
                )}
              </GlobalStatsContainer>
            </>
          )}

          {isConnected && (
            <>
              <WalletInfoContainer>
                <InfoText>
                  <div>
                    Connected{isKeplrWallet ? ' with Keplr' : ''}:
                  </div>
                  <span>{address}</span>
                </InfoText>
                {/* Display total allocation based on whether the user is bizdev partner or regular user */}
                <InfoText>
                  <div>Total Allocation:</div>
                  <span>
                    {isBizdevPartner && bizdevAllocation
                      ? formatLargeNumber(formatEther(bizdevAllocation.totalAmount + (originalBizdevBonusData || BigInt(0))))
                      : (allocation?.totalAmount ? formatLargeNumber(formatEther(allocation.totalAmount)) : '0')} EPIX
                  </span>
                </InfoText>
                <InfoText>
                  <div>Claimed Amount:</div>
                  <span>
                    {isBizdevPartner && bizdevAllocation
                      ? formatLargeNumber(formatEther(bizdevAllocation.claimedAmount))
                      : (allocation?.claimedAmount ? formatLargeNumber(formatEther(allocation.claimedAmount)) : '0')} EPIX
                  </span>
                </InfoText>
                <InfoText>
                  <div>Available to Claim:</div>
                  <span>{claimableAmount ? formatLargeNumber(formatEther(claimableAmount)) : '0'} EPIX</span>
                </InfoText>
                <InfoText>
                  <div>Locked EPIX:</div>
                  <span>{formatLargeNumber(formatEther(calculateLockedTokens()))} EPIX</span>
                </InfoText>

                {/* Bonus information for bizdev partner */}
                {isBizdevPartner && bizdevAllocation && (
                  <>
                    <Divider />
                    <BonusInfoText>
                      <div>Bizdev Bonus:</div>
                      <span>{bizdevAllocation.bonusAmount ? formatLargeNumber(formatEther(bizdevAllocation.bonusAmount)) : '0'} EPIX</span>
                    </BonusInfoText>
                    <BonusInfoText>
                      <div>Bonus Status:</div>
                      <span>{bizdevAllocation.bonusUnlocked ? 'Unlocked' : 'Locked'}</span>
                    </BonusInfoText>
                    {bizdevAllocation.isPaused && (
                      <WarningInfoText>
                        <div>Claiming Status:</div>
                        <span>Paused</span>
                      </WarningInfoText>
                    )}
                  </>
                )}

                {/* Show progress indicator for both regular users and bizdev partner */}
                {((allocation?.totalAmount && allocation.totalAmount > BigInt(0)) ||
                  (isBizdevPartner && bizdevAllocation && bizdevAllocation.totalAmount > BigInt(0))) && (
                    <ProgressIndicator>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${calculateProgress()}%` }}
                        />
                      </div>
                    </ProgressIndicator>
                  )}

                {isWaitingForTx && (
                  <Box textAlign="center" marginTop="16px">
                    <Text color="#69e9f5" fontSize="16px">
                      Transaction in progress... Please wait while your transaction is being confirmed.
                    </Text>
                  </Box>
                )}

                <Box
                  display="flex"
                  justifyContent="center"
                  gap="16px"
                  flexWrap="wrap"
                  marginTop="24px"
                >
                  <StyledButton
                    onClick={handleClaim}
                    disabled={!claimableAmount || claimableAmount === BigInt(0) || isClaimLoading || isWaitingForTx}
                  >
                    {isClaimLoading ? 'Submitting...' : isWaitingForTx ? 'Processing...' : 'Claim EPIX'}
                  </StyledButton>

                  {/* Bonus claim button - only visible to bizdev partner */}
                  {isBizdevPartner && bizdevAllocation && bizdevAllocation.bonusUnlocked &&
                    bizdevAllocation.bonusAmount > BigInt(0) && !bizdevAllocation.isPaused && (
                      <BonusButton
                        onClick={handleClaimBonus}
                        disabled={isBonusClaimLoading || isWaitingForTx}
                      >
                        {isBonusClaimLoading ? 'Submitting...' : isWaitingForTx ? 'Processing...' : 'Claim Bonus'}
                      </BonusButton>
                    )}



                  <StyledButton
                    onClick={() => disconnect()}
                    disabled={isWaitingForTx}
                  >
                    Disconnect
                  </StyledButton>
                </Box>
              </WalletInfoContainer>

              {/* Global Stats Section */}
              <GlobalStatsContainer>
                <Heading style={{ fontSize: '24px', marginBottom: '16px' }}>Global Stats</Heading>
                {globalStatsError ? (
                  <Box textAlign="center" padding="16px">
                    <Text color="#ff6b6b" fontSize="16px">Error loading global stats. Please try again later.</Text>
                  </Box>
                ) : (
                  <StatsGrid>
                    <StatsCard>
                      <h3>Total Allocated</h3>
                      <p>{globalStats?.totalAllocated ? formatLargeNumber(formatEther(globalStats.totalAllocated)) : '0'} EPIX</p>
                    </StatsCard>
                    <StatsCard>
                      <h3>Total Claimed</h3>
                      <p>{globalStats?.totalClaimed ? formatLargeNumber(formatEther(globalStats.totalClaimed)) : '0'} EPIX</p>
                    </StatsCard>
                    <StatsCard>
                      <h3>Remaining Claimable</h3>
                      <p>{globalStats?.remainingClaimable ? formatLargeNumber(formatEther(globalStats.remainingClaimable)) : '0'} EPIX</p>
                    </StatsCard>
                    <StatsCard>
                      <h3>Times Claimed</h3>
                      <p>{globalStats?.totalTimesClaimed ? globalStats.totalTimesClaimed.toString() : '0'}</p>
                    </StatsCard>
                  </StatsGrid>
                )}

                <GlobalProgressContainer>
                  <ProgressLabel>
                    <span>Global Claiming Progress</span>
                    <span className="percentage">{calculateGlobalProgress().toFixed(2)}%</span>
                  </ProgressLabel>
                  <GlobalProgressBar>
                    <GlobalProgressFill progress={calculateGlobalProgress()} />
                  </GlobalProgressBar>
                </GlobalProgressContainer>
              </GlobalStatsContainer>

              <Box marginTop="24px" textAlign="center">
                <a
                  href="https://epix.zone"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#69e9f5',
                    textDecoration: 'none',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Visit Epix.zone
                  <span style={{ fontSize: '20px' }}>→</span>
                </a>
              </Box>
            </>
          )}
        </AppContainer>
      </WalletWrapper>
    </RainbowKitProvider>
  );
}