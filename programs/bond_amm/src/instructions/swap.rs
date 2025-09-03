// File: programs/bond_amm/src/instructions/swap.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, Mint};
use crate::state::{AmmState, MarketState};
use crate::constants::FEE_BPS;

#[derive(Accounts)]
pub struct InitializeAmm<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        space = AmmState::LEN,
        seeds = [b"amm", market.key().as_ref()],
        bump
    )]
    pub amm_state: Account<'info, AmmState>,

    // FIX: The seeds constraint now correctly uses the `issuer_name` from the market
    // account itself to verify the market's address. This is a crucial security check.
    #[account(
        seeds = [b"market", market.issuer_name.as_bytes()],
        bump = market.market_bump
    )]
    pub market: Account<'info, MarketState>,

    /// CHECK: Authority PDA owned by the factory.
    #[account(
        seeds = [b"authority", market.key().as_ref()],
        bump = market.market_authority_bump
    )]
    pub market_authority: AccountInfo<'info>,

    #[account(
        init,
        payer = admin,
        token::mint = market.bond_mint,
        token::authority = market_authority
    )]
    pub bond_vault: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = admin,
        token::mint = market.quote_mint,
        token::authority = market_authority
    )]
    pub quote_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    pub user: Signer<'info>,

    // FIX: Same seed correction as above.
    #[account(
        seeds = [b"market", market.issuer_name.as_bytes()],
        bump = market.market_bump
    )]
    pub market: Account<'info, MarketState>,

    /// CHECK: Authority PDA owned by the factory.
    #[account(
        seeds = [b"authority", market.key().as_ref()],
        bump = market.market_authority_bump
    )]
    pub market_authority: AccountInfo<'info>,
    
    #[account(mut)]
    pub user_bond_ata: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_quote_ata: Account<'info, TokenAccount>,
    
    #[account(mut, seeds = [b"bond_vault", market.key().as_ref()], bump)]
    pub bond_vault: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"quote_vault", market.key().as_ref()], bump)]
    pub quote_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handle_initialize_amm(ctx: Context<InitializeAmm>) -> Result<()> {
    let amm_state = &mut ctx.accounts.amm_state;
    amm_state.market = ctx.accounts.market.key();
    amm_state.amm_bump = *ctx.bumps.get("amm_state").unwrap();
    Ok(())
}

pub fn handle_swap(ctx: Context<Swap>, amount_in: u64, swap_for_bond: bool) -> Result<()> {
    // Constant product formula: x * y = k
    let x = ctx.accounts.quote_vault.amount as u128; // Quote tokens
    let y = ctx.accounts.bond_vault.amount as u128; // Bond tokens
    let amount_in = amount_in as u128;
    
    let amount_out = if swap_for_bond {
        // User is selling quote tokens to buy bond tokens
        let k = x.checked_mul(y).unwrap();
        let new_x = x.checked_add(amount_in).unwrap();
        let new_y = k.checked_div(new_x).unwrap();
        y.checked_sub(new_y).unwrap()
    } else {
        // User is selling bond tokens to buy quote tokens
        let k = x.checked_mul(y).unwrap();
        let new_y = y.checked_add(amount_in).unwrap();
        let new_x = k.checked_div(new_y).unwrap();
        x.checked_sub(new_x).unwrap()
    };

    let fee = amount_out.checked_mul(FEE_BPS as u128).unwrap().checked_div(10000).unwrap();
    let final_amount_out = amount_out.checked_sub(fee).unwrap();

    let (from_account, to_account, source_vault, dest_vault) = if swap_for_bond {
        (ctx.accounts.user_quote_ata.to_account_info(), ctx.accounts.quote_vault.to_account_info(), ctx.accounts.bond_vault.to_account_info(), ctx.accounts.user_bond_ata.to_account_info())
    } else {
        (ctx.accounts.user_bond_ata.to_account_info(), ctx.accounts.bond_vault.to_account_info(), ctx.accounts.quote_vault.to_account_info(), ctx.accounts.user_quote_ata.to_account_info())
    };

    let cpi_accounts_in = Transfer { from: from_account, to: to_account, authority: ctx.accounts.user.to_account_info() };
    anchor_spl::token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_in), amount_in as u64)?;
    
    let market_key = ctx.accounts.market.key();
    let seeds = &[ b"authority".as_ref(), market_key.as_ref(), &[ctx.accounts.market.market_authority_bump],];
    let signer = &[&seeds[..]];

    let cpi_accounts_out = Transfer { from: source_vault, to: dest_vault, authority: ctx.accounts.market_authority.to_account_info() };
    anchor_spl::token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts_out, signer), final_amount_out as u64)?;

    Ok(())
}

