// File: programs/bond_factory/src/instructions/create_market.rs
use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, Token},
};
use crate::state::MarketState;

#[derive(Accounts)]
#[instruction(issuer_name: String)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    // FIX: The market PDA is now seeded with the issuer_name, which is known beforehand.
    // This removes the circular dependency.
    #[account(
        init,
        payer = admin,
        space = MarketState::LEN,
        seeds = [b"market".as_ref(), issuer_name.as_bytes()],
        bump
    )]
    pub market: Account<'info, MarketState>,

    // The mint for the new bond token. Its authority is the market_authority PDA,
    // and its address is derived from the market's key, making it unique and predictable.
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
    /// It will own the AMM vaults and act as the mint authority for the bond.
    #[account(
        seeds = [b"authority".as_ref(), market.key().as_ref()],
        bump
    )]
    pub market_authority: AccountInfo<'info>,

    // The mint for the quote currency (e.g., USDC).
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
    // --- Data Validation ---
    require!(issuer_name.len() <= 50, CustomError::IssuerNameTooLong);

    // --- Set Market State ---
    let market = &mut ctx.accounts.market;
    market.admin = ctx.accounts.admin.key();
    market.market_authority = ctx.accounts.market_authority.key();
    market.bond_mint = ctx.accounts.bond_mint.key();
    market.quote_mint = ctx.accounts.quote_mint.key();
    market.issuer_name = issuer_name;
    market.maturity_timestamp = maturity_timestamp;
    market.coupon_rate_bps = coupon_rate_bps;
    market.is_matured = false;
    
    // Store all bumps correctly.
    market.market_bump = ctx.bumps.market;
    market.market_authority_bump = ctx.bumps.market_authority;
    
    msg!("Market created for issuer: {}", market.issuer_name);
    Ok(())
}

#[error_code]
pub enum CustomError {
    #[msg("Issuer name cannot be longer than 50 characters.")]
    IssuerNameTooLong,
}

