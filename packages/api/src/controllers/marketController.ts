// packages/api/src/controllers/marketController.ts
import { Request, Response } from 'express';
import { BN } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import { BondMarketClient } from '@bond-market/client';
import Market from '../models/marketModel';

// This should come from a secure secret manager or .env file in production
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
if (!ADMIN_SECRET_KEY) {
  throw new Error('ADMIN_SECRET_KEY is not set in environment variables.');
}
const adminWallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(ADMIN_SECRET_KEY)));

export const createMarket = async (req: Request, res: Response) => {
  try {
    const { issuerName, maturityTimestamp, couponRateBps, quoteMint } = req.body;

    // --- Input Validation ---
    if (!issuerName || !maturityTimestamp || couponRateBps === undefined || !quoteMint) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Initialize the client
    // This assumes the client is configured for the correct network (e.g., devnet)
    const client = new BondMarketClient(req.app.locals.solanaConnection, adminWallet);

    // --- On-Chain Interaction ---
    const result = await client.createMarket({
      issuerName,
      maturityTimestamp: new BN(maturityTimestamp),
      couponRateBps,
      quoteMint, // The public key of the quote mint (e.g., USDC)
    });

    if (!result.success || !result.marketPda || !result.bondMint) {
      return res.status(500).json({ error: 'Failed to create market on-chain.', details: result.error });
    }

    // --- Database Interaction ---
    const newMarket = new Market({
      marketPda: result.marketPda.toBase58(),
      bondMint: result.bondMint.toBase58(),
      issuerName,
      couponRateBps,
      maturityTimestamp: new Date(maturityTimestamp * 1000), // Convert Unix timestamp to JS Date
    });

    await newMarket.save();

    res.status(201).json({
      message: 'Market created successfully',
      market: newMarket,
      transactionSignature: result.transactionSignature,
    });

  } catch (error) {
    console.error('Error in createMarket controller:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};
