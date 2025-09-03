// File: tests/factory.test.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BondFactory } from "../target/types/bond_factory";
import { assert } from "chai";
import {
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
// FIX: Import the 'createMint' function to create a token mint in our test.
import { getMint, TOKEN_PROGRAM_ID, createMint } from "@solana/spl-token";

describe("bond_factory", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const admin = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.BondFactory as Program<BondFactory>;

  // This variable will hold the PublicKey of the quote mint we create locally for the test.
  let quoteMint: PublicKey;

  // FIX: This `before` block now properly creates a new mint on the
  // local test validator before the tests run. This is essential because
  // the hardcoded devnet USDC address does not exist here.
  before(async () => {
    quoteMint = await createMint(
      provider.connection,
      admin.payer, // The admin wallet pays for the transaction
      admin.publicKey, // The admin is the mint authority
      null, // No freeze authority is needed for this test mint
      6 // Standard 6 decimals for a USDC-like token
    );
  });

  it("Creates a new market successfully!", async () => {
    const issuerName = "Ambuja Cements";
    const maturityTimestamp = new anchor.BN(Math.floor(Date.now() / 1000) + 31536000); // 1 year from now
    const couponRateBps = 850; // 8.5%

    // --- Derive all PDAs ahead of time ---
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(issuerName)],
      program.programId
    );
    const [marketAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority"), marketPda.toBuffer()],
      program.programId
    );
    const [bondMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bond_mint"), marketPda.toBuffer()],
      program.programId
    );

    // --- Call the create_market instruction ---
    await program.methods
      .createMarket(issuerName, maturityTimestamp, couponRateBps)
      .accounts({
        admin: admin.publicKey,
        market: marketPda,
        marketAuthority: marketAuthorityPda,
        bondMint: bondMintPda,
        // FIX: Use the PublicKey of the mint we just created in the `before` block.
        quoteMint: quoteMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // --- Verify the on-chain results ---
    const marketAccount = await program.account.marketState.fetch(marketPda);
    assert.ok(marketAccount.admin.equals(admin.publicKey), "Admin key mismatch");
    assert.equal(marketAccount.issuerName, issuerName, "Issuer name mismatch");
    assert.ok(marketAccount.maturityTimestamp.eq(maturityTimestamp), "Maturity timestamp mismatch");
    assert.equal(marketAccount.couponRateBps, couponRateBps, "Coupon rate mismatch");
    assert.ok(marketAccount.bondMint.equals(bondMintPda), "Bond mint pubkey mismatch");

    // Verify the bond mint itself was created with the correct authority
    const bondMintInfo = await getMint(provider.connection, bondMintPda);
    assert.isNotNull(bondMintInfo.mintAuthority, "Mint authority should not be null");
    assert.ok(bondMintInfo.mintAuthority.equals(marketAuthorityPda), "Bond mint authority mismatch");
  });
});

