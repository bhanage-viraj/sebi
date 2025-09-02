// File: programs/bond_amm/src/lib.rs
use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod constants;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWxTWqk6W2BeZ7FEfcYkgSQhZt5v");

#[program]
pub mod bond_amm {
    use super::*;

    /// Initializes the AMM for a specific market, creating the vaults.
    pub fn initialize_amm(ctx: Context<InitializeAmm>) -> Result<()> {
        instructions::swap::handle_initialize_amm(ctx)
    }

    /// Swaps one token for another in the liquidity pool.
    pub fn swap(ctx: Context<Swap>, amount_in: u64, swap_for_bond: bool) -> Result<()> {
        instructions::swap::handle_swap(ctx, amount_in, swap_for_bond)
    }
}


