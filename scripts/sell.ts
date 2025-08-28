// analogous to buy.ts but calls sell
import * as anchor from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

async function main() {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.Sebi as anchor.Program;

  const bondMint = new anchor.web3.PublicKey(process.env.BOND_MINT!);
  const [marketPda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("market"), bondMint.toBuffer()],
    program.programId
  );

  const seller = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.SELLER_SECRET!))
  );

  const sellerBondAta = await getOrCreateAssociatedTokenAccount(provider.connection, provider.wallet.payer, bondMint, seller.publicKey);
  const sellerUsdcAta = await getOrCreateAssociatedTokenAccount(provider.connection, provider.wallet.payer, new anchor.web3.PublicKey(process.env.USDC_MINT!), seller.publicKey);

  await program.methods
    .sell(new anchor.BN(parseInt(process.env.AMOUNT || "1")))
    .accounts({
      market: marketPda,
      seller: seller.publicKey,
      sellerBond: sellerBondAta.address,
      sellerUsdc: sellerUsdcAta.address,
      vaultBond: new anchor.web3.PublicKey(process.env.VAULT_BOND!),
      vaultUsdc: new anchor.web3.PublicKey(process.env.VAULT_USDC!),
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    })
    .signers([seller])
    .rpc();

  console.log("Sell done");
}

main().catch(console.error);
