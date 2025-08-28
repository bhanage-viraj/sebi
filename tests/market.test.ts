import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Program } from "@coral-xyz/anchor";
import { Sebi } from "../target/types/sebi";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { describe, it } from "node:test";

describe("sebi market", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const wallet = provider.wallet as NodeWallet;
  const admin = wallet.payer; // ✅ Keypair
  const program = anchor.workspace.Sebi as Program<Sebi>;

  it("init market and trade", async () => {
    const connection = provider.connection;

    // create mints
    const bondMint = await createMint(connection, admin, admin.publicKey, null, 0);
    const usdcMint = await createMint(connection, admin, admin.publicKey, null, 6);

    // derive PDA
    const [marketPda, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("market"), bondMint.toBuffer()],
      program.programId
    );

    // create vault accounts
    const vaultBond = await getOrCreateAssociatedTokenAccount(connection, admin, bondMint, marketPda, true);
    const vaultUsdc = await getOrCreateAssociatedTokenAccount(connection, admin, usdcMint, marketPda, true);

    // mint supply into vault
    await mintTo(connection, admin, bondMint, vaultBond.address, admin, 1000);

    // initialize market
    const price_per_token = new anchor.BN(1_000_000);
    await program.methods
      .initializeMarket(price_per_token)
      .accounts({
        market: marketPda,
        bondMint,
        usdcMint,
        vaultBond: vaultBond.address,
        vaultUsdc: vaultUsdc.address,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // buyer
    const buyer = Keypair.generate();
    await connection.requestAirdrop(buyer.publicKey, LAMPORTS_PER_SOL);
    await new Promise(r => setTimeout(r, 2000));

    const buyerUsdc = await getOrCreateAssociatedTokenAccount(connection, admin, usdcMint, buyer.publicKey);
    const buyerBond = await getOrCreateAssociatedTokenAccount(connection, admin, bondMint, buyer.publicKey);

    await mintTo(connection, admin, usdcMint, buyerUsdc.address, admin, 10_000_000); // 10 USDC

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

    const buyerBondAcc = await connection.getTokenAccountBalance(buyerBond.address);
    console.log("buyer bond balance", buyerBondAcc.value.amount);
  });
});
