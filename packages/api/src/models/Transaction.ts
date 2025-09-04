// packages/api/src/models/Transaction.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  transactionId: string;
  marketId: string;
  buyer: string;
  seller?: string;
  transactionType: 'buy' | 'sell' | 'coupon_claim' | 'redeem';
  bondQuantity: number;
  pricePerBond: number;
  totalAmount: number;
  solanaTransactionHash: string;
  blockNumber?: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
  confirmedAt?: Date;
}

const TransactionSchema: Schema = new Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  marketId: {
    type: String,
    required: true,
    index: true
  },
  buyer: {
    type: String,
    required: true,
    index: true
  },
  seller: {
    type: String,
    sparse: true,
    index: true
  },
  transactionType: {
    type: String,
    enum: ['buy', 'sell', 'coupon_claim', 'redeem'],
    required: true,
    index: true
  },
  bondQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  pricePerBond: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  solanaTransactionHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  blockNumber: {
    type: Number,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
    index: true
  },
  confirmedAt: {
    type: Date,
    sparse: true
  }
}, {
  timestamps: true,
  collection: 'transactions'
});

// Compound indexes for better query performance
TransactionSchema.index({ marketId: 1, transactionType: 1 });
TransactionSchema.index({ buyer: 1, status: 1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ solanaTransactionHash: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
