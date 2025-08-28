import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { createMint } from "@solana/spl-token";

async function main() {
  // Setup provider
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  // Cast wallet to NodeWallet to access .payer (Keypair)
  const wallet = provider.wallet as NodeWallet;
  const payer = wallet.payer;   // ✅ Keypair
  const connection = provider.connection;

  // Create bond mint (0 decimals)
  const bondMint = await createMint(
    connection,
    payer,             // fee payer & mint authority
    payer.publicKey,   // mint authority
    null,              // freeze authority
    0                  // decimals
  );

  // Create USDC mint (6 decimals)
  const usdcMint = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    6
  );

  console.log("✅ Bond mint:", bondMint.toBase58());
  console.log("✅ USDC mint:", usdcMint.toBase58());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
