const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EPIXVesting", function () {
  let EPIXVesting;
  let vesting;
  let owner;
  let user1;
  let user2;
  let bizdev;
  let vestingStartTime;

  // Get the vesting period from the contract
  let VESTING_PERIOD;
  const ONE_MINUTE = 60; // 1 minute in seconds

  beforeEach(async function () {
    [owner, user1, user2, bizdev] = await ethers.getSigners();

    // Deploy the vesting contract
    EPIXVesting = await ethers.getContractFactory("EPIXVesting");
    vesting = await EPIXVesting.deploy(
      bizdev.address,
      ethers.parseEther("15"), // 15 EPIX for bizdev
      ethers.parseEther("5") // 5 EPIX bonus
    );

    // Get the vesting period from the contract
    VESTING_PERIOD = await vesting.VESTING_PERIOD();

    // Add allocations for test users
    await vesting.addAllocation(user1.address, ethers.parseEther("1")); // 1 EPIX
    await vesting.addAllocation(user2.address, ethers.parseEther("2")); // 2 EPIX

    // Fund the contract with EPIX
    await owner.sendTransaction({
      to: await vesting.getAddress(),
      value: ethers.parseEther("23"), // 23 EPIX (1 + 2 + 15 + 5)
    });
  });

  describe("Initialization", function () {
    it("Should set the correct owner", async function () {
      expect(await vesting.owner()).to.equal(owner.address);
    });

    it("Should initialize with vesting not started", async function () {
      expect(await vesting.vestingStarted()).to.be.false;
    });

    it("Should set the correct bizdev allocation", async function () {
      const bizdevAlloc = await vesting.bizdevAllocation();
      expect(bizdevAlloc.addr).to.equal(bizdev.address);
      expect(bizdevAlloc.totalAmount).to.equal(ethers.parseEther("15"));
      expect(bizdevAlloc.bonusAmount).to.equal(ethers.parseEther("5"));
      expect(bizdevAlloc.bonusUnlocked).to.be.false;
      expect(bizdevAlloc.isPaused).to.be.false;
    });
  });

  describe("Vesting Control", function () {
    it("Should not allow non-owner to start vesting", async function () {
      await expect(vesting.connect(user1).startVesting()).to.be.reverted;
    });

    it("Should allow owner to start vesting", async function () {
      await vesting.startVesting();
      expect(await vesting.vestingStarted()).to.be.true;
      const startTime = await vesting.vestingStartTime();
      const latestBlock = await ethers.provider.getBlock("latest");
      expect(startTime).to.equal(latestBlock.timestamp);
    });

    it("Should not allow starting vesting twice", async function () {
      await vesting.startVesting();
      await expect(vesting.startVesting()).to.be.revertedWith(
        "Vesting has already started"
      );
    });
  });

  describe("Allocations", function () {
    it("Should add allocations correctly", async function () {
      const user1Alloc = await vesting.allocations(user1.address);
      expect(user1Alloc.totalAmount).to.equal(ethers.parseEther("1"));
      expect(user1Alloc.claimedAmount).to.equal(0);
      expect(user1Alloc.exists).to.be.true;

      const user2Alloc = await vesting.allocations(user2.address);
      expect(user2Alloc.totalAmount).to.equal(ethers.parseEther("2"));
      expect(user2Alloc.claimedAmount).to.equal(0);
      expect(user2Alloc.exists).to.be.true;
    });

    it("Should not allow adding allocation for the same user twice", async function () {
      await expect(
        vesting.addAllocation(user1.address, ethers.parseEther("5000"))
      ).to.be.revertedWith("Allocation already exists");
    });

    it("Should not allow adding allocation with zero amount", async function () {
      await expect(vesting.addAllocation(owner.address, 0)).to.be.revertedWith(
        "Amount must be greater than zero"
      );
    });
  });

  describe("Claiming", function () {
    it("Should not allow claiming before vesting starts", async function () {
      await expect(vesting.connect(user1).claim()).to.be.revertedWith(
        "No tokens available to claim"
      );
    });

    it("Should allow claiming after vesting starts", async function () {
      // Start vesting
      await vesting.startVesting();
      vestingStartTime = (await ethers.provider.getBlock("latest")).timestamp;

      // Move time forward to 15 minutes after vesting starts (25% of vesting period)
      await ethers.provider.send("evm_increaseTime", [15 * ONE_MINUTE]);
      await ethers.provider.send("evm_mine");

      // Get the current block timestamp
      const currentBlock = await ethers.provider.getBlock("latest");
      const elapsedTime = currentBlock.timestamp - vestingStartTime;

      // Calculate expected claimable amount based on actual elapsed time
      const expectedClaimable =
        (ethers.parseEther("1") * BigInt(elapsedTime)) / BigInt(VESTING_PERIOD);

      // Check claimable amount
      const claimable = await vesting.getClaimableAmount(user1.address);
      expect(claimable).to.be.closeTo(
        expectedClaimable,
        ethers.parseEther("0.1")
      ); // Allow small rounding difference

      // Get global stats before claiming
      const [totalAllocatedBefore, totalClaimedBefore, , , totalTimesClaimedBefore] = await vesting.getGlobalStats();
      expect(totalTimesClaimedBefore).to.equal(0);

      // Claim tokens
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      await vesting.connect(user1).claim();
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // Check that balance increased by approximately the claimable amount (minus gas fees)
      const balanceDiff = balanceAfter - balanceBefore;
      expect(balanceDiff).to.be.closeTo(claimable, ethers.parseEther("0.1"));

      // Check that claimed amount is updated
      const user1Alloc = await vesting.allocations(user1.address);
      expect(user1Alloc.claimedAmount).to.be.closeTo(
        expectedClaimable,
        ethers.parseEther("0.1")
      );

      // Get global stats after claiming
      const [totalAllocatedAfter, totalClaimedAfter, , , totalTimesClaimedAfter] = await vesting.getGlobalStats();

      // Check that total claimed increased by the claimed amount
      expect(totalClaimedAfter).to.be.closeTo(totalClaimedBefore + claimable, ethers.parseEther("0.1"));

      // Check that times claimed increased by 1
      expect(totalTimesClaimedAfter).to.equal(totalTimesClaimedBefore + BigInt(1));
    });

    it("Should allow claiming full amount after vesting period", async function () {
      // Start vesting
      await vesting.startVesting();
      vestingStartTime = (await ethers.provider.getBlock("latest")).timestamp;

      // Move time forward to after vesting period ends
      await ethers.provider.send("evm_increaseTime", [Number(VESTING_PERIOD) + ONE_MINUTE]);
      await ethers.provider.send("evm_mine");

      // Check claimable amount
      const claimable = await vesting.getClaimableAmount(user1.address);
      expect(claimable).to.equal(ethers.parseEther("1"));

      // Get global stats before claiming
      const [totalAllocatedBefore, totalClaimedBefore, , , totalTimesClaimedBefore] = await vesting.getGlobalStats();

      // Claim tokens
      await vesting.connect(user1).claim();

      // Check that claimed amount is updated
      const user1Alloc = await vesting.allocations(user1.address);
      expect(user1Alloc.claimedAmount).to.equal(ethers.parseEther("1"));

      // Get global stats after claiming
      const [totalAllocatedAfter, totalClaimedAfter, , , totalTimesClaimedAfter] = await vesting.getGlobalStats();

      // Check that total claimed increased by the claimed amount
      expect(totalClaimedAfter).to.equal(totalClaimedBefore + ethers.parseEther("1"));

      // Check that times claimed increased by 1
      expect(totalTimesClaimedAfter).to.equal(totalTimesClaimedBefore + BigInt(1));

      // Try to claim again
      await expect(vesting.connect(user1).claim()).to.be.revertedWith(
        "No tokens available to claim"
      );
    });
  });

  describe("Bizdev Allocation", function () {
    it("Should allow bizdev to claim vested tokens", async function () {
      // Start vesting
      await vesting.startVesting();
      vestingStartTime = (await ethers.provider.getBlock("latest")).timestamp;

      // Move time forward to 15 minutes after vesting starts (25% of vesting period)
      await ethers.provider.send("evm_increaseTime", [15 * ONE_MINUTE]);
      await ethers.provider.send("evm_mine");

      // Get the claimable amount
      const claimable = await vesting.getBizdevClaimableAmount();
      expect(claimable).to.be.gt(0); // Should be greater than 0

      // Get global stats before claiming
      const [totalAllocatedBefore, totalClaimedBefore, , , totalTimesClaimedBefore] = await vesting.getGlobalStats();

      // Claim tokens
      const balanceBefore = await ethers.provider.getBalance(bizdev.address);
      const tx = await vesting.connect(bizdev).claimBizdev();
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
      const [totalAllocatedAfter, totalClaimedAfter, , , totalTimesClaimedAfter] = await vesting.getGlobalStats();

      // Check that total claimed increased by the claimed amount
      expect(totalClaimedAfter).to.be.closeTo(totalClaimedBefore + claimable, ethers.parseEther("0.01"));

      // Check that times claimed increased by 1
      expect(totalTimesClaimedAfter).to.equal(totalTimesClaimedBefore + BigInt(1));
    });

    it("Should not allow bizdev to claim bonus before it's unlocked", async function () {
      await expect(
        vesting.connect(bizdev).claimBizdevBonus()
      ).to.be.revertedWith("Bonus is not unlocked yet");
    });

    it("Should allow bizdev to claim bonus after it's unlocked", async function () {
      // Unlock bonus
      await vesting.unlockBizdevBonus();

      // Get global stats before claiming
      const [totalAllocatedBefore, totalClaimedBefore, , , totalTimesClaimedBefore] = await vesting.getGlobalStats();

      // Get bonus amount
      const bizdevAllocBefore = await vesting.bizdevAllocation();
      const bonusAmount = bizdevAllocBefore.bonusAmount;

      // Claim bonus
      const balanceBefore = await ethers.provider.getBalance(bizdev.address);
      await vesting.connect(bizdev).claimBizdevBonus();
      const balanceAfter = await ethers.provider.getBalance(bizdev.address);

      // Check that balance increased by approximately the bonus amount (minus gas fees)
      const balanceDiff = balanceAfter - balanceBefore;
      expect(balanceDiff).to.be.closeTo(
        ethers.parseEther("5"),
        ethers.parseEther("0.1")
      );

      // Check that bonus amount is now zero
      const bizdevAlloc = await vesting.bizdevAllocation();
      expect(bizdevAlloc.bonusAmount).to.equal(0);

      // Get global stats after claiming
      const [totalAllocatedAfter, totalClaimedAfter, , , totalTimesClaimedAfter] = await vesting.getGlobalStats();

      // Check that total claimed increased by the bonus amount
      expect(totalClaimedAfter).to.equal(totalClaimedBefore + bonusAmount);

      // Check that times claimed increased by 1
      expect(totalTimesClaimedAfter).to.equal(totalTimesClaimedBefore + BigInt(1));
    });

    it("Should pause and resume bizdev claiming", async function () {
      // Start vesting
      await vesting.startVesting();
      vestingStartTime = (await ethers.provider.getBlock("latest")).timestamp;

      // Move time forward to 15 minutes after vesting starts
      await ethers.provider.send("evm_increaseTime", [15 * ONE_MINUTE]);
      await ethers.provider.send("evm_mine");

      // Pause bizdev claiming
      await vesting.pauseBizdevClaiming();

      // Check that bizdev claiming is paused
      const bizdevAlloc1 = await vesting.bizdevAllocation();
      expect(bizdevAlloc1.isPaused).to.be.true;

      // Check that claimable amount is zero when paused
      expect(await vesting.getBizdevClaimableAmount()).to.equal(0);

      // Try to claim while paused
      await expect(vesting.connect(bizdev).claimBizdev()).to.be.revertedWith(
        "No tokens available to claim"
      );

      // Resume bizdev claiming
      await vesting.resumeBizdevClaiming();

      // Check that bizdev claiming is resumed
      const bizdevAlloc2 = await vesting.bizdevAllocation();
      expect(bizdevAlloc2.isPaused).to.be.false;

      // Check that claimable amount is non-zero after resuming
      expect(await vesting.getBizdevClaimableAmount()).to.be.gt(0);
    });
  });
});
