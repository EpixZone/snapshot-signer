#!/bin/bash

# Check if contract address is provided
if [ -z "$1" ]; then
  echo "Error: Contract address is required"
  echo "Usage: ./load-allocations.sh <contract-address> [network]"
  exit 1
fi

# Set default network to epixTestnet if not provided
NETWORK=${2:-epixTestnet}

# Run the script with the provided contract address
CONTRACT_ADDRESS=$1 npx hardhat run scripts/loadAllocations.js --network $NETWORK

echo "Allocations loaded successfully for contract: $1 on network: $NETWORK"
