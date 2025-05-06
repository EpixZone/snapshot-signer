const fs = require('fs');
const path = require('path');
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Loading allocations with the account:", deployer.address);

  // Get contract address from command line arguments
  // When running with hardhat, the arguments come after the -- separator
  // e.g., npx hardhat run scripts/loadAllocations.js --network epixTestnet -- 0xContractAddress
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("Please provide the contract address using the CONTRACT_ADDRESS environment variable");
    console.error("Example: CONTRACT_ADDRESS=0xYourContractAddress npx hardhat run scripts/loadAllocations.js --network epixTestnet");
    process.exit(1);
  }

  // Read allocations from JSON file
  const allocationsPath = path.join(__dirname, '../allocations.json');
  const allocationsData = JSON.parse(fs.readFileSync(allocationsPath, 'utf8'));

  // Get the contract instance
  const EPIXVesting = await hre.ethers.getContractFactory("EPIXVesting");
  const vesting = EPIXVesting.attach(contractAddress);

  // Add allocations in batches to avoid gas limit issues
  const batchSize = 50;
  const allocations = allocationsData.allocations;

  // Filter out addresses that already have allocations
  console.log("Checking existing allocations...");
  const newAllocations = [];

  for (const allocation of allocations) {
    try {
      const existingAllocation = await vesting.allocations(allocation.address);
      if (!existingAllocation.exists) {
        newAllocations.push(allocation);
      } else {
        console.log(`Skipping ${allocation.address} - allocation already exists`);
      }
    } catch (error) {
      console.error(`Error checking allocation for ${allocation.address}:`, error.message);
    }
  }

  console.log(`Found ${newAllocations.length} new allocations to add out of ${allocations.length} total`);

  if (newAllocations.length === 0) {
    console.log("No new allocations to add. All allocations already exist.");
    return;
  }

  // Add new allocations in batches
  for (let i = 0; i < newAllocations.length; i += batchSize) {
    const batch = newAllocations.slice(i, i + batchSize);
    const addresses = batch.map(a => a.address);
    const amounts = batch.map(a => a.amount);

    console.log(`Adding allocations batch ${i / batchSize + 1}/${Math.ceil(newAllocations.length / batchSize)}`);
    try {
      const tx = await vesting.addAllocations(addresses, amounts);
      await tx.wait();
      console.log(`Batch ${i / batchSize + 1} added successfully`);
    } catch (error) {
      console.error(`Error adding batch ${i / batchSize + 1}:`, error.message);
    }
  }

  console.log("All new allocations processed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
