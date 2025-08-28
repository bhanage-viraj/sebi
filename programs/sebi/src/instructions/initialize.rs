use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::Market;

#[derive(Accounts)]
#[instruction(price_per_token: u128)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = admin,
        space = Market::LEN,
        seeds = [b"market", bond_mint.key().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    /// CHECK: provided by admin, we just store its key
    pub bond_mint: Account<'info, Mint>,

    /// CHECK: USDC mint
    pub usdc_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        token::mint = bond_mint,
        token::authority = market
    )]
    pub vault_bond: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        token::mint = usdc_mint,
        token::authority = market
    )]
    pub vault_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializeMarket>, price_per_token: u128) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.bond_mint = ctx.accounts.bond_mint.key();
    market.usdc_mint = ctx.accounts.usdc_mint.key();
    market.price_per_token = price_per_token;
    market.vault_bond = ctx.accounts.vault_bond.key();
    market.vault_usdc = ctx.accounts.vault_usdc.key();
    market.admin = ctx.accounts.admin.key();
    market.paused = false;
    market.bump = *ctx.bumps.get("market").unwrap();

    msg!("Market initialized at price: {}", price_per_token);
    Ok(())
}
