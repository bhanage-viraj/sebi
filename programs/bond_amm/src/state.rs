// File: programs/bond_amm/src/state.rs
use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct AmmState {
    /// The associated market state account with all the bond's details.
    pub market: Pubkey,
    /// The bump seed for the AMM state account.
    pub amm_bump: u8,
}

// Mirror of factory MarketState fields required by AMM
#[account]
pub struct MarketState {
    pub admin: Pubkey,
    pub market_authority: Pubkey,
    pub bond_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub issuer_name: String,
    pub maturity_timestamp: i64,
    pub coupon_rate_bps: u16,
    pub is_matured: bool,
    pub market_bump: u8,
    pub market_authority_bump: u8,
}

impl AmmState {
    // 8 (discriminator) + 32 (market) + 1 (bump)
    pub const LEN: usize = 8 + 32 + 1;
}

#[account]
#[derive(Default)]
pub struct CouponClaimState {
    /// The period for which the coupon was claimed.
    pub claim_period: u8,
    /// Bump seed for the claim state account.
    pub bump: u8,
}

impl CouponClaimState {
    // 8 (discriminator) + 1 (period) + 1 (bump)
    pub const LEN: usize = 8 + 1 + 1;
}

