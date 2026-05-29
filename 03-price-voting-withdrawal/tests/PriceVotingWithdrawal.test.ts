import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

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

  it("deploys", async function () {
    await networkHelpers.loadFixture(deployFixture);
  });

  // TODO: write the tests for your design.
});
