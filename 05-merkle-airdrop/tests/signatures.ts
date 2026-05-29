// Signing helper for claimWithSignature. Implement this so the signature it
// produces is accepted by your contract when signed by the `signer` passed to
// the constructor. You choose the signing scheme — it must match what the
// contract recovers and must bind the signature to the specific claimant.

import { type WalletClient, type Address } from "viem";

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
  throw new Error("signAirdropClaim not implemented");
}
