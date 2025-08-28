import * as anchor from "@coral-xyz/anchor";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

async function main() {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const payer = provider.wallet.payer;
  const connection = provider.connection;

  const bondMint = await createMint(connection, payer, payer.publicKey, null, 0);
  const usdcMint = await createMint(connection, payer, payer.publicKey, null, 6);

  console.log("Bond mint:", bondMint.toBase58());
  console.log("USDC mint:", usdcMint.toBase58());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
