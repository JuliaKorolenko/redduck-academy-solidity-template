import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { getAddress, parseEther } from "viem";

const { viem, networkHelpers } = await network.connect();

const ONE_DAY = 60 * 60 * 24;

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

  describe("voting", function () {
    it("records a few votes", async function () {
      const { voting, alice, bob } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });
      await voting.write.vote([15n, parseEther("20")], { account: alice.account });
      await voting.write.vote([10n, parseEther("30")], { account: alice.account });
      await voting.write.vote([15n, parseEther("30")], { account: bob.account });

      assert.equal(await voting.read.weightOf([15n]), parseEther("50"));
      assert.equal(await voting.read.lockedOf([alice.account.address, 10n]), parseEther("80"));
      assert.equal(await voting.read.lockedOf([alice.account.address, 15n]), parseEther("20"));
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

    it("vote reverts if zero amount", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);

      await viem.assertions.revertWithCustomError(
        voting.write.vote([100n, 0n], { account: alice.account }),
        voting,
        "ZeroAmount",
      );
    });

    it("vote reverts if voting is ended", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);

      await networkHelpers.time.increaseTo(await voting.read.votingEnd());

      await viem.assertions.revertWithCustomError(
        voting.write.vote([100n, parseEther("50")], { account: alice.account }),
        voting,
        "VotingEnded",
      );
    });

    it("vote reverts when the voter has not approved", async function () {
      const { token, voting, alice } = await networkHelpers.loadFixture(deployFixture);

      await token.write.approve([voting.address, 0n], { account: alice.account });

      await viem.assertions.revertWithCustomError(
        voting.write.vote([10n, parseEther("50")], { account: alice.account }),
        token,
        "InsufficientAllowance",
      );
    });
  });

  describe("withdraw", function () {
    it("withdraw before voting ends", async function () {
      const { voting, alice, token } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });
      await voting.write.vote([15n, parseEther("20")], { account: alice.account });

      const balanceBefore = await token.read.balanceOf([alice.account.address]);

      await voting.write.withdraw([10n, parseEther("10")], { account: alice.account });

      const balanceAfter = await token.read.balanceOf([alice.account.address]);

      assert.equal(balanceAfter - balanceBefore, parseEther("10"));

      assert.equal(await voting.read.lockedOf([alice.account.address, 10n]), parseEther("40"));
      assert.equal(await voting.read.lockedOf([alice.account.address, 15n]), parseEther("20"));
    });

    it("withdraw after voting ends", async function () {
      const { voting, alice, token } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });
      await voting.write.vote([15n, parseEther("20")], { account: alice.account });

      const balanceBefore = await token.read.balanceOf([alice.account.address]);

      await networkHelpers.time.increaseTo(await voting.read.votingEnd());
      await voting.write.finalize();

      await voting.write.withdraw([10n, parseEther("50")], { account: alice.account });

      const balanceAfter = await token.read.balanceOf([alice.account.address]);

      assert.equal(balanceAfter - balanceBefore, parseEther("50"));

      assert.equal(await voting.read.lockedOf([alice.account.address, 10n]), parseEther("0"));
      assert.equal(await voting.read.lockedOf([alice.account.address, 15n]), parseEther("20"));
    });

    it("weight of price decreases correctly after withdraw", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);
      await voting.write.vote([10n, parseEther("50")], { account: alice.account });
      await voting.write.vote([15n, parseEther("20")], { account: alice.account });

      await voting.write.withdraw([10n, parseEther("50")], { account: alice.account });

      assert.equal(await voting.read.weightOf([10n]), parseEther("0"));
      assert.equal(await voting.read.weightOf([15n]), parseEther("20"));
    });

    it("emits Withdrawn", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });
      await voting.write.vote([15n, parseEther("20")], { account: alice.account });

      await viem.assertions.emitWithArgs(
        voting.write.withdraw([10n, parseEther("50")], { account: alice.account }),
        voting,
        "Withdrawn",
        [getAddress(alice.account.address), 10n, parseEther("50")],
      );
    });

    it("withdraw reverts if insufficient amount", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);
      await voting.write.vote([10n, parseEther("50")], { account: alice.account });

      viem.assertions.revertWithCustomError(
        voting.write.withdraw([10n, parseEther("60")], { account: alice.account }),
        voting,
        "InsufficientAmount",
      );
    });

    it("withdraw reverts if price has never been voted for", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);

      viem.assertions.revertWithCustomError(
        voting.write.withdraw([15n, parseEther("10")], { account: alice.account }),
        voting,
        "InsufficientAmount",
      );
    });

    it("withdraw reverts if zerro amount", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);
      await voting.write.vote([10n, parseEther("50")], { account: alice.account });

      viem.assertions.revertWithCustomError(
        voting.write.withdraw([10n, parseEther("0")], { account: alice.account }),
        voting,
        "ZeroAmount",
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

    it("leader and currentTokenPrice do not change if nobody votes", async function () {
      const { voting } = await networkHelpers.loadFixture(deployFixture);

      await networkHelpers.time.increaseTo(await voting.read.votingEnd());
      await voting.write.finalize();

      await voting.read.leader().then(([price, weight]) => {
        assert.equal(price, 0n);
        assert.equal(weight, 0n);
      });

      assert.equal(await voting.read.currentTokenPrice(), 0n);
    });

    it("finalized works correctly", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });

      assert.equal(await voting.read.finalized(), false);

      await networkHelpers.time.increaseTo(await voting.read.votingEnd());
      await voting.write.finalize();

      assert.equal(await voting.read.finalized(), true);
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

    it("leader reverts if voting is not finalized", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });

      await viem.assertions.revertWithCustomError(voting.read.leader(), voting, "VotingActive");
    });

    it("finalize reverts if voting is not finalized", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });

      await viem.assertions.revertWithCustomError(voting.write.finalize(), voting, "VotingActive");
    });

    it("finalize reverts if finalized twice", async function () {
      const { voting, alice } = await networkHelpers.loadFixture(deployFixture);

      await voting.write.vote([10n, parseEther("50")], { account: alice.account });

      await networkHelpers.time.increaseTo(await voting.read.votingEnd());
      await voting.write.finalize();

      await viem.assertions.revertWithCustomError(
        voting.write.finalize(),
        voting,
        "AlreadyFinalized",
      );
    });
  });
});
