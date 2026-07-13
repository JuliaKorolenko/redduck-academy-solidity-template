import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { getAddress, parseEther } from "viem";

const { viem, networkHelpers } = await network.connect();

const ONE_DAY = 60 * 60 * 24;

// You design this contract's interface, so you also write its full test suite.
// The fixture below deploys the token and the voting contract to get you
// started. Add tests covering voting, mid-voting withdrawal, the winning-price
// resolution, and the edge cases described in TASK.md.
describe("PriceVotingWithdrawal", function () {
  async function deployFixture() {
    const [deployer, alice, bob, carol] = await viem.getWalletClients();

    const token = await viem.deployContract("Token", ["Vote Token", "VOTE", parseEther("1000000")]);

    const now = await networkHelpers.time.latest();
    const votingEnd = BigInt(now + ONE_DAY);

    const voting = await viem.deployContract("PriceVotingWithdrawal", [token.address, votingEnd]);

    for (const w of [alice, bob, carol]) {
      await token.write.transfer([w.account.address, parseEther("1000")]);
      await token.write.approve([voting.address, parseEther("1000")], { account: w.account });
    }

    return { token, voting, votingEnd, deployer, alice, bob, carol };
  }

  // it("deploys", async function () {
  //   await networkHelpers.loadFixture(deployFixture);
  // });

  describe("voting", function () {
    it("records a few votes", async function () {
      const { voting, alice, bob } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });
      await voting.write.vote([15n, parseEther("20")], { account: alice.account });
      await voting.write.vote([10n, parseEther("30")], { account: alice.account });
      await voting.write.vote([15n, parseEther("30")], { account: bob.account });

      assert.equal(await voting.read.weightOf([15n]), parseEther("50"));
      assert.equal(await voting.read.lockedOf([alice.account.address, 10n]), parseEther("80"));
    });

    it("is unique price's array", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });
      await voting.write.vote([15n, parseEther("20")], { account: alice.account });
      await voting.write.vote([10n, parseEther("30")], { account: alice.account });

      const allPrices = await voting.read.allPrices();
      assert.deepEqual(allPrices, [10n, 15n]);
    });

    it("emits Voted", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);

      await viem.assertions.emitWithArgs(
        voting.write.vote([100n, parseEther("50")], { account: alice.account }),
        voting,
        "Voted",
        [getAddress(alice.account.address), 100n, parseEther("50")],
      );
    });
  });

  describe("finalize", function () {
    it("finalizes the leader", async function () {
      const { voting, alice, bob } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });
      await voting.write.vote([15n, parseEther("20")], { account: alice.account });
      await voting.write.vote([10n, parseEther("30")], { account: alice.account });
      await voting.write.vote([15n, parseEther("30")], { account: bob.account });

      await networkHelpers.time.increaseTo(await voting.read.votingEnd());
      await voting.write.finalize();

      await voting.read.leader().then(([price, weight]) => {
        assert.equal(price, 10n);
        assert.equal(weight, parseEther("80"));
      });
    });

    it("finalizes the currentTokenPrice", async function () {
      const { voting, alice, bob } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("20")], { account: alice.account });
      await voting.write.vote([15n, parseEther("20")], { account: alice.account });
      await voting.write.vote([10n, parseEther("30")], { account: alice.account });
      await voting.write.vote([15n, parseEther("30")], { account: bob.account });

      await networkHelpers.time.increaseTo(await voting.read.votingEnd());
      await voting.write.finalize();

      assert.equal(await voting.read.currentTokenPrice(), 10n);
    });

    it("emits Finalized", async function () {
      const { voting, alice, bob } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });
      await voting.write.vote([15n, parseEther("20")], { account: alice.account });
      await voting.write.vote([10n, parseEther("80")], { account: bob.account });

      await networkHelpers.time.increaseTo(await voting.read.votingEnd());

      await viem.assertions.emitWithArgs(voting.write.finalize(), voting, "PriceFinalized", [
        10n,
        parseEther("130"),
      ]);
    });
  });

  // TODO: write the tests for your design.
});
