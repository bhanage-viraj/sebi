// packages/api/src/models/marketModel.ts
import mongoose, { Schema, Document } from 'mongoose';

// Interface describing the Market document for TypeScript
export interface IMarket extends Document {
  marketPda: string;
  bondMint: string;
  issuerName: string;
  couponRateBps: number;
  maturityTimestamp: Date;
  currentPrice: number;
  dailyVolume: number;
  ytm: number;
  createdAt: Date;
}

const MarketSchema: Schema = new Schema({
  marketPda: { type: String, required: true, unique: true, index: true },
  bondMint: { type: String, required: true, unique: true },
  issuerName: { type: String, required: true },
  couponRateBps: { type: Number, required: true },
  maturityTimestamp: { type: Date, required: true },
  // Default values for fields that will be updated by the indexer
  currentPrice: { type: Number, default: 1.0 },
  dailyVolume: { type: Number, default: 0 },
  ytm: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IMarket>('Market', MarketSchema);
