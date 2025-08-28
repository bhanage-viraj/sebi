use anchor_lang::prelude::*;

#[account]
pub struct Market {
    pub bond_mint: Pubkey,
    pub usdc_mint: Pubkey,
    pub price_per_token: u128,
    pub vault_bond: Pubkey,
    pub vault_usdc: Pubkey,
    pub admin: Pubkey,
    pub paused: bool,
    pub bump: u8,
}

impl Market {
    // 8 discriminator + fields:
    // 32*5 pubkeys = 160, price u128 = 16, paused u8 =1, bump u8 =1
    pub const LEN: usize = 8 + (32 * 5) + 16 + 1 + 1;
}
