import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther } from "viem";

const { viem } = await network.connect();

describe("Additional Pair Tests", function () {
  async function deployFixture() {
    const [deployer, alice] = await viem.getWalletClients();

    const tokenA = await viem.deployContract("Token", ["Token A", "AAA", parseEther("1000000")]);
    const tokenB = await viem.deployContract("Token", ["Token B", "BBB", parseEther("1000000")]);

    const pair = await viem.deployContract("Pair", [tokenA.address, tokenB.address]);

    await tokenA.write.transfer([alice.account.address, parseEther("100000")]);
    await tokenB.write.transfer([alice.account.address, parseEther("100000")]);

    for (const w of [deployer, alice]) {
      await tokenA.write.approve([pair.address, parseEther("1000000")], { account: w.account });
      await tokenB.write.approve([pair.address, parseEther("1000000")], { account: w.account });
    }

    return { pair, tokenA, tokenB, deployer, alice };
  }

  it("first deposit updates reserves and mints LP tokens", async function () {
    const { pair, deployer } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const reserve0 = (await pair.read.reserve0()) as bigint;
    const reserve1 = (await pair.read.reserve1()) as bigint;

    assert.equal(reserve0, parseEther("1000"));
    assert.equal(reserve1, parseEther("1000"));

    const LPBalance = (await pair.read.balanceOf([deployer.account.address])) as bigint;
    assert.ok(LPBalance > 0n, "deployer should have LP tokens");
  });

  it("first deposit locks MINIMUM_LIQUIDITY at address(1)", async function () {
    const { pair } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const MINIMUM_LIQUIDITY = (await pair.read.MINIMUM_LIQUIDITY()) as bigint;
    const lockedBalance = (await pair.read.balanceOf([
      "0x0000000000000000000000000000000000000001",
    ])) as bigint;

    assert.equal(lockedBalance, MINIMUM_LIQUIDITY);
  });

  it("second provider receives proportional LP tokens", async function () {
    const { pair, alice } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const supplyBefore = (await pair.read.totalSupply()) as bigint;

    await pair.write.addLiquidity([parseEther("500"), parseEther("500")], {
      account: alice.account,
    });

    const aliceLP = (await pair.read.balanceOf([alice.account.address])) as bigint;

    assert.equal(aliceLP, supplyBefore / 2n, "Alice should receive half of the LP tokens");

    assert.equal(await pair.read.reserve0(), parseEther("1500"));
    assert.equal(await pair.read.reserve1(), parseEther("1500"));
  });

  it("removing liquidity burns LP tokens and returns proportional tokens", async function () {
    const { pair, deployer } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const LPBalance = (await pair.read.balanceOf([deployer.account.address])) as bigint;

    await pair.write.removeLiquidity([LPBalance], { account: deployer.account });

    const reserve0 = (await pair.read.reserve0()) as bigint;
    const reserve1 = (await pair.read.reserve1()) as bigint;

    assert.equal(reserve0, 1000n);
    assert.equal(reserve1, 1000n);

    const LPBalanceAfter = (await pair.read.balanceOf([deployer.account.address])) as bigint;
    assert.equal(LPBalanceAfter, 0n, "Deployer should have burned all LP tokens");
  });

  it("reverts if minAmountOut is too high", async function () {
    const { pair, tokenA, alice } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    await assert.rejects(
      pair.write.swap([tokenA.address, parseEther("100"), parseEther("200")], {
        account: alice.account,
      }),
    );
  });

  it("reverts when swapping unsupported token", async function () {
    const { pair, alice } = await deployFixture();

    const unsupportedToken = await viem.deployContract("Token", [
      "Unsupported Token",
      "UTK",
      parseEther("1000000"),
    ]);

    await unsupportedToken.write.transfer([alice.account.address, parseEther("100")]);

    await unsupportedToken.write.approve([pair.address, parseEther("100")], {
      account: alice.account,
    });

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    await assert.rejects(
      pair.write.swap([unsupportedToken.address, parseEther("100"), 0n], {
        account: alice.account,
      }),
    );
  });

  it("reverts when adding zero liquidity", async function () {
    const { pair } = await deployFixture();

    await assert.rejects(pair.write.addLiquidity([0n, 1n]));

    await assert.rejects(pair.write.addLiquidity([1n, 0n]));
  });

  it("reverts when removing zero liquidity", async function () {
    const { pair } = await deployFixture();

    await assert.rejects(pair.write.removeLiquidity([0n]));
  });

  it("getAmountOut reverts on empty pool", async function () {
    const { pair } = await deployFixture();

    await assert.rejects(pair.read.getAmountOut([parseEther("1"), 0n, 0n]));
  });

  it("getAmountOut reverts on zero amount", async function () {
    const { pair } = await deployFixture();

    await assert.rejects(pair.read.getAmountOut([0n, parseEther("1000"), parseEther("1000")]));
  });

  it("allows adding and removing liquidity", async function () {
    const { pair, tokenA, tokenB, alice } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    await pair.write.addLiquidity([parseEther("500"), parseEther("500")], {
      account: alice.account,
    });

    assert.equal(await pair.read.reserve0(), parseEther("1500"));
    assert.equal(await pair.read.reserve1(), parseEther("1500"));

    const aliceLP = (await pair.read.balanceOf([alice.account.address])) as bigint;

    const tokenABalanceBefore = (await tokenA.read.balanceOf([alice.account.address])) as bigint;
    const tokenBBalanceBefore = (await tokenB.read.balanceOf([alice.account.address])) as bigint;

    await pair.write.removeLiquidity([aliceLP], { account: alice.account });

    const tokenABalanceAfter = (await tokenA.read.balanceOf([alice.account.address])) as bigint;
    const tokenBBalanceAfter = (await tokenB.read.balanceOf([alice.account.address])) as bigint;

    assert.equal(tokenABalanceAfter, tokenABalanceBefore + parseEther("500"));
    assert.equal(tokenBBalanceAfter, tokenBBalanceBefore + parseEther("500"));

    assert.ok(tokenABalanceAfter > tokenABalanceBefore);
    assert.ok(tokenBBalanceAfter > tokenBBalanceBefore);

    assert.equal(await pair.read.balanceOf([alice.account.address]), 0n);

    assert.ok((await pair.read.reserve0()) < parseEther("1500"));
    assert.ok((await pair.read.reserve1()) < parseEther("1500"));
  });

  it("swap tokenB for tokenA", async function () {
    const { pair, tokenB, alice } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const r0Before = (await pair.read.reserve0()) as bigint;
    const r1Before = (await pair.read.reserve1()) as bigint;

    const amountIn = parseEther("100");
    const expectedOut = (await pair.read.getAmountOut([amountIn, r1Before, r0Before])) as bigint;

    await pair.write.swap([tokenB.address, amountIn, 0n], { account: alice.account });

    assert.equal(await pair.read.reserve0(), r0Before - expectedOut);
    assert.equal(await pair.read.reserve1(), r1Before + amountIn);
  });

  it("keeps reserves equal to token balances after adding liquidity", async function () {
    const { pair, tokenA, tokenB } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    assert.equal(await pair.read.reserve0(), await tokenA.read.balanceOf([pair.address]));
    assert.equal(await pair.read.reserve1(), await tokenB.read.balanceOf([pair.address]));
  });

  it("keeps reserves equal to balances after swapping", async function () {
    const { pair, tokenA, tokenB, alice } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    await pair.write.swap([tokenA.address, parseEther("100"), 0n], { account: alice.account });

    assert.equal(await pair.read.reserve0(), await tokenA.read.balanceOf([pair.address]));
    assert.equal(await pair.read.reserve1(), await tokenB.read.balanceOf([pair.address]));
  });

  it("keeps reserves equal to balances after removing liquidity", async function () {
    const { pair, tokenA, tokenB, deployer } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const LPBalance = (await pair.read.balanceOf([deployer.account.address])) as bigint;

    await pair.write.removeLiquidity([LPBalance], { account: deployer.account });

    assert.equal(await pair.read.reserve0(), await tokenA.read.balanceOf([pair.address]));
    assert.equal(await pair.read.reserve1(), await tokenB.read.balanceOf([pair.address]));
  });

  // it("", async function() {});
});
