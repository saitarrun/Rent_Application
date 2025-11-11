require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

const { PRIVATE_KEY, SEPOLIA_RPC } = process.env;

module.exports = {
  contracts_directory: './contracts',
  contracts_build_directory: './build',
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '1337',
      gas: 11500000,
      gasPrice: 20_000_000_000,
      evmVersion: 'paris'
    },
    sepolia: {
      provider: () =>
        new HDWalletProvider({
          privateKeys: PRIVATE_KEY ? [PRIVATE_KEY] : [],
          providerOrUrl: SEPOLIA_RPC,
          pollingInterval: 8000
        }),
      network_id: 11155111,
      gas: 11500000,
      gasPrice: 20_000_000_000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: '0.8.24',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: 'paris'
      }
    }
  }
};
