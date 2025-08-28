import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

async function main() {
  // Setup provider
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  // Cast to NodeWallet to access Keypair
  const wallet = provider.wallet as NodeWallet;
  const admin = wallet.payer;   // ✅ Keypair
  const program = anchor.workspace.Sebi as anchor.Program;

  // Bond & USDC mints from env
  const bondMint = new anchor.web3.PublicKey(process.env.BOND_MINT!);
  const usdcMint = new anchor.web3.PublicKey(process.env.USDC_MINT!);

  // Derive market PDA
  const [marketPda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("market"), bondMint.toBuffer()],
    program.programId
  );

  // Create vault ATAs (payer = admin keypair)
  const vaultBond = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    admin,
    bondMint,
    marketPda,
    true
  );

  const vaultUsdc = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    admin,
    usdcMint,
    marketPda,
    true
  );

  // Default price = 1 USDC per bond (scaled 1e6)
  const price = new anchor.BN(process.env.PRICE || "1000000");

  // Call initialize_market
  await program.methods
    .initializeMarket(price)
    .accounts({
      market: marketPda,
      bondMint,
      usdcMint,
      vaultBond: vaultBond.address,
      vaultUsdc: vaultUsdc.address,
      admin: admin.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  console.log("✅ Market initialized:", marketPda.toBase58());
}

main().catch(console.error);
