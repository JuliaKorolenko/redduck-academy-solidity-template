import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { getAddress, parseEther } from "viem";
const { viem, networkHelpers } = await network.connect();

const ONE_DAY = 60 * 60 * 24;

// Starter tests. These two show the deploy/vote pattern and pass once the
// contract is implemented. Add the rest of the scenarios listed in TASK.md
// (weight stacking, leader updates, ties, the finalize/claim rules, and the
// revert cases) in this file.
describe("PriceVoting", function () {
  async function deployVotingFixture() {
    const [deployer, alice, bob, carol] = await viem.getWalletClients();

    const token = await viem.deployContract("Token", ["Vote Token", "VOTE", parseEther("1000000")]);

    const now = await networkHelpers.time.latest();
    const votingEnd = BigInt(now + ONE_DAY);

    const voting = await viem.deployContract("PriceVoting", [token.address, votingEnd]);

    // give voters some tokens and approve the voting contract
    for (const w of [alice, bob, carol]) {
      await token.write.transfer([w.account.address, parseEther("1000")]);
      await token.write.approve([voting.address, parseEther("1000")], { account: w.account });
    }

    return { token, voting, votingEnd, deployer, alice, bob, carol };
  }

  describe("vote", function () {
    it("records a single vote", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployVotingFixture);

      await voting.write.vote([100n, parseEther("50")], { account: alice.account });

      assert.equal(await voting.read.weightOf([100n]), parseEther("50"));
      assert.equal(await voting.read.lockedOf([alice.account.address]), parseEther("50"));
    });

    it("emits Voted", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployVotingFixture);

      await viem.assertions.emitWithArgs(
        voting.write.vote([100n, parseEther("50")], { account: alice.account }),
        voting,
        "Voted",
        [getAddress(alice.account.address), 100n, parseEther("50")],
      );

      // console.log("vote locked: ", await voting.read.lockedOf([alice.account.address]));
      // console.log("vote weight: ", await voting.read.weightOf([100n]));
    });

    it("stack votes for the same price", async function () {
      const { voting, alice, bob } = await networkHelpers.loadFixture(deployVotingFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });
      await voting.write.vote([10n, parseEther("30")], { account: bob.account });

      assert.equal(await voting.read.weightOf([10n]), parseEther("80"));
    });

    it("stack votes for different prices", async function () {
      const { voting, alice, bob } = await networkHelpers.loadFixture(deployVotingFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });
      await voting.write.vote([100n, parseEther("30")], { account: bob.account });

      await voting.read.leader().then(([price, weight]) => {
        assert.equal(price, 10n);
        assert.equal(weight, parseEther("50"));
      });
    });

    it("a voter has voted twice", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployVotingFixture);

      await voting.write.vote([15n, parseEther("50")], { account: alice.account });
      await voting.write.vote([10n, parseEther("30")], { account: alice.account });

      assert.equal(await voting.read.weightOf([15n]), parseEther("50"));
      assert.equal(await voting.read.weightOf([10n]), parseEther("30"));
      assert.equal(await voting.read.lockedOf([alice.account.address]), parseEther("80"));
    });

    it("leading price is correct if a leader has changed", async function () {
      const { voting, alice, bob } = await networkHelpers.loadFixture(deployVotingFixture);

      await voting.write.vote([15n, parseEther("30")], { account: alice.account });
      assert.equal(await voting.read.leader().then(([price]) => price), 15n);

      await voting.write.vote([10n, parseEther("50")], { account: bob.account });
      assert.equal(await voting.read.leader().then(([price]) => price), 10n);
    });

    it.skip("leading price doesn't update on a tie", async function () {});

    it("vote reverts when called after votingEnd", async function () {
      const { voting, alice, votingEnd } = await networkHelpers.loadFixture(deployVotingFixture);

      await networkHelpers.time.increaseTo(votingEnd);

      await viem.assertions.revertWithCustomError(
        voting.write.vote([10n, parseEther("50")], { account: alice.account }),
        voting,
        "VotingEnded",
      );
    });

    it("vote reverts when called with zero amount", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployVotingFixture);

      await viem.assertions.revertWithCustomError(
        voting.write.vote([10n, 0n], { account: alice.account }),
        voting,
        "ZeroAmount",
      );
    });

    it.skip("vote reverts when the voter has not approved", async function () {});

    it("finalize reverts when called twice", async function () {
      const { voting, votingEnd } = await networkHelpers.loadFixture(deployVotingFixture);

      await networkHelpers.time.increaseTo(votingEnd);

      await voting.write.finalize();

      await viem.assertions.revertWithCustomError(
        voting.write.finalize(),
        voting,
        "AlreadyFinalized",
      );
    });

    // TODO: #12
  });

  // TODO: add the remaining scenarios from TASK.md.
});
