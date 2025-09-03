# Bond Market Client

A TypeScript client for interacting with Bond Market Solana programs, including Bond Factory and Bond AMM (Automated Market Maker) functionality.

## Features

- **Bond Factory Integration**: Create and manage bonds with customizable parameters
- **Bond AMM Integration**: Create liquidity pools and perform swaps
- **TypeScript Support**: Full type safety and IntelliSense support
- **Error Handling**: Comprehensive error handling with detailed error messages
- **Solana Integration**: Built on top of Solana Web3.js and Anchor frameworks

## Installation

```bash
npm install @bond-market/client
# or
yarn add @bond-market/client
# or
pnpm add @bond-market/client
```

## Dependencies

This package requires the following peer dependencies:
- `@coral-xyz/anchor` ^0.31.1
- `@solana/web3.js` ^1.87.0
- `@solana/spl-token` ^0.4.8

## Usage

### Basic Setup

```typescript
import { BondMarketClient, createBondMarketClient } from '@bond-market/client';
import { Connection, Keypair } from '@solana/web3.js';

// Create a connection to Solana
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Create a wallet (in production, use proper wallet management)
const wallet = Keypair.generate();

// Create the client
const client = createBondMarketClient(connection, wallet);
```

### Creating Markets

```typescript
import { BN } from '@coral-xyz/anchor';

const marketParams = {
  issuerName: "USDC Bond 2024",
  maturityTimestamp: new BN(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60), // 1 year from now
  couponRateBps: 500, // 5% (500 basis points)
};

const result = await client.createMarket(marketParams, wallet);
if (result.success) {
  console.log('Market created successfully!');
  console.log('Market:', result.market.toString());
  console.log('Bond Mint:', result.bondMint.toString());
  console.log('Market Authority:', result.marketAuthority.toString());
  console.log('Transaction:', result.transaction);
} else {
  console.error('Failed to create market:', result.error);
}
```

### Initializing AMM

```typescript
const ammParams = {
  market: market, // From previous market creation
  bondMint: bondMint, // From previous market creation
  quoteMint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
};

const ammResult = await client.initializeAmm(ammParams, wallet);
if (ammResult.success) {
  console.log('AMM initialized successfully!');
  console.log('AMM State:', ammResult.ammState.toString());
} else {
  console.error('Failed to initialize AMM:', ammResult.error);
}
```

### Performing Swaps

```typescript
const swapParams = {
  amountIn: new BN(1000000), // 1 USDC
  swapForBond: true, // Buying bonds with USDC
};

const swapResult = await client.swap(
  ammState, 
  swapParams, 
  wallet,
  market,
  bondMint,
  quoteMint
);
if (swapResult.success) {
  console.log('Swap completed successfully!');
  console.log('Transaction:', swapResult.transaction);
} else {
  console.error('Swap failed:', swapResult.error);
}
```

### Querying Information

```typescript
// Get market information
const marketInfo = await client.getMarketInfo(market);
if (marketInfo.success) {
  console.log('Market Info:', marketInfo.marketInfo);
}

// Get AMM information
const ammInfo = await client.getAmmInfo(ammState);
if (ammInfo.success) {
  console.log('AMM Info:', ammInfo.ammInfo);
}
```

## API Reference

### BondMarketClient Class

#### Constructor
- `connection`: Solana connection instance
- `wallet`: Keypair for signing transactions
- `opts`: Optional configuration options

#### Methods

##### Bond Factory Methods
- `createMarket(marketParams, admin)`: Create a new bond market
- `getMarketInfo(market)`: Get information about a market

##### Bond AMM Methods
- `initializeAmm(ammParams, admin)`: Initialize AMM for a market
- `swap(ammState, swapParams, user, market, bondMint, quoteMint)`: Perform a swap
- `getAmmInfo(ammState)`: Get information about an AMM

##### Utility Methods
- `getConnection()`: Get the Solana connection
- `getProvider()`: Get the Anchor provider
- `getBondFactoryProgram()`: Get the bond factory program instance
- `getBondAMMProgram()`: Get the bond AMM program instance

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Cleaning

```bash
npm run clean
```

## License

ISC

## Contributing

This package is part of the Bond Market project. Please refer to the main project repository for contribution guidelines.
