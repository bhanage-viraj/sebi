use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::Market;
use crate::errors::MarketError;

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut, seeds = [b"market", market.bond_mint.as_ref()], bump = market.bump)]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(mut, constraint = seller_bond.owner == seller.key())]
    pub seller_bond: Account<'info, TokenAccount>,

    #[account(mut, constraint = seller_usdc.owner == seller.key())]
    pub seller_usdc: Account<'info, TokenAccount>,

    #[account(mut, constraint = vault_bond.key() == market.vault_bond)]
    pub vault_bond: Account<'info, TokenAccount>,

    #[account(mut, constraint = vault_usdc.key() == market.vault_usdc)]
    pub vault_usdc: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Sell>, amount: u64) -> Result<()> {
    let market = &ctx.accounts.market;
    if market.paused {
        return err!(MarketError::MarketPaused);
    }

    let price_u128 = market.price_per_token;
    let amount_u128 = amount as u128;
    let total_price_u128 = price_u128.checked_mul(amount_u128).ok_or(MarketError::MathOverflow)?;
    let total_price_u64 = total_price_u128.try_into().map_err(|_| MarketError::MathOverflow)?;

    // transfer bond tokens from seller -> vault (seller signs)
    let cpi_accounts_bond = Transfer {
        from: ctx.accounts.seller_bond.to_account_info(),
        to: ctx.accounts.vault_bond.to_account_info(),
        authority: ctx.accounts.seller.to_account_info(),
    };
    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_bond),
        amount,
    )?;

    // ensure vault_usdc has enough balance (optional check)
    let vault_balance = ctx.accounts.vault_usdc.amount;
    if vault_balance < total_price_u64 {
        return err!(MarketError::InsufficientVaultFunds);
    }

    // transfer USDC from vault -> seller, signed by PDA
    let seeds = &[b"market", market.bond_mint.as_ref(), &[market.bump]];
    let signer = &[&seeds[..]];
    let cpi_accounts_usdc = Transfer {
        from: ctx.accounts.vault_usdc.to_account_info(),
        to: ctx.accounts.seller_usdc.to_account_info(),
        authority: ctx.accounts.market.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts_usdc, signer),
        total_price_u64,
    )?;

    emit!(TradeEvent {
        market: ctx.accounts.market.key(),
        trader: ctx.accounts.seller.key(),
        side: TradeSide::Sell,
        amount,
        price: price_u128,
    });

    Ok(())
}
