require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    epixTestnet: {
      url: "https://evmrpc.testnet.epix.zone/",
      chainId: 1917,
      accounts: [PRIVATE_KEY],
    },
    epixMainnet: {
      url: "https://evmrpc.epix.zone/",
      chainId: 1915, // Assuming mainnet chainId is 1915, adjust if different
      accounts: [PRIVATE_KEY],
    },
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      "epix-testnet": "epix",
    },
    customChains: [
      {
        network: "epix-testnet",
        chainId: 1917,
        urls: {
          apiURL: "https://testscan.epix.zone/api/",
          browserURL: "https://testscan.epix.zone/",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
