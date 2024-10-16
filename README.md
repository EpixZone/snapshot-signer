# Wallet Eligibility and Claim Application

## Overview
This project is a wallet eligibility and claim application for users to verify an x42 wallet address, connect their wallet, and claim EPIX tokens. The application guides users through three main steps:

1. Checking the eligibility of their wallet address.
2. Connecting their wallet.
3. Verifying their signature and claiming the EPIX tokens.

The application is built with React, leveraging the Interchain UI, Cosmos Kit, and Axios for API requests.

## Features
- **Three-Step Process**: Guides the user through eligibility checking, wallet connection, and claiming.
- **API Integration**: Validates wallet address eligibility and claims via HTTP requests to backend services.
- **User Feedback**: Provides clear messaging to the user for each step, including eligibility status and claim results.

## Project Structure
- `components/`
  - `User.js`: Component to display user information.
  - `Chain.js`: Component to display blockchain information.
  - `Warning.js`: Component to display warning messages.
  - `Connect.js`: Various button components for managing wallet connection states.
- `utils/`
  - `getChainLogo.js`: Utility to fetch the chain logo.
- `config/`
  - `CHAIN_NAME.js`: Configuration for the chain name.

## Installation
1. **Clone the repository**
   ```sh
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install dependencies**
   Ensure you have `yarn` or `npm` installed, then run:
   ```sh
   yarn install
   ```
   or
   ```sh
   npm install
   ```

## Usage
1. **Start the development server**
   ```sh
   yarn dev
   ```
   or
   ```sh
   npm run dev
   ```

2. **Access the Application**
   Open your browser and navigate to `http://localhost:3000` to access the application.

## Application Workflow
1. **Step 1: Eligibility Check**
   - The user enters their x42 wallet address in the input field and clicks "Check Eligibility."
   - An API call checks if the address is valid, whether it is a SegWit address, and whether it has a sufficient balance.

2. **Step 2: Connect Wallet**
   - If eligible, the user proceeds to connect their wallet using the displayed connect button.
   - The app utilizes Cosmos Kit to manage wallet connections.

3. **Step 3: Verify & Claim**
   - The user signs a message and inputs the signature.
   - The "Validate and Claim your EPIX" button sends the signature and other data to verify and claim tokens.

## API Endpoints
- **Eligibility Check**: `https://snapapi.epix.zone/verify-address?address=<walletAddress>`
- **Balance Check**: `https://x42.blockcore-indexer.silknodes.io/api/query/addresses/balance`
- **Claim Verification**: `https://snapapi.epix.zone/verify-snapshot`

## Notes
- Place the instruction images (`Sign-With-Wallet.png` and `Copy-Signature.png`) in the `/public/images/` directory.
- The app uses Axios for HTTP requests and handles both eligibility and claim verification.

## Styling
- The application uses the Interchain UI components for a consistent look and feel.
- Color modes (`useColorModeValue`) are used to ensure a good experience for both light and dark themes.

## Dependencies
- **React**: Front-end library for building the UI.
- **Cosmos Kit**: Wallet integration for Cosmos-based blockchains.
- **Axios**: HTTP client for API requests.
