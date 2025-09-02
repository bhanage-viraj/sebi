use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("FACToRYprx1CrxGusn31G4eQJ5z2t4s2jF9s3jG4eQJ5z");

#[program]
pub mod bond_factory {
    use super::*;

    /// Creates a new bond market.
    /// This function initializes a new SPL token for the bond,
    /// creates a market state account to hold its metadata,
    /// and sets up a PDA to act as the authority for the market's vaults.
    pub fn create_market(
        ctx: Context<CreateMarket>,
        issuer_name: String,
        maturity_timestamp: i64,
        coupon_rate_bps: u16,
    ) -> Result<()> {
        instructions::create_market::handler(
            ctx,
            issuer_name,
            maturity_timestamp,
            coupon_rate_bps
        )
    }
}
