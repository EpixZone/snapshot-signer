const fs = require('fs');
const path = require('path');
const hre = require("hardhat");
const { formatEther, parseEther } = require("ethers");

// Maximum amount that can be sent in a single transaction
// The error indicates we need to use a much smaller value than 100M ETH
const MAX_TRANSACTION_VALUE = parseEther("1000000"); // 1000000 EPIX per transaction

/**
 * Splits a large amount into smaller chunks that can be sent in separate transactions
 * @param {bigint} totalAmount - The total amount to send
 * @returns {bigint[]} An array of smaller amounts that sum up to the total amount
 */
function splitIntoChunks(totalAmount) {
  const chunks = [];
  let remainingAmount = totalAmount;

  while (remainingAmount > 0n) {
    if (remainingAmount > MAX_TRANSACTION_VALUE) {
      chunks.push(MAX_TRANSACTION_VALUE);
      remainingAmount -= MAX_TRANSACTION_VALUE;
    } else {
      chunks.push(remainingAmount);
      remainingAmount = 0n;
    }
  }

  return chunks;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Funding contract with the account:", deployer.address);

  // Get contract address from environment variable
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("Please provide the contract address using the CONTRACT_ADDRESS environment variable");
    console.error("Example: CONTRACT_ADDRESS=0xYourContractAddress AMOUNT=100 npx hardhat run scripts/fundContract.js --network epixTestnet");
    process.exit(1);
  }

  // Get amount to fund from environment variable or calculate from allocations
  let amountToFund;
  if (process.env.AMOUNT) {
    amountToFund = parseEther(process.env.AMOUNT);
    console.log(`Using provided amount: ${formatEther(amountToFund)} EPIX`);
  } else {
    // Calculate amount from allocations
    console.log("No amount provided, calculating from allocations...");

    // Read allocations from JSON file
    const allocationsPath = path.join(__dirname, '../allocations.json');
    const allocationsData = JSON.parse(fs.readFileSync(allocationsPath, 'utf8'));

    // Get the contract instance to check existing claims
    const EPIXVesting = await hre.ethers.getContractFactory("EPIXVesting");
    const vesting = EPIXVesting.attach(contractAddress);

    // Get bizdev allocation
    const bizdevAllocation = await vesting.bizdevAllocation();

    // Calculate total from allocations
    const allocations = allocationsData.allocations;
    let totalAllocated = 0n;
    let totalClaimed = 0n;

    console.log("Checking existing allocations and claims...");
    for (const allocation of allocations) {
      try {
        const existingAllocation = await vesting.allocations(allocation.address);
        if (existingAllocation.exists) {
          totalAllocated += existingAllocation.totalAmount;
          totalClaimed += existingAllocation.claimedAmount;
        } else {
          // If allocation doesn't exist yet, add it to the total
          totalAllocated += BigInt(allocation.amount);
        }
      } catch (error) {
        console.error(`Error checking allocation for ${allocation.address}:`, error.message);
      }
    }

    // Add bizdev allocation
    const bizdevTotal = bizdevAllocation.totalAmount + bizdevAllocation.bonusAmount;
    const bizdevClaimed = bizdevAllocation.claimedAmount;

    // Calculate total needed (total allocated - total claimed)
    const totalNeeded = totalAllocated - totalClaimed + bizdevTotal - bizdevClaimed;

    // Get current contract balance
    const contractBalance = await hre.ethers.provider.getBalance(contractAddress);
    console.log(`Current contract balance: ${formatEther(contractBalance)} EPIX`);

    // Calculate amount to fund (total needed - current balance)
    if (contractBalance >= totalNeeded) {
      console.log("Contract already has sufficient funds.");
      console.log(`Contract balance: ${formatEther(contractBalance)} EPIX`);
      console.log(`Total needed: ${formatEther(totalNeeded)} EPIX`);
      return;
    }

    amountToFund = totalNeeded - contractBalance;
    console.log(`Calculated amount to fund: ${formatEther(amountToFund)} EPIX`);
  }

  // Check if deployer has enough balance
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Your balance: ${formatEther(deployerBalance)} EPIX`);

  if (deployerBalance < amountToFund) {
    console.error(`Insufficient balance. You need ${formatEther(amountToFund)} EPIX but only have ${formatEther(deployerBalance)} EPIX.`);
    process.exit(1);
  }

  // Send transaction(s) to fund the contract
  console.log(`Sending ${formatEther(amountToFund)} EPIX to ${contractAddress}...`);

  // Split the amount into chunks if it's too large
  const chunks = splitIntoChunks(amountToFund);
  console.log(`Transaction will be split into ${chunks.length} chunk(s) to avoid size limitations`);

  let totalSent = 0n;
  for (let i = 0; i < chunks.length; i++) {
    const chunkAmount = chunks[i];
    console.log(`Sending chunk ${i + 1}/${chunks.length}: ${formatEther(chunkAmount)} EPIX...`);

    const tx = await deployer.sendTransaction({
      to: contractAddress,
      value: chunkAmount
    });

    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");

    await tx.wait();
    totalSent += chunkAmount;
    console.log(`Progress: ${formatEther(totalSent)}/${formatEther(amountToFund)} EPIX sent`);
  }

  // Verify the new balance
  const newBalance = await hre.ethers.provider.getBalance(contractAddress);
  console.log(`New contract balance: ${formatEther(newBalance)} EPIX`);
  console.log("Contract funded successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
