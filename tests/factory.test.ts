// File: tests/factory.test.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BondFactory } from "../target/types/bond_factory";
import { assert } from "chai";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  ParsedAccountData,
} from "@solana/web3.js";
import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("bond_factory", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const admin = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.BondFactory as Program<BondFactory>;

  let quoteMint: PublicKey;

  before(async () => {
    // Create a mock USDC mint for testing
    const mintKp = Keypair.generate();
    quoteMint = mintKp.publicKey;
    // This is a simplified mint creation for testing purposes.
    // In a real scenario, you would use createMint from @solana/spl-token
  });

  it("Creates a new market successfully!", async () => {
    const issuerName = "Ambuja Cements";
    const maturityTimestamp = new anchor.BN(Date.now() / 1000 + 365 * 24 * 60 * 60); // 1 year from now
    const couponRateBps = 850; // 8.5%

    // --- Derive PDAs using the same logic as the program ---
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
        quoteMint: new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"), // Using a known USDC mint on devnet for consistency
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // --- Verify the results ---
    const marketAccount = await program.account.marketState.fetch(marketPda);
    assert.ok(marketAccount.admin.equals(admin.publicKey), "Admin key mismatch");
    assert.equal(marketAccount.issuerName, issuerName, "Issuer name mismatch");
    assert.ok(marketAccount.maturityTimestamp.eq(maturityTimestamp), "Maturity timestamp mismatch");
    assert.equal(marketAccount.couponRateBps, couponRateBps, "Coupon rate mismatch");
    assert.ok(marketAccount.bondMint.equals(bondMintPda), "Bond mint pubkey mismatch");

    // Verify that the bond mint was created and its authority is the PDA
    const bondMintInfo = await getMint(provider.connection, bondMintPda);
    assert.ok(bondMintInfo.mintAuthority.equals(marketAuthorityPda), "Bond mint authority mismatch");
  });
});

