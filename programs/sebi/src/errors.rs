use anchor_lang::prelude::*;

#[error_code]
pub enum MarketError {
    #[msg("Market is paused")]
    MarketPaused,
    #[msg("Insufficient funds in vault")]
    InsufficientVaultFunds,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Math overflow")]
    MathOverflow,
}
