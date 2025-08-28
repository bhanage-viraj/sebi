use anchor_lang::prelude::*;
pub mod state;
pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("FPrNfqSjEL59H3PAEzXK9gU9VwAFXLrMwyFeNZ3dKb7o");

#[program]
pub mod sebi {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        price_per_token: u128,
    ) -> Result<()> {
        initialize::handler(ctx, price_per_token)
    }

    pub fn buy(ctx: Context<Buy>, amount: u64) -> Result<()> {
        buy::handler(ctx, amount)
    }

    pub fn sell(ctx: Context<Sell>, amount: u64) -> Result<()> {
        sell::handler(ctx, amount)
    }

    pub fn update_price(ctx: Context<UpdatePrice>, new_price: u128) -> Result<()> {
        update_price::handler(ctx, new_price)
    }

    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        pause::handler(ctx)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64, is_usdc: bool) -> Result<()> {
        withdraw::handler(ctx, amount, is_usdc)
    }
}

// Re-export contexts for use in modules
pub use instructions::initialize::InitializeMarket;
pub use instructions::buy::Buy;
pub use instructions::sell::Sell;
pub use instructions::update_price::UpdatePrice;
pub use instructions::pause::Pause;
pub use instructions::withdraw::Withdraw;
