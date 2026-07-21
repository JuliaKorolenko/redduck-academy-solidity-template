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

  it("adds liquidity", async function () {
    const { pair, tokenA, tokenB, deployer } = await deployFixture();

    const balance0Before = await tokenA.read.balanceOf([deployer.account.address]);

    const balance1Before = await tokenB.read.balanceOf([deployer.account.address]);

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    assert.equal(await pair.read.reserve0(), parseEther("1000"));
    assert.equal(await pair.read.reserve1(), parseEther("1000"));

    const lp = await pair.read.balanceOf([deployer.account.address]);

    assert.ok(lp > 0n);

    assert.equal(
      await tokenA.read.balanceOf([deployer.account.address]),
      balance0Before - parseEther("1000"),
    );

    assert.equal(
      await tokenB.read.balanceOf([deployer.account.address]),
      balance1Before - parseEther("1000"),
    );
  });

  it("locks MINIMUM_LIQUIDITY", async function () {
    const { pair } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const minimum = await pair.read.MINIMUM_LIQUIDITY();

    const locked = await pair.read.balanceOf(["0x0000000000000000000000000000000000000001"]);

    assert.equal(locked, minimum);
  });

  it("adds liquidity from second provider", async function () {
    const { pair, alice } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const supplyBefore = await pair.read.totalSupply();

    await pair.write.addLiquidity([parseEther("500"), parseEther("500")], {
      account: alice.account,
    });

    const aliceLP = await pair.read.balanceOf([alice.account.address]);

    assert.equal(aliceLP, supplyBefore / 2n);

    assert.equal(await pair.read.reserve0(), parseEther("1500"));

    assert.equal(await pair.read.reserve1(), parseEther("1500"));
  });

  it("burns LP tokens and returns a proportional share of both reserves", async function () {
    const { pair, tokenA, tokenB, deployer } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const lpBalance = await pair.read.balanceOf([deployer.account.address]);

    const totalSupplyBefore = await pair.read.totalSupply();

    const reserve0Before = await pair.read.reserve0();
    const reserve1Before = await pair.read.reserve1();

    const balance0Before = await tokenA.read.balanceOf([deployer.account.address]);

    const balance1Before = await tokenB.read.balanceOf([deployer.account.address]);

    const expectedAmount0 = (lpBalance * reserve0Before) / totalSupplyBefore;

    const expectedAmount1 = (lpBalance * reserve1Before) / totalSupplyBefore;

    await pair.write.removeLiquidity([lpBalance]);

    const totalSupplyAfter = await pair.read.totalSupply();

    const reserve0After = await pair.read.reserve0();
    const reserve1After = await pair.read.reserve1();

    const balance0After = await tokenA.read.balanceOf([deployer.account.address]);

    const balance1After = await tokenB.read.balanceOf([deployer.account.address]);

    assert.equal(await pair.read.balanceOf([deployer.account.address]), 0n);

    assert.equal(totalSupplyAfter, totalSupplyBefore - lpBalance);

    assert.equal(balance0After, balance0Before + expectedAmount0);

    assert.equal(balance1After, balance1Before + expectedAmount1);

    assert.equal(reserve0After, reserve0Before - expectedAmount0);

    assert.equal(reserve1After, reserve1Before - expectedAmount1);
  });

  it("swaps token0 to token1", async function () {
    const { pair, tokenA, alice } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const r0Before = await pair.read.reserve0();
    const r1Before = await pair.read.reserve1();

    const amountIn = parseEther("100");

    const expectedOut = await pair.read.getAmountOut([amountIn, r0Before, r1Before]);

    const kBefore = r0Before * r1Before;

    await pair.write.swap([tokenA.address, amountIn, 0n], {
      account: alice.account,
    });

    const r0After = await pair.read.reserve0();
    const r1After = await pair.read.reserve1();

    assert.equal(r0After, r0Before + amountIn);
    assert.equal(r1After, r1Before - expectedOut);

    assert.ok(r0After * r1After > kBefore);
  });

  it("swaps token1 to token0", async function () {
    const { pair, tokenA, tokenB, alice } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const r0Before = await pair.read.reserve0();

    const r1Before = await pair.read.reserve1();

    const amountIn = parseEther("100");

    const expectedOut = await pair.read.getAmountOut([amountIn, r1Before, r0Before]);

    const kBefore = r0Before * r1Before;

    await pair.write.swap([tokenB.address, amountIn, 0n], {
      account: alice.account,
    });

    const r0After = await pair.read.reserve0();

    const r1After = await pair.read.reserve1();

    assert.equal(r0After, r0Before - expectedOut);

    assert.equal(r1After, r1Before + amountIn);

    assert.ok(r0After * r1After > kBefore);
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

    const tokenC = await viem.deployContract("Token", ["Token C", "CCC", parseEther("1000")]);

    await tokenC.write.transfer([alice.account.address, parseEther("100")]);

    await tokenC.write.approve([pair.address, parseEther("100")], {
      account: alice.account,
    });

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    await assert.rejects(
      pair.write.swap([tokenC.address, parseEther("10"), 0n], {
        account: alice.account,
      }),
    );
  });

  it("reverts when adding zero liquidity", async function () {
    const { pair } = await deployFixture();

    await assert.rejects(pair.write.addLiquidity([0n, parseEther("1")]));

    await assert.rejects(pair.write.addLiquidity([parseEther("1"), 0n]));
  });

  it("reverts when removing zero liquidity", async function () {
    const { pair } = await deployFixture();

    await assert.rejects(pair.write.removeLiquidity([0n]));
  });

  it("getAmountOut reverts on empty pool", async function () {
    const { pair } = await deployFixture();

    await assert.rejects(pair.read.getAmountOut([parseEther("1"), 0n, 0n]));
  });

  it("getAmountOut reverts on zero input", async function () {
    const { pair } = await deployFixture();

    await assert.rejects(pair.read.getAmountOut([0n, parseEther("100"), parseEther("100")]));
  });

  it("uses the smaller deposit when liquidity is added out of ratio", async function () {
    const { pair, alice } = await deployFixture();

    await pair.write.addLiquidity([parseEther("1000"), parseEther("1000")]);

    const supplyBefore = await pair.read.totalSupply();

    await pair.write.addLiquidity([parseEther("500"), parseEther("300")], {
      account: alice.account,
    });

    const aliceLP = await pair.read.balanceOf([alice.account.address]);

    const expected = (parseEther("300") * supplyBefore) / parseEther("1000");

    assert.equal(aliceLP, expected);

    assert.equal(await pair.read.reserve0(), parseEther("1500"));

    assert.equal(await pair.read.reserve1(), parseEther("1300"));
  });

  // it("", async function() {});
});
