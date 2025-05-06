const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EPIXVesting Clawback", function () {
  let EPIXVesting;
  let vesting;
  let owner, user1, user2, bizdev;
  const ONE_DAY = 86400; // 1 day in seconds
  let vestingStartTime;

  beforeEach(async function () {
    [owner, user1, user2, bizdev] = await ethers.getSigners();

    // Deploy the vesting contract
    EPIXVesting = await ethers.getContractFactory("EPIXVesting");
    vesting = await EPIXVesting.deploy(
      bizdev.address,
      ethers.parseEther("15"), // 15 EPIX for bizdev
      ethers.parseEther("5") // 5 EPIX bonus
    );

    // Add allocations for test users
    await vesting.addAllocation(user1.address, ethers.parseEther("1")); // 1 EPIX
    await vesting.addAllocation(user2.address, ethers.parseEther("2")); // 2 EPIX

    // Fund the contract with EPIX
    await owner.sendTransaction({
      to: await vesting.getAddress(),
      value: ethers.parseEther("23"), // 23 EPIX (1 + 2 + 15 + 5)
    });
  });

  describe("Bizdev using regular claim function", function () {
    it("Should allow bizdev to use the regular claim function", async function () {
      // Start vesting
      await vesting.startVesting();
      vestingStartTime = (await ethers.provider.getBlock("latest")).timestamp;

      // Move time forward to 90 days after vesting starts (about 25% of vesting period)
      await ethers.provider.send("evm_increaseTime", [90 * ONE_DAY]);
      await ethers.provider.send("evm_mine");

      // Get the claimable amount
      const claimable = await vesting.getClaimableAmount(bizdev.address);
      expect(claimable).to.be.gt(0); // Should be greater than 0

      // Get global stats before claiming
      const [totalAllocatedBefore, totalClaimedBefore, ,] = await vesting.getGlobalStats();

      // Claim tokens using the regular claim function
      const balanceBefore = await ethers.provider.getBalance(bizdev.address);
      const tx = await vesting.connect(bizdev).claim();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(bizdev.address);

      // Check that balance increased by approximately the claimable amount (minus gas fees)
      const balanceDiff = balanceAfter - balanceBefore + gasUsed;
      expect(balanceDiff).to.be.closeTo(claimable, ethers.parseEther("0.01"));

      // Check that claimed amount is updated
      const bizdevAlloc = await vesting.bizdevAllocation();
      expect(bizdevAlloc.claimedAmount).to.be.gt(0);
      expect(bizdevAlloc.claimedAmount).to.be.closeTo(claimable, ethers.parseEther("0.01"));

      // Get global stats after claiming
      const [totalAllocatedAfter, totalClaimedAfter, ,] = await vesting.getGlobalStats();

      // Check that total allocated remains the same
      expect(totalAllocatedAfter).to.equal(totalAllocatedBefore);

      // Check that total claimed increased by the claimed amount
      expect(totalClaimedAfter).to.be.closeTo(totalClaimedBefore + claimable, ethers.parseEther("0.01"));
    });

    it("Should update global stats when bizdev claims bonus", async function () {
      // Start vesting
      await vesting.startVesting();

      // Unlock bonus
      await vesting.unlockBizdevBonus();

      // Get global stats before claiming
      const [totalAllocatedBefore, totalClaimedBefore, ,] = await vesting.getGlobalStats();

      // Get bonus amount
      const bizdevAllocBefore = await vesting.bizdevAllocation();
      const bonusAmount = bizdevAllocBefore.bonusAmount;

      // Claim bonus
      await vesting.connect(bizdev).claimBizdevBonus();

      // Get global stats after claiming
      const [totalAllocatedAfter, totalClaimedAfter, ,] = await vesting.getGlobalStats();

      // Check that total allocated decreased by the bonus amount
      expect(totalAllocatedAfter).to.equal(totalAllocatedBefore - bonusAmount);

      // Check that total claimed increased by the bonus amount
      expect(totalClaimedAfter).to.equal(totalClaimedBefore + bonusAmount);

      // Check that bonus amount is now zero
      const bizdevAllocAfter = await vesting.bizdevAllocation();
      expect(bizdevAllocAfter.bonusAmount).to.equal(0);
    });
  });

  describe("Clawback functionality", function () {
    it("Should not allow clawback when not paused", async function () {
      // Start vesting
      await vesting.startVesting();

      // Try to claw back remaining amount without pausing
      await expect(vesting.clawBackBizdevRemaining()).to.be.revertedWith(
        "Claiming must be paused first"
      );

      // Try to claw back bonus without pausing
      await expect(vesting.clawBackBizdevBonus()).to.be.revertedWith(
        "Claiming must be paused first"
      );
    });

    it("Should allow clawback of remaining amount after pausing", async function () {
      // Start vesting
      await vesting.startVesting();
      vestingStartTime = (await ethers.provider.getBlock("latest")).timestamp;

      // Move time forward to 90 days after vesting starts (about 25% of vesting period)
      await ethers.provider.send("evm_increaseTime", [90 * ONE_DAY]);
      await ethers.provider.send("evm_mine");

      // Pause bizdev claiming
      await vesting.pauseBizdevClaiming();

      // Get the claimable amount that would be available if not paused
      const totalAmount = (await vesting.bizdevAllocation()).totalAmount;
      const elapsedTime = BigInt(90 * ONE_DAY);
      const vestingPeriod = await vesting.VESTING_PERIOD();
      const vestedAmount = (totalAmount * elapsedTime) / vestingPeriod;
      const expectedClawbackAmount = vestedAmount;

      // Claw back remaining amount
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await vesting.clawBackBizdevRemaining();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Check that owner's balance increased by approximately the clawed back amount (minus gas fees)
      const balanceDiff = ownerBalanceAfter - ownerBalanceBefore + gasUsed;
      expect(balanceDiff).to.be.closeTo(expectedClawbackAmount, ethers.parseEther("0.1"));

      // Check that bizdev's claimed amount is updated to prevent future claims
      const bizdevAlloc = await vesting.bizdevAllocation();
      expect(bizdevAlloc.claimedAmount).to.be.closeTo(vestedAmount, ethers.parseEther("0.01"));

      // Try to claim as bizdev after clawback
      await expect(vesting.connect(bizdev).claim()).to.be.revertedWith(
        "No tokens available to claim"
      );
    });

    it("Should allow clawback of bonus amount", async function () {
      // Start vesting
      await vesting.startVesting();

      // Pause bizdev claiming
      await vesting.pauseBizdevClaiming();

      // Claw back bonus amount
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await vesting.clawBackBizdevBonus();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Check that owner's balance increased by approximately the bonus amount (minus gas fees)
      const balanceDiff = ownerBalanceAfter - ownerBalanceBefore + gasUsed;
      expect(balanceDiff).to.be.closeTo(ethers.parseEther("5"), ethers.parseEther("0.1"));

      // Check that bonus amount is now zero
      const bizdevAlloc = await vesting.bizdevAllocation();
      expect(bizdevAlloc.bonusAmount).to.equal(0);

      // Try to claim bonus after clawback
      await vesting.unlockBizdevBonus();
      await expect(vesting.connect(bizdev).claimBizdevBonus()).to.be.revertedWith(
        "Bonus already claimed"
      );
    });
  });
});
