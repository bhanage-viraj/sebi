import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import {
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

async function main() {
  // Setup provider & wallet
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const wallet = provider.wallet as NodeWallet;
  const admin = wallet.payer; // ✅ Keypair

  const program = anchor.workspace.Sebi as anchor.Program;

  // Bond mint (from env)
  const bondMint = new anchor.web3.PublicKey(process.env.BOND_MINT!);

  // Derive PDA
  const [marketPda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("market"), bondMint.toBuffer()],
    program.programId
  );

  // Buyer keypair from env
  const buyer = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.BUYER_SECRET!))
  );

  // ATAs — pass `admin` (Keypair) as payer for creation
  const buyerUsdcAta = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    admin,  // ✅ Keypair payer
    new anchor.web3.PublicKey(process.env.USDC_MINT!),
    buyer.publicKey
  );

  const buyerBondAta = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    admin,  // ✅ Keypair payer
    bondMint,
    buyer.publicKey
  );

  // Execute buy
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

  console.log("✅ Buy tx done");
}

main().catch(console.error);
