# EPIX Token Vesting Contract

This project contains a smart contract for vesting EPIX tokens over a 1-year period. It includes special allocation for a bizdev partner with conditional claiming rules.

## Features

- Linear vesting over 1 year (90% of tokens)
- Special allocation for bizdev partner (150k EPIX with pause functionality)
- 50k EPIX bonus for bizdev partner that can be unlocked manually
- Ability to load allocations from a JSON file

## Setup

1. Install dependencies:

   ```shell
   npm install
   ```

2. Create a `.env` file with your private key:

   ```shell
   PRIVATE_KEY=your_private_key_here
   ```

3. Update the `allocations.json` file with your token allocations.

## Commands

```shell
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet
npx hardhat run scripts/deploy/deployVesting.js --network epixTestnet

# Deploy to mainnet
npx hardhat run scripts/deploy/deployVesting.js --network epixMainnet

# Load allocations to an existing contract
npx hardhat run scripts/loadAllocations.js --network epixTestnet 0xContractAddress
```

## Contract Structure

The main contract is `EPIXVesting.sol`, which handles:

1. Token vesting over a 1-year period
2. Special allocation for bizdev partner
3. Bonus allocation that can be unlocked
4. Pausing/resuming claiming for bizdev partner
