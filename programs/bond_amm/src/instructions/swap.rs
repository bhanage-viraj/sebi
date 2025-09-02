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

    #[account(
        seeds = [b"market", market.bond_mint.as_ref()],
        bump = market.market_bump
    )]
    pub market: Account<'info, MarketState>,

    /// CHECK: Authority PDA owned by the factory.
    #[account(
        seeds = [b"authority", market.key().as_ref()],
        bump = market.market_authority_bump
    )]
    pub market_authority: AccountInfo<'info>,

    /// SPL Bond mint
    pub bond_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        token::mint = bond_mint,
        token::authority = market_authority
    )]
    pub bond_vault: Account<'info, TokenAccount>,
    
    /// SPL Quote mint
    pub quote_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        token::mint = quote_mint,
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

    #[account(
        seeds = [b"market", market.bond_mint.as_ref()],
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
    
    #[account(mut)]
    pub bond_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub quote_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handle_initialize_amm(ctx: Context<InitializeAmm>) -> Result<()> {
    let amm_state = &mut ctx.accounts.amm_state;
    amm_state.market = ctx.accounts.market.key();
    amm_state.amm_bump = ctx.bumps.amm_state;
    Ok(())
}

pub fn handle_swap(ctx: Context<Swap>, amount_in: u64, swap_for_bond: bool) -> Result<()> {
    // Constant product formula: x * y = k
    let x = ctx.accounts.quote_vault.amount as u128; // Quote tokens
    let y = ctx.accounts.bond_vault.amount as u128; // Bond tokens

    let amount_in = amount_in as u128;
    
    let amount_out = if swap_for_bond {
        // User is selling quote tokens to buy bond tokens
        // Formula: dy = y - (k / (x + dx))
        let k = x.checked_mul(y).unwrap();
        let new_x = x.checked_add(amount_in).unwrap();
        let new_y = k.checked_div(new_x).unwrap();
        y.checked_sub(new_y).unwrap()
    } else {
        // User is selling bond tokens to buy quote tokens
        // Formula: dx = x - (k / (y + dy))
        let k = x.checked_mul(y).unwrap();
        let new_y = y.checked_add(amount_in).unwrap();
        let new_x = k.checked_div(new_y).unwrap();
        x.checked_sub(new_x).unwrap()
    };

    let fee = amount_out.checked_mul(FEE_BPS as u128).unwrap().checked_div(10000).unwrap();
    let final_amount_out = amount_out.checked_sub(fee).unwrap();

    let (from_account, to_account, source_vault, dest_vault) = if swap_for_bond {
        (
            ctx.accounts.user_quote_ata.to_account_info(),
            ctx.accounts.quote_vault.to_account_info(),
            ctx.accounts.bond_vault.to_account_info(),
            ctx.accounts.user_bond_ata.to_account_info()
        )
    } else {
        (
            ctx.accounts.user_bond_ata.to_account_info(),
            ctx.accounts.bond_vault.to_account_info(),
            ctx.accounts.quote_vault.to_account_info(),
            ctx.accounts.user_quote_ata.to_account_info()
        )
    };

    // Transfer user's tokens to the vault
    let cpi_accounts_in = Transfer { from: from_account, to: to_account, authority: ctx.accounts.user.to_account_info() };
    let cpi_program_in = ctx.accounts.token_program.to_account_info();
    let cpi_ctx_in = CpiContext::new(cpi_program_in, cpi_accounts_in);
    anchor_spl::token::transfer(cpi_ctx_in, amount_in as u64)?;
    
    // Transfer from vault to user
    let market_key = ctx.accounts.market.key();
    let seeds = &[
        b"authority".as_ref(),
        market_key.as_ref(),
        &[ctx.accounts.market.market_authority_bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts_out = Transfer { from: source_vault, to: dest_vault, authority: ctx.accounts.market_authority.to_account_info() };
    let cpi_program_out = ctx.accounts.token_program.to_account_info();
    let cpi_ctx_out = CpiContext::new_with_signer(cpi_program_out, cpi_accounts_out, signer);
    anchor_spl::token::transfer(cpi_ctx_out, final_amount_out as u64)?;

    Ok(())
}

