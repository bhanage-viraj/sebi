use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::Market;
use crate::errors::MarketError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, has_one = admin)]
    pub market: Account<'info, Market>,
    pub admin: Signer<'info>,

    #[account(mut, constraint = destination.owner == admin.key())]
    pub destination: Account<'info, TokenAccount>,

    #[account(mut, constraint = vault_bond.key() == market.vault_bond)]
    pub vault_bond: Account<'info, TokenAccount>,

    #[account(mut, constraint = vault_usdc.key() == market.vault_usdc)]
    pub vault_usdc: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Withdraw>, amount: u64, is_usdc: bool) -> Result<()> {
    let market = &ctx.accounts.market;
    if ctx.accounts.admin.key() != market.admin {
        return err!(MarketError::Unauthorized);
    }
    let seeds = &[b"market", market.bond_mint.as_ref(), &[market.bump]];
    let signer = &[&seeds[..]];

    if is_usdc {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_usdc.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;
    } else {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_bond.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;
    }

    Ok(())
}
