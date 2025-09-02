// File: programs/bond_factory/src/state.rs
use anchor_lang::prelude::*;

#[account]
pub struct MarketState {
    pub admin: Pubkey,
    pub market_authority: Pubkey, // PDA to sign for minting
    pub bond_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub issuer_name: String, // Max 50 chars
    pub maturity_timestamp: i64,
    pub coupon_rate_bps: u16,
    pub is_matured: bool,
    pub bump: u8,
}

impl MarketState {
    // We calculate the size of the account struct to allocate on-chain.
    // 8 bytes for the discriminator (standard for every Anchor account).
    // Pubkey = 32 bytes.
    // String = 4 bytes for length prefix + max characters.
    // i64 = 8 bytes.
    // u16 = 2 bytes.
    // bool = 1 byte.
    // u8 = 1 byte.
    pub const LEN: usize = 8 + (32 * 4) + (4 + 50) + 8 + 2 + 1 + 1;
}

