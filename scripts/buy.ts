import * as anchor from "@coral-xyz/anchor";
import {
  getOrCreateAssociatedTokenAccount,
  createMint,
  mintTo,
} from "@solana/spl-token";


async function main() {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.Sebi as anchor.Program;

  const bondMint = new anchor.web3.PublicKey(process.env.BOND_MINT!);
  const [marketPda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("market"), bondMint.toBuffer()],
    program.programId
  );

  const buyer = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.BUYER_SECRET!))
  );

  const buyerUsdcAta = await getOrCreateAssociatedTokenAccount(provider.connection, provider.wallet.payer, new anchor.web3.PublicKey(process.env.USDC_MINT!), buyer.publicKey);
  const buyerBondAta = await getOrCreateAssociatedTokenAccount(provider.connection, provider.wallet.payer, bondMint, buyer.publicKey);

  await program.methods
    .buy(new anchor.BN(parseInt(process.env.AMOUNT || "1")))
    .accounts({
      market: marketPda,
      buyer: buyer.publicKey,
      buyerUsdc: buyerUsdcAta.address,
      buyerBond: buyerBondAta.address,
      vaultUsdc: new anchor.web3.PublicKey(process.env.VAULT_USDC!),
      vaultBond: new anchor.web3.PublicKey(process.env.VAULT_BOND!),
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    })
    .signers([buyer])
    .rpc();

  console.log("Buy tx done");
}

main().catch(console.error);
