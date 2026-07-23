import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";
import { MerkleTree, type AirdropEntry } from "./merkle.ts";
import { signAirdropClaim } from "./signatures.ts";

const { viem } = await network.connect();

// Two starter happy-path tests: one claim via the Merkle proof, one via an admin
// signature. Both fail until the contract and the matching off-chain code
// (merkle.ts, signatures.ts) are implemented. Add tests for the failure modes
// described in TASK.md (bad proofs, wrong signer/amount/recipient, replay across
// both paths via the shared hasClaimed).
describe("MerkleAirdrop", function () {
  async function deployFixture() {
    const [deployer, alice, bob, carol, signer, dave, eve] = await viem.getWalletClients();

    const entries: AirdropEntry[] = [
      { account: getAddress(alice.account.address), amount: parseEther("100") },
      { account: getAddress(bob.account.address), amount: parseEther("200") },
      { account: getAddress(carol.account.address), amount: parseEther("300") },
      { account: getAddress(eve.account.address), amount: parseEther("50") },
    ];
    const tree = new MerkleTree(entries);

    const token = await viem.deployContract("Token", [
      "Redduck Token",
      "RDDK",
      parseEther("100000000000000"),
    ]);
    const airdrop = await viem.deployContract("MerkleAirdrop", [
      token.address,
      tree.root,
      signer.account.address,
    ]);

    await token.write.transfer([airdrop.address, parseEther("100000000000000")], {
      account: deployer.account,
    });

    return { entries, tree, token, airdrop, deployer, alice, bob, carol, signer, dave, eve };
  }

  it("lets an eligible account claim its allocation with a Merkle proof", async function () {
    const { entries, tree, token, airdrop, alice } = await deployFixture();

    const proof = tree.getProof(0);
    const { account, amount } = entries[0];

    await airdrop.write.claim([amount, proof], { account: alice.account });

    assert.equal((await token.read.balanceOf([account])) as bigint, amount);
    assert.equal((await airdrop.read.hasClaimed([account])) as boolean, true);
  });

  it("lets an authorized account claim with an admin signature (not on the Merkle list)", async function () {
    const { token, airdrop, signer, dave } = await deployFixture();

    const daveAddr = getAddress(dave.account.address);
    const amount = parseEther("50");

    const { v, r, s } = await signAirdropClaim(signer, daveAddr, amount);

    await airdrop.write.claimWithSignature([amount, v, r, s], { account: dave.account });

    assert.equal((await token.read.balanceOf([daveAddr])) as bigint, amount);
    assert.equal((await airdrop.read.hasClaimed([daveAddr])) as boolean, true);
  });

  it("claim reverts if proof is invalid", async function () {
    const { airdrop, alice } = await deployFixture();

    const fakeProof = [
      "0x1234567890123456789012345678901234567890123456789012345678901234" as `0x${string}`,
      "0x7890123456789012345678901234567890123456789012345678901234123456" as `0x${string}`,
    ];

    await viem.assertions.revertWithCustomError(
      airdrop.write.claim([parseEther("100"), fakeProof], { account: alice.account }),
      airdrop,
      "InvalidProof",
    );
  });

  it("claimWithSignature reverts if signature is invalid", async function () {
    const { airdrop, dave } = await deployFixture();

    const daveAddr = getAddress(dave.account.address);
    const amount = parseEther("50");

    const { v, r, s } = await signAirdropClaim(dave, daveAddr, amount);

    await viem.assertions.revertWithCustomError(
      airdrop.write.claimWithSignature([amount, v, r, s], { account: dave.account }),
      airdrop,
      "InvalidSignature",
    );
  });

  it("claimWithSignature reverts if signature belongs to a different account", async function () {
    const { airdrop, dave, alice } = await deployFixture();

    const aliceAddr = getAddress(alice.account.address);
    const amount = parseEther("50");

    const { v, r, s } = await signAirdropClaim(alice, aliceAddr, amount);

    await viem.assertions.revertWithCustomError(
      airdrop.write.claimWithSignature([amount, v, r, s], { account: dave.account }),
      airdrop,
      "InvalidSignature",
    );
  });

  it("claim reverts if the account has already claimed", async function () {
    const { entries, tree, airdrop, alice } = await deployFixture();
    const proof = tree.getProof(0);
    const { account, amount } = entries[0];

    await airdrop.write.claim([amount, proof], { account: alice.account });

    await viem.assertions.revertWithCustomError(
      airdrop.write.claim([amount, proof], { account: alice.account }),
      airdrop,
      "AlreadyClaimed",
    );
  });

  it("claimWithSignature reverts if the account has already claimed", async function () {
    const { airdrop, dave, signer } = await deployFixture();

    const daveAddr = getAddress(dave.account.address);
    const amount = parseEther("50");

    const { v, r, s } = await signAirdropClaim(signer, daveAddr, amount);

    await airdrop.write.claimWithSignature([amount, v, r, s], { account: dave.account });

    await viem.assertions.revertWithCustomError(
      airdrop.write.claimWithSignature([amount, v, r, s], { account: dave.account }),
      airdrop,
      "AlreadyClaimed",
    );
  });

  it("claimWithSignature reverts if the account has already claimed with claim", async function () {
    const { airdrop, entries, tree, signer } = await deployFixture();

    const proof = tree.getProof(0);
    const { account, amount } = entries[0];

    await airdrop.write.claim([amount, proof], { account: account });

    const { v, r, s } = await signAirdropClaim(signer, getAddress(account), amount);

    await viem.assertions.revertWithCustomError(
      airdrop.write.claimWithSignature([amount, v, r, s], { account: account }),
      airdrop,
      "AlreadyClaimed",
    );
  });

  // it("", async function () {});
  // it("", async function () {});
});
