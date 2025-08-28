import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sebi } from "../target/types/sebi";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("sebi market", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.Sebi as Program<Sebi>;

  it("init market and trade", async () => {
    const admin = provider.wallet.payer; // signer Keypair
    const connection = provider.connection;

    // 1) create bond mint and usdc mock mint
    const bondMint = await createMint(connection, admin, admin.publicKey, null, 0);
    const usdcMint = await createMint(connection, admin, admin.publicKey, null, 6);

    // 2) derive market PDA
    const [marketPda, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("market"), bondMint.toBuffer()],
      program.programId
    );

    // 3) create vault ATAs and mint initial supply into vault_bond
    const vaultBond = await getOrCreateAssociatedTokenAccount(connection, admin, bondMint, marketPda, true);
    const vaultUsdc = await getOrCreateAssociatedTokenAccount(connection, admin, usdcMint, marketPda, true);

    // mint bonds into vault_bond
    await mintTo(connection, admin, bondMint, vaultBond.address, admin, 1000);

    // 4) call initialize_market
    const price_per_token = new anchor.BN(1_000_000); // if USDC decimals=6, this is 1 USDC per token (scaled)
    await program.methods
      .initializeMarket(price_per_token)
      .accounts({
        market: marketPda,
        bondMint: bondMint,
        usdcMint: usdcMint,
        vaultBond: vaultBond.address,
        vaultUsdc: vaultUsdc.address,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // 5) Create buyer and its ATAs; fund buyer with USDC
    const buyer = Keypair.generate();
    // airdrop SOL to buyer for tx fees
    await connection.requestAirdrop(buyer.publicKey, LAMPORTS_PER_SOL);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const buyerUsdc = await getOrCreateAssociatedTokenAccount(connection, admin, usdcMint, buyer.publicKey);
    const buyerBond = await getOrCreateAssociatedTokenAccount(connection, admin, bondMint, buyer.publicKey);

    // mint USDC to buyer (simulate they have USDC)
    await mintTo(connection, admin, usdcMint, buyerUsdc.address, admin, 10_000_000); // 10 USDC

    // 6) call buy: amount = 2 bonds -> cost = 2 * 1_000_000 = 2_000_000 (2 USDC)
    await program.methods
      .buy(new anchor.BN(2))
      .accounts({
        market: marketPda,
        buyer: buyer.publicKey,
        buyerUsdc: buyerUsdc.address,
        buyerBond: buyerBond.address,
        vaultUsdc: vaultUsdc.address,
        vaultBond: vaultBond.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    // 7) check balances (vault and buyer)
    const buyerBondAcc = await connection.getTokenAccountBalance(buyerBond.address);
    const vaultBondAcc = await connection.getTokenAccountBalance(vaultBond.address);
    console.log("buyer bond", buyerBondAcc.value.amount);
    console.log("vault bond", vaultBondAcc.value.amount);
  });
});
