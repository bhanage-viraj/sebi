import * as anchor from "@coral-xyz/anchor";

async function main() {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.Sebi as anchor.Program;

  const bondMint = new anchor.web3.PublicKey(process.env.BOND_MINT!);
  const [marketPda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("market"), bondMint.toBuffer()],
    program.programId
  );

  const newPrice = new anchor.BN(process.env.NEW_PRICE || "2000000"); // 2 USDC if decimals=6

  await program.methods
    .updatePrice(newPrice)
    .accounts({
      market: marketPda,
      admin: provider.wallet.publicKey,
    })
    .rpc();

  console.log("Price updated");
}

main().catch(console.error);
