use anchor_lang::prelude::*;

#[account]
pub struct Market {
    pub bond_mint: Pubkey,
    pub usdc_mint: Pubkey,
    pub price_per_token: u64, // CHANGED from u128 to u64
    pub vault_bond: Pubkey,
    pub vault_usdc: Pubkey,
    pub admin: Pubkey,
    pub paused: bool,
    pub bump: u8,
}

impl Market {
    // 8 discriminator + (32 * 5 pubkeys) + 8 (u64 price) + 1 (bool) + 1 (bump)
    pub const LEN: usize = 8 + (32 * 5) + 8 + 1 + 1;
}