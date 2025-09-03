// File: programs/bond_factory/src/instructions/create_market.rs
use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, Token},
};
use crate::state::MarketState;

// FIX: The instruction macro must list ALL arguments passed to the handler.
#[derive(Accounts)]
#[instruction(issuer_name: String, maturity_timestamp: i64, coupon_rate_bps: u16)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = MarketState::LEN,
        seeds = [b"market".as_ref(), issuer_name.as_bytes()],
        bump
    )]
    pub market: Account<'info, MarketState>,

    #[account(
        init,
        payer = admin,
        mint::decimals = 6,
        mint::authority = market_authority,
        seeds = [b"bond_mint".as_ref(), market.key().as_ref()],
        bump
    )]
    pub bond_mint: Account<'info, Mint>,

    /// CHECK: The authority PDA is derived from the market account's key.
    #[account(
        seeds = [b"authority".as_ref(), market.key().as_ref()],
        bump
    )]
    pub market_authority: AccountInfo<'info>,

    pub quote_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    issuer_name: String,
    maturity_timestamp: i64,
    coupon_rate_bps: u16,
) -> Result<()> {
    require!(issuer_name.len() <= 50, CustomError::IssuerNameTooLong);

    let market = &mut ctx.accounts.market;
    market.admin = ctx.accounts.admin.key();
    market.market_authority = ctx.accounts.market_authority.key();
    market.bond_mint = ctx.accounts.bond_mint.key();
    market.quote_mint = ctx.accounts.quote_mint.key();
    market.issuer_name = issuer_name;
    market.maturity_timestamp = maturity_timestamp;
    market.coupon_rate_bps = coupon_rate_bps;
    market.is_matured = false;
    
    market.market_bump = *ctx.bumps.get("market").unwrap();
    market.market_authority_bump = *ctx.bumps.get("market_authority").unwrap();
    
    msg!("Market created for issuer: {}", market.issuer_name);
    Ok(())
}

#[error_code]
pub enum CustomError {
    #[msg("Issuer name cannot be longer than 50 characters.")]
    IssuerNameTooLong,
}

