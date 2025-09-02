use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct MarketState {
    /// The authority that can make administrative changes to the market.
    pub admin: Pubkey,
    /// The mint of the bond token. Each bond has a unique token.
    pub bond_mint: Pubkey,
    /// The mint of the quote token, typically USDC.
    pub quote_mint: Pubkey,
    /// The issuer of the bond (e.g., "Ambuja Cements"). Max 32 chars.
    pub issuer_name: String,
    /// The timestamp when the bond matures and can be redeemed.
    pub maturity_timestamp: i64,
    /// The annual interest rate in basis points (e.g., 850 for 8.5%).
    pub coupon_rate_bps: u16,
    /// PDA bump seed for the market state account.
    pub market_bump: u8,
    /// PDA bump seed for the authority that will control vaults.
    pub market_authority_bump: u8,
}

impl MarketState {
    // Calculate the space needed for the account
    // 8 (discriminator) + 32 (admin) + 32 (bond_mint) + 32 (quote_mint) +
    // 4 + 32 (issuer_name) + 8 (maturity_timestamp) + 2 (coupon_rate_bps) +
    // 1 (market_bump) + 1 (market_authority_bump)
    pub const LEN: usize = 8 + 32 + 32 + 32 + 4 + 32 + 8 + 2 + 1 + 1;
}
