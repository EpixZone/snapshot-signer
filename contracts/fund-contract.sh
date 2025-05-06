#!/bin/bash

# Check if contract address is provided
if [ -z "$1" ]; then
  echo "Error: Contract address is required"
  echo "Usage: ./fund-contract.sh <contract-address> [amount] [network]"
  exit 1
fi

# Set default network to epixTestnet if not provided
NETWORK=${3:-epixTestnet}

# Run the script with the provided contract address and optional amount
if [ -n "$2" ]; then
  # If amount is provided
  CONTRACT_ADDRESS=$1 AMOUNT=$2 npx hardhat run scripts/fundContract.js --network $NETWORK
else
  # If amount is not provided, calculate from allocations
  CONTRACT_ADDRESS=$1 npx hardhat run scripts/fundContract.js --network $NETWORK
fi
