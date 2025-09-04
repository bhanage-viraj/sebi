// packages/api/src/index.ts
import express from 'express';
import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
import { connectDB } from './db';
import { createMarket, getMarkets, getMarket } from './controllers/marketController';
import { createTransaction, getTransactions, getTransaction, updateTransactionStatus } from './controllers/transactionController';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// --- Database & Solana Connection ---
connectDB();

// Store Solana connection in app.locals to be accessible in controllers
app.locals.solanaConnection = new Connection(process.env.SOLANA_RPC_HOST || 'https://api.devnet.solana.com');

// --- Health Check ---
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bond Market API is running',
    timestamp: new Date().toISOString(),
    network: process.env.SOLANA_NETWORK || 'devnet'
  });
});

// --- Market Routes ---
app.post('/api/markets', createMarket);
app.get('/api/markets', getMarkets);
app.get('/api/markets/:marketId', getMarket);

// --- Transaction Routes ---
app.post('/api/transactions', createTransaction);
app.get('/api/transactions', getTransactions);
app.get('/api/transactions/:transactionId', getTransaction);
app.put('/api/transactions/:transactionId/status', updateTransactionStatus);

// --- Error Handling Middleware ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// --- 404 Handler ---
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Bond Market API server is running on http://localhost:${PORT}`);
  console.log(`📊 Network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
  console.log(`🔗 RPC: ${process.env.SOLANA_RPC_HOST || 'https://api.devnet.solana.com'}`);
});
