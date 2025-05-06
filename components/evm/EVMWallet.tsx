import { useAccount, useDisconnect, useChainId, useChains } from 'wagmi';
import { useReadContract, useWriteContract } from 'wagmi';
import { formatEther } from 'viem';
import { Box, Stack, Button, Text } from "@interchain-ui/react";
import styled from "styled-components";
import { ConnectButton, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import merge from 'lodash.merge';

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
  }
] as const;

type AllocationData = [bigint, bigint, boolean] & {
  totalAmount: bigint;
  claimedAmount: bigint;
  exists: boolean;
};

const VESTING_CONTRACT_ADDRESS = '0xC43750C20BBD39601a0D55FC6719641D98Bcd87A' as `0x${string}`;

// Add debug logging function
const debug = (message: string, data?: any) => {
  console.log(`[EVMWallet Debug] ${message}`, data || '');
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

  @media (max-width: 768px) {
    padding: 15px 0;
    font-size: 14px;
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
`;

// Styled text for wallet info
const InfoText = styled(Text)`
  color: #69e9f5;
  font-size: 18px;
  margin-bottom: 12px;

  span {
    color: white;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    font-size: 16px;
  }
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

export function EVMWallet() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const chains = useChains();

  debug('Wallet State:', { address, isConnected, chainId });

  // Read total allocation and claimed amount
  const { data: allocationData, error: allocationError } = useReadContract({
    address: VESTING_CONTRACT_ADDRESS,
    abi: vestingContractABI,
    functionName: 'allocations',
    args: address ? [address.toLowerCase() as `0x${string}`] : undefined,
    query: { enabled: !!address }
  }) as { data: AllocationData | undefined, error: Error | null };

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
  const { data: claimableAmount, error: claimableError } = useReadContract({
    address: VESTING_CONTRACT_ADDRESS,
    abi: vestingContractABI,
    functionName: 'getClaimableAmount',
    args: address ? [address.toLowerCase() as `0x${string}`] : undefined,
    query: { enabled: !!address }
  }) as { data: bigint | undefined, error: Error | null };

  // Log claimable amount or error
  if (claimableAmount) {
    debug('Claimable Amount:', formatEther(claimableAmount));
  }
  if (claimableError) {
    debug('Claimable Error:', claimableError);
  }

  const { writeContract, isPending: isClaimLoading } = useWriteContract();

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
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="connect-button"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="connect-button"
                      style={{
                        backgroundImage: 'linear-gradient(90deg, #ff5e5e, #ff8f8f) !important',
                      }}
                    >
                      Wrong Network
                    </button>
                  );
                }

                return (
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="connect-button"
                  >
                    {account.displayName}
                  </button>
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
    if (!allocation?.totalAmount || allocation.totalAmount === BigInt(0)) return 0;
    return Number((allocation.claimedAmount * BigInt(100)) / allocation.totalAmount);
  };

  return (
    <RainbowKitProvider
      theme={epixTheme}
      avatar={CustomAvatar}
    >
      <WalletWrapper>
        <AppContainer>
          <Box display="flex" justifyContent="center" marginBottom="24px">
            <CustomConnectButton />
          </Box>

          {isConnected && (
            <>
              <WalletInfoContainer>
                <InfoText>Connected: <span>{address}</span></InfoText>
                <InfoText>Total Allocation: <span>{allocation?.totalAmount ? formatEther(allocation.totalAmount) : '0'} EPIX</span></InfoText>
                <InfoText>Claimed Amount: <span>{allocation?.claimedAmount ? formatEther(allocation.claimedAmount) : '0'} EPIX</span></InfoText>
                <InfoText>Available to Claim: <span>{claimableAmount ? formatEther(claimableAmount) : '0'} EPIX</span></InfoText>

                {allocation?.totalAmount && allocation.totalAmount > BigInt(0) && (
                  <ProgressIndicator>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${calculateProgress()}%` }}
                      />
                    </div>
                  </ProgressIndicator>
                )}

                <Box display="flex" justifyContent="center" gap="16px" flexWrap="wrap" marginTop="24px">
                  <StyledButton
                    onClick={handleClaim}
                    disabled={!claimableAmount || claimableAmount === BigInt(0) || isClaimLoading}
                  >
                    {isClaimLoading ? 'Claiming...' : 'Claim EPIX'}
                  </StyledButton>

                  <StyledButton onClick={() => disconnect()}>
                    Disconnect
                  </StyledButton>
                </Box>
              </WalletInfoContainer>

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