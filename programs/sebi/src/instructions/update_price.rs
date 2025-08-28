use anchor_lang::prelude::*;
use crate::state::Market;
use crate::errors::MarketError;

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(mut, has_one = admin)]
    pub market: Account<'info, Market>,
    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<UpdatePrice>, new_price: u128) -> Result<()> {
    let market = &mut ctx.accounts.market;
    if ctx.accounts.admin.key() != market.admin {
        return err!(MarketError::Unauthorized);
    }
    market.price_per_token = new_price;
    msg!("Price updated to {}", new_price);
    Ok(())
}
