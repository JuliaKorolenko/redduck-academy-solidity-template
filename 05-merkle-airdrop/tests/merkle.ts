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
  return keccak256(encodePacked(["address", "uint256"], [entry.account, entry.amount]));
}

export class MerkleTree {
  layers: Hex[][];

  constructor(entries: AirdropEntry[]) {
    const leaves = entries.map(hashLeaf);
    this.layers = [leaves];

    while (this.layers[this.layers.length - 1].length > 1) {
      const current = this.layers[this.layers.length - 1];

      if (current.length % 2 !== 0) {
        current.push(current[current.length - 1]);
      }

      const next: Hex[] = [];

      for (let i = 0; i < current.length; i += 2) {
        if (current[i] < current[i + 1]) {
          next.push(keccak256(concat([current[i], current[i + 1]])));
        } else {
          next.push(keccak256(concat([current[i + 1], current[i]])));
        }
      }

      this.layers.push(next);
    }
  }

  get root(): Hex {
    return this.layers[this.layers.length - 1][0];
  }

  // The sibling hashes from the leaf at `index` up to the root.
  getProof(index: number): Hex[] {
    const proof: Hex[] = [];
    let curIdx = index;

    for (let i = 0; i < this.layers.length - 1; i++) {
      const sibling = curIdx % 2 === 0 ? this.layers[i][curIdx + 1] : this.layers[i][curIdx - 1];
      proof.push(sibling);
      curIdx = Math.floor(curIdx / 2);
    }

    return proof;
  }
}
