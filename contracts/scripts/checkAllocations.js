const fs = require('fs');
const path = require('path');
const hre = require("hardhat");
const { formatEther } = require("ethers");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Checking allocations with the account:", deployer.address);

  // Get contract address from environment variable
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("Please provide the contract address using the CONTRACT_ADDRESS environment variable");
    console.error("Example: CONTRACT_ADDRESS=0xYourContractAddress npx hardhat run scripts/checkAllocations.js --network epixTestnet");
    process.exit(1);
  }

  // Read allocations from JSON file
  const allocationsPath = path.join(__dirname, '../allocations.json');
  const allocationsData = JSON.parse(fs.readFileSync(allocationsPath, 'utf8'));
  
  // Get the contract instance
  const EPIXVesting = await hre.ethers.getContractFactory("EPIXVesting");
  const vesting = EPIXVesting.attach(contractAddress);
  
  // Get contract info
  const vestingStartTime = await vesting.vestingStartTime();
  const vestingPeriod = await vesting.VESTING_PERIOD();
  const startDate = new Date(Number(vestingStartTime) * 1000);
  const endDate = new Date((Number(vestingStartTime) + Number(vestingPeriod)) * 1000);
  
  console.log("\n=== Contract Information ===");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Vesting Start Time: ${startDate.toISOString()}`);
  console.log(`Vesting End Time: ${endDate.toISOString()}`);
  console.log(`Vesting Period: ${Number(vestingPeriod) / (24 * 60 * 60)} days`);
  
  // Get bizdev allocation
  const bizdevAllocation = await vesting.bizdevAllocation();
  console.log("\n=== Bizdev Allocation ===");
  console.log(`Address: ${bizdevAllocation.addr}`);
  console.log(`Total Amount: ${formatEther(bizdevAllocation.totalAmount)} EPIX`);
  console.log(`Claimed Amount: ${formatEther(bizdevAllocation.claimedAmount)} EPIX`);
  console.log(`Bonus Amount: ${formatEther(bizdevAllocation.bonusAmount)} EPIX`);
  console.log(`Bonus Unlocked: ${bizdevAllocation.bonusUnlocked}`);
  console.log(`Is Paused: ${bizdevAllocation.isPaused}`);
  
  // Check allocations from the JSON file
  console.log("\n=== Checking Allocations ===");
  const allocations = allocationsData.allocations;
  let totalAllocated = 0n;
  let totalClaimed = 0n;
  let existingCount = 0;
  
  for (const allocation of allocations) {
    try {
      const existingAllocation = await vesting.allocations(allocation.address);
      if (existingAllocation.exists) {
        existingCount++;
        totalAllocated += existingAllocation.totalAmount;
        totalClaimed += existingAllocation.claimedAmount;
        
        // Get claimable amount
        const claimableAmount = await vesting.getClaimableAmount(allocation.address);
        
        console.log(`\nAddress: ${allocation.address}`);
        console.log(`  Total Amount: ${formatEther(existingAllocation.totalAmount)} EPIX`);
        console.log(`  Claimed Amount: ${formatEther(existingAllocation.claimedAmount)} EPIX`);
        console.log(`  Claimable Amount: ${formatEther(claimableAmount)} EPIX`);
        console.log(`  Remaining Amount: ${formatEther(existingAllocation.totalAmount - existingAllocation.claimedAmount)} EPIX`);
      } else {
        console.log(`\nAddress: ${allocation.address} - Not allocated yet`);
      }
    } catch (error) {
      console.error(`Error checking allocation for ${allocation.address}:`, error.message);
    }
  }
  
  console.log("\n=== Summary ===");
  console.log(`Total Allocations in JSON: ${allocations.length}`);
  console.log(`Existing Allocations in Contract: ${existingCount}`);
  console.log(`Total EPIX Allocated: ${formatEther(totalAllocated)} EPIX`);
  console.log(`Total EPIX Claimed: ${formatEther(totalClaimed)} EPIX (${totalClaimed * 100n / totalAllocated}%)`);
  
  // Check contract balance
  const contractBalance = await hre.ethers.provider.getBalance(contractAddress);
  console.log(`Contract Balance: ${formatEther(contractBalance)} EPIX`);
  
  // Calculate if contract has enough funds
  const totalNeeded = totalAllocated - totalClaimed + bizdevAllocation.totalAmount - bizdevAllocation.claimedAmount + bizdevAllocation.bonusAmount;
  console.log(`Total EPIX Needed: ${formatEther(totalNeeded)} EPIX`);
  
  if (contractBalance < totalNeeded) {
    console.log(`WARNING: Contract needs additional ${formatEther(totalNeeded - contractBalance)} EPIX to cover all allocations`);
  } else {
    console.log(`Contract has sufficient funds to cover all allocations`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
