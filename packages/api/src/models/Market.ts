// packages/api/src/models/Market.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IMarket extends Document {
  marketId: string;
  issuer: string;
  bondName: string;
  bondSymbol: string;
  totalSupply: number;
  maturityDate: Date;
  couponRate: number;
  faceValue: number;
  currentPrice: number;
  totalBondsIssued: number;
  bondsSold: number;
  status: 'active' | 'matured' | 'paused';
  createdAt: Date;
  updatedAt: Date;
  solanaTransactionHash?: string;
  marketAccount?: string;
}

const MarketSchema: Schema = new Schema({
  marketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  issuer: {
    type: String,
    required: true,
    index: true
  },
  bondName: {
    type: String,
    required: true
  },
  bondSymbol: {
    type: String,
    required: true
  },
  totalSupply: {
    type: Number,
    required: true,
    min: 0
  },
  maturityDate: {
    type: Date,
    required: true
  },
  couponRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  faceValue: {
    type: Number,
    required: true,
    min: 0
  },
  currentPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalBondsIssued: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  bondsSold: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'matured', 'paused'],
    default: 'active'
  },
  solanaTransactionHash: {
    type: String,
    sparse: true
  },
  marketAccount: {
    type: String,
    sparse: true
  }
}, {
  timestamps: true,
  collection: 'markets'
});

// Indexes for better query performance
MarketSchema.index({ issuer: 1, status: 1 });
MarketSchema.index({ maturityDate: 1 });
MarketSchema.index({ createdAt: -1 });

export const Market = mongoose.model<IMarket>('Market', MarketSchema);
