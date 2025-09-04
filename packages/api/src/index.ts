// packages/api/src/index.ts
import express from 'express';
import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
import { connectDB } from './db';
import { createMarket } from './controllers/marketController';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(express.json());

// --- Database & Solana Connection ---
connectDB();
// Store Solana connection in app.locals to be accessible in controllers
app.locals.solanaConnection = new Connection(process.env.SOLANA_RPC_HOST || 'https://api.devnet.solana.com');


// --- API Routes ---
app.post('/markets', createMarket);


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`API server is running on http://localhost:${PORT}`);
});
