use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token},
};
use crate::state::MarketState;

#[derive(Accounts)]
#[instruction(issuer_name: String, maturity_timestamp: i64, coupon_rate_bps: u16)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = MarketState::LEN,
        seeds = [b"market", bond_mint.key().as_ref()],
        bump
    )]
    pub market: Account<'info, MarketState>,

    /// CHECK: This authority PDA will own the AMM vaults.
    #[account(
        seeds = [b"authority", market.key().as_ref()],
        bump
    )]
    pub market_authority: AccountInfo<'info>,

    #[account(
        init,
        payer = admin,
        mint::decimals = 6, // All bonds have 6 decimals for fractionalization
        mint::authority = market_authority,
        mint::freeze_authority = market_authority
    )]
    pub bond_mint: Account<'info, Mint>,

    pub quote_mint: Account<'info, Mint>, // e.g., USDC mint

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
    let market = &mut ctx.accounts.market;
    
    market.admin = ctx.accounts.admin.key();
    market.bond_mint = ctx.accounts.bond_mint.key();
    market.quote_mint = ctx.accounts.quote_mint.key();
    market.issuer_name = issuer_name;
    market.maturity_timestamp = maturity_timestamp;
    market.coupon_rate_bps = coupon_rate_bps;
    market.market_bump = ctx.bumps.market;
    market.market_authority_bump = ctx.bumps.market_authority;

    emit!(MarketCreated {
        market_pda: market.key(),
        bond_mint: market.bond_mint,
        issuer_name: market.issuer_name.clone(),
    });

    Ok(())
}

#[event]
pub struct MarketCreated {
    pub market_pda: Pubkey,
    pub bond_mint: Pubkey,
    pub issuer_name: String,
}
