import * as anchor from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

async function main() {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.Sebi as anchor.Program;

  const bondMint = new anchor.web3.PublicKey(process.env.BOND_MINT!);
  const usdcMint = new anchor.web3.PublicKey(process.env.USDC_MINT!);

  const [marketPda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("market"), bondMint.toBuffer()],
    program.programId
  );

  const vaultBond = await getOrCreateAssociatedTokenAccount(provider.connection, provider.wallet.payer, bondMint, marketPda, true);
  const vaultUsdc = await getOrCreateAssociatedTokenAccount(provider.connection, provider.wallet.payer, usdcMint, marketPda, true);

  const price = new anchor.BN(process.env.PRICE || "1000000"); // default 1 USDC scaled to 1e6

  await program.methods
    .initializeMarket(price)
    .accounts({
      market: marketPda,
      bondMint: bondMint,
      usdcMint: usdcMint,
      vaultBond: vaultBond.address,
      vaultUsdc: vaultUsdc.address,
      admin: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  console.log("Market initialized:", marketPda.toBase58());
}

main().catch(console.error);
