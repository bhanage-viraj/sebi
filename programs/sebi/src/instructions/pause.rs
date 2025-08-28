use anchor_lang::prelude::*;
use crate::state::Market;
use crate::errors::MarketError;

#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(mut, has_one = admin)]
    pub market: Account<'info, Market>,
    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<Pause>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    if ctx.accounts.admin.key() != market.admin {
        return err!(MarketError::Unauthorized);
    }
    market.paused = !market.paused;
    msg!("Paused state: {}", market.paused);
    Ok(())
}
