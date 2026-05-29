// Merkle tree utilities for the airdrop. Implement these so the roots and proofs
// you produce verify against your contract's claim() / _verify(). You choose the
// leaf hash format, the node-combination rule, and the odd-layer convention —
// whatever you pick must match what the contract recomputes.

import { keccak256, encodePacked, concat, type Address, type Hex } from "viem";

export interface AirdropEntry {
  account: Address;
  amount: bigint;
}

// Hash one airdrop entry into a leaf.
export function hashLeaf(entry: AirdropEntry): Hex {
  // TODO
  throw new Error("hashLeaf not implemented");
}

export class MerkleTree {
  layers: Hex[][];

  constructor(entries: AirdropEntry[]) {
    // TODO: build the tree layers from the leaves up to a single root.
    this.layers = [];
  }

  get root(): Hex {
    // TODO
    throw new Error("root not implemented");
  }

  // The sibling hashes from the leaf at `index` up to the root.
  getProof(index: number): Hex[] {
    // TODO
    throw new Error("getProof not implemented");
  }
}
