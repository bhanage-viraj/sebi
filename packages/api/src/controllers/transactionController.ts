// packages/api/src/controllers/transactionController.ts
import { Request, Response } from 'express';
import { Transaction, ITransaction } from '../models/Transaction';
import { Market } from '../models/Market';
import { Connection, PublicKey } from '@solana/web3.js';
import { v4 as uuidv4 } from 'uuid';

interface CreateTransactionRequest {
  marketId: string;
  buyer: string;
  seller?: string;
  transactionType: 'buy' | 'sell' | 'coupon_claim' | 'redeem';
  bondQuantity: number;
  pricePerBond: number;
  solanaTransactionHash: string;
}

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      marketId,
      buyer,
      seller,
      transactionType,
      bondQuantity,
      pricePerBond,
      solanaTransactionHash
    }: CreateTransactionRequest = req.body;

    // Validate required fields
    if (!marketId || !buyer || !transactionType || !bondQuantity || !pricePerBond || !solanaTransactionHash) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    // Validate buyer is a valid Solana public key
    try {
      new PublicKey(buyer);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid buyer public key'
      });
      return;
    }

    // Validate seller if provided
    if (seller) {
      try {
        new PublicKey(seller);
      } catch (error) {
        res.status(400).json({
          success: false,
          error: 'Invalid seller public key'
        });
        return;
      }
    }

    // Check if market exists
    const market = await Market.findOne({ marketId }).exec();
    if (!market) {
      res.status(404).json({
        success: false,
        error: 'Market not found'
      });
      return;
    }

    // Calculate total amount
    const totalAmount = bondQuantity * pricePerBond;

    // Generate unique transaction ID
    const transactionId = uuidv4();

    // Create transaction document
    const transaction: ITransaction = new Transaction({
      transactionId,
      marketId,
      buyer,
      seller,
      transactionType,
      bondQuantity,
      pricePerBond,
      totalAmount,
      solanaTransactionHash,
      status: 'pending'
    });

    // Save to database
    await transaction.save();

    console.log(`✅ Transaction created successfully: ${transactionId}`);

    res.status(201).json({
      success: true,
      data: {
        transactionId: transaction.transactionId,
        marketId: transaction.marketId,
        buyer: transaction.buyer,
        seller: transaction.seller,
        transactionType: transaction.transactionType,
        bondQuantity: transaction.bondQuantity,
        pricePerBond: transaction.pricePerBond,
        totalAmount: transaction.totalAmount,
        solanaTransactionHash: transaction.solanaTransactionHash,
        status: transaction.status,
        createdAt: transaction.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { marketId, buyer, seller, transactionType, status, limit = 20, offset = 0 } = req.query;

    // Build query
    const query: any = {};
    if (marketId) query.marketId = marketId;
    if (buyer) query.buyer = buyer;
    if (seller) query.seller = seller;
    if (transactionType) query.transactionType = transactionType;
    if (status) query.status = status;

    // Execute query with pagination
    const transactions = await Transaction
      .find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .exec();

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });

  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({ transactionId }).exec();

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('❌ Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const updateTransactionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId } = req.params;
    const { status, blockNumber } = req.body;

    if (!status || !['pending', 'confirmed', 'failed'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
      return;
    }

    const updateData: any = { status };
    if (status === 'confirmed') {
      updateData.confirmedAt = new Date();
      if (blockNumber) {
        updateData.blockNumber = blockNumber;
      }
    }

    const transaction = await Transaction.findOneAndUpdate(
      { transactionId },
      updateData,
      { new: true }
    ).exec();

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('❌ Error updating transaction status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
