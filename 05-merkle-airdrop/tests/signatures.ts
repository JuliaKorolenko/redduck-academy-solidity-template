// Signing helper for claimWithSignature. Implement this so the signature it
// produces is accepted by your contract when signed by the `signer` passed to
// the constructor. You choose the signing scheme — it must match what the
// contract recovers and must bind the signature to the specific claimant.

import { type WalletClient, type Address, keccak256, encodePacked } from "viem";

export interface ClaimSignatureParts {
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
}

export async function signAirdropClaim(
  signerWallet: WalletClient,
  claimant: Address,
  amount: bigint,
): Promise<ClaimSignatureParts> {
  // TODO: build the message your contract recovers over, sign it with
  //       signerWallet, and split the signature into { v, r, s }.
  const hash = keccak256(encodePacked(["address", "uint256"], [claimant, amount]));
  if (!signerWallet) throw new Error("Wallet not connected");

  const account = signerWallet.account;
  if (!account) throw new Error("Wallet account not connected");

  const signature = await signerWallet.signMessage({
    account,
    message: { raw: hash },
  });

  const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
  const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
  const v = parseInt(signature.slice(130, 132), 16);

  return { v, r, s };
}
