use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::Market;
use crate::errors::MarketError;

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut, seeds = [b"market", market.bond_mint.as_ref()], bump = market.bump)]
    pub market: Account<'info, Market>,

    /// Buyer (signer)
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut, constraint = buyer_usdc.owner == buyer.key())]
    pub buyer_usdc: Account<'info, TokenAccount>,

    #[account(mut, constraint = buyer_bond.owner == buyer.key())]
    pub buyer_bond: Account<'info, TokenAccount>,

    /// Vault token accounts owned by market PDA
    #[account(mut, constraint = vault_usdc.key() == market.vault_usdc)]
    pub vault_usdc: Account<'info, TokenAccount>,

    #[account(mut, constraint = vault_bond.key() == market.vault_bond)]
    pub vault_bond: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Buy>, amount: u64) -> Result<()> {
    let market = &ctx.accounts.market;
    if market.paused {
        return err!(MarketError::MarketPaused);
    }

    // price_per_token is u128; compute total_price = amount * price
    let price_u128 = market.price_per_token;
    let amount_u128 = amount as u128;
    let total_price_u128 = price_u128.checked_mul(amount_u128).ok_or(MarketError::MathOverflow)?;

    // assume USDC decimals are 6: total_price_u128 already scaled appropriately by admin
    let total_price_u64 = total_price_u128.try_into().map_err(|_| MarketError::MathOverflow)?;

    // transfer USDC from buyer -> vault_usdc
    let cpi_accounts_usdc = Transfer {
        from: ctx.accounts.buyer_usdc.to_account_info(),
        to: ctx.accounts.vault_usdc.to_account_info(),
        authority: ctx.accounts.buyer.to_account_info(),
    };
    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_usdc),
        total_price_u64,
    )?;

    // transfer bonds from vault -> buyer, signed by PDA
    let seeds = &[b"market", market.bond_mint.as_ref(), &[market.bump]];
    let signer = &[&seeds[..]];
    let cpi_accounts_bond = Transfer {
        from: ctx.accounts.vault_bond.to_account_info(),
        to: ctx.accounts.buyer_bond.to_account_info(),
        authority: ctx.accounts.market.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts_bond, signer),
        amount,
    )?;

    emit!(TradeEvent {
        market: ctx.accounts.market.key(),
        trader: ctx.accounts.buyer.key(),
        side: TradeSide::Buy,
        amount,
        price: price_u128,
    });

    Ok(())
}

#[event]
pub struct TradeEvent {
    pub market: Pubkey,
    pub trader: Pubkey,
    pub side: TradeSide,
    pub amount: u64,
    pub price: u128,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum TradeSide {
    Buy,
    Sell,
}
