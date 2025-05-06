import { useAccount, useDisconnect, useChainId, useChains } from 'wagmi';
import { useReadContract, useWriteContract } from 'wagmi';
import { formatEther } from 'viem';
import { Box, Stack, Button, Text } from "@interchain-ui/react";
import styled from "styled-components";
import { ConnectButton, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';

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

  return (
    <RainbowKitProvider chains={chains} theme={darkTheme()}>
      <Box p="$4">
        <ConnectButton />
        {isConnected && (
          <Stack direction="vertical" space="$4">
            <Text>Connected: {address}</Text>
            <Text>Total Allocation: {allocation?.totalAmount ? formatEther(allocation.totalAmount) : '0'} EPIX</Text>
            <Text>Claimed Amount: {allocation?.claimedAmount ? formatEther(allocation.claimedAmount) : '0'} EPIX</Text>
            <Text>Available to Claim: {claimableAmount ? formatEther(claimableAmount) : '0'} EPIX</Text>
            <StyledButton 
              onClick={handleClaim} 
              disabled={!claimableAmount || claimableAmount === BigInt(0) || isClaimLoading}
            >
              {isClaimLoading ? 'Claiming...' : 'Claim EPIX'}
            </StyledButton>
            <StyledButton onClick={() => disconnect()}>
              Disconnect
            </StyledButton>
          </Stack>
        )}
      </Box>
    </RainbowKitProvider>
  );
} 