// packages/api/src/controllers/marketController.ts
import { Request, Response } from 'express';
import { Market, IMarket } from '../models/Market';
import { Connection, PublicKey } from '@solana/web3.js';
import { v4 as uuidv4 } from 'uuid';

interface CreateMarketRequest {
  issuer: string;
  bondName: string;
  bondSymbol: string;
  totalSupply: number;
  maturityDate: string;
  couponRate: number;
  faceValue: number;
  currentPrice: number;
}

export const createMarket = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      issuer,
      bondName,
      bondSymbol,
      totalSupply,
      maturityDate,
      couponRate,
      faceValue,
      currentPrice
    }: CreateMarketRequest = req.body;

    // Validate required fields
    if (!issuer || !bondName || !bondSymbol || !totalSupply || !maturityDate || 
        couponRate === undefined || !faceValue || !currentPrice) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    // Validate issuer is a valid Solana public key
    try {
      new PublicKey(issuer);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid issuer public key'
      });
      return;
    }

    // Validate maturity date is in the future
    const maturity = new Date(maturityDate);
    if (maturity <= new Date()) {
      res.status(400).json({
        success: false,
        error: 'Maturity date must be in the future'
      });
      return;
    }

    // Generate unique market ID
    const marketId = uuidv4();

    // Create market document
    const market: IMarket = new Market({
      marketId,
      issuer,
      bondName,
      bondSymbol,
      totalSupply,
      maturityDate: maturity,
      couponRate,
      faceValue,
      currentPrice,
      totalBondsIssued: 0,
      bondsSold: 0,
      status: 'active'
    });

    // Save to database
    await market.save();

    console.log(`✅ Market created successfully: ${marketId}`);

    res.status(201).json({
      success: true,
      data: {
        marketId: market.marketId,
        issuer: market.issuer,
        bondName: market.bondName,
        bondSymbol: market.bondSymbol,
        totalSupply: market.totalSupply,
        maturityDate: market.maturityDate,
        couponRate: market.couponRate,
        faceValue: market.faceValue,
        currentPrice: market.currentPrice,
        status: market.status,
        createdAt: market.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error creating market:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getMarkets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { issuer, status, limit = 20, offset = 0 } = req.query;

    // Build query
    const query: any = {};
    if (issuer) query.issuer = issuer;
    if (status) query.status = status;

    // Execute query with pagination
    const markets = await Market
      .find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .exec();

    const total = await Market.countDocuments(query);

    res.status(200).json({
      success: true,
      data: markets,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });

  } catch (error) {
    console.error('❌ Error fetching markets:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getMarket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { marketId } = req.params;

    const market = await Market.findOne({ marketId }).exec();

    if (!market) {
      res.status(404).json({
        success: false,
        error: 'Market not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: market
    });

  } catch (error) {
    console.error('❌ Error fetching market:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
