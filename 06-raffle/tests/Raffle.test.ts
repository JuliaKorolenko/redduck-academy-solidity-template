import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther } from "viem";

const { viem, networkHelpers } = await network.connect();

const KEY_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
const CALLBACK_GAS = 500_000;

// Starter test: the happy path end to end — two deposits, time travel to the
// deadline, a forced VRF response, and a claim. It fails until deposit,
// drawWinner, fulfillRandomWords, and claim work. Don't edit it. Add tests for
// the failure modes and the weighted-pick boundaries in a separate file.
describe("Raffle", function () {
  async function deployFixture() {
    const [deployer, alice, bob] = await viem.getWalletClients();

    const btc = await viem.deployContract("Token", ["Bitcoin", "BTC", parseEther("1000000")]);
    const feed = await viem.deployContract("PriceFeedMock", [8, 60_000n * 10n ** 8n]);

    const coord = await viem.deployContract("VRFCoordinatorMock", [10n ** 17n, 10n ** 9n, 10n ** 15n]);

    await coord.write.createSubscription();
    const [created] = await coord.getEvents.SubscriptionCreated({}, { fromBlock: 0n });
    const subId = created.args.subId as bigint;
    await coord.write.fundSubscription([subId, parseEther("1000000")]);

    const now = await networkHelpers.time.latest();
    const drawTime = BigInt(now + 600);

    const raffle = await viem.deployContract("Raffle", [
      btc.address,
      feed.address,
      drawTime,
      coord.address,
      subId,
      KEY_HASH,
      CALLBACK_GAS,
    ]);
    await coord.write.addConsumer([subId, raffle.address]);

    for (const w of [alice, bob]) {
      await btc.write.transfer([w.account.address, parseEther("100")]);
      await btc.write.approve([raffle.address, parseEther("100")], { account: w.account });
    }

    return { btc, feed, coord, raffle, subId, drawTime, deployer, alice, bob };
  }

  it("runs the full raffle: deposit, draw, weighted winner, claim", async function () {
    const { btc, coord, raffle, drawTime, alice, bob } = await deployFixture();

    // Entry 0: alice (weight 1 BTC). Entry 1: bob (weight 3 BTC).
    await raffle.write.deposit([parseEther("1")], { account: alice.account });
    await raffle.write.deposit([parseEther("3")], { account: bob.account });

    await networkHelpers.time.increaseTo(drawTime);
    await raffle.write.drawWinner();

    const requestId = (await raffle.read.requestId()) as bigint;
    const totalWeight = (await raffle.read.totalWeight()) as bigint;

    // A random word at the top of the range lands in bob's entry (index 1).
    await coord.write.fulfillRandomWordsWithOverride([requestId, raffle.address, [totalWeight - 1n]]);

    const before = (await btc.read.balanceOf([bob.account.address])) as bigint;
    await raffle.write.claim([1n], { account: bob.account });
    const after = (await btc.read.balanceOf([bob.account.address])) as bigint;

    assert.equal(after - before, parseEther("4"));
  });

  // TODO: add the failure-mode and weighted-pick tests from TASK.md.
});
