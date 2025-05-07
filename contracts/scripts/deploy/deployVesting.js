const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { formatEther, parseEther } = require("ethers");

// Maximum amount that can be sent in a single transaction
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
  console.log("Deploying contracts with the account:", deployer.address);

  // Read allocations from JSON file
  const allocationsPath = path.join(__dirname, "../../allocations.json");
  const allocationsData = JSON.parse(fs.readFileSync(allocationsPath, "utf8"));

  // Get bizdev data
  const bizdevAddress = allocationsData.bizdev.address;
  const bizdevAmount = allocationsData.bizdev.amount;
  const bizdevBonus = allocationsData.bizdev.bonus;

  console.log("Bizdev address:", bizdevAddress);
  console.log("Bizdev amount:", bizdevAmount);
  console.log("Bizdev bonus:", bizdevBonus);

  // Deploy the vesting contract
  const EPIXVesting = await hre.ethers.getContractFactory("EPIXVesting");
  const vesting = await EPIXVesting.deploy(
    bizdevAddress,
    bizdevAmount,
    bizdevBonus
  );

  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log("EPIXVesting deployed to:", vestingAddress);

  // Add allocations in batches to avoid gas limit issues
  const batchSize = 50;
  const allocations = allocationsData.allocations;

  for (let i = 0; i < allocations.length; i += batchSize) {
    const batch = allocations.slice(i, i + batchSize);
    const addresses = batch.map((a) => a.address);
    const amounts = batch.map((a) => a.amount);

    console.log(
      `Adding allocations batch ${i / batchSize + 1}/${Math.ceil(
        allocations.length / batchSize
      )}`
    );
    const tx = await vesting.addAllocations(addresses, amounts);
    await tx.wait();
  }

  console.log("All allocations added successfully");

  // Calculate total amount needed
  const totalAmount =
    allocations.reduce((sum, a) => sum + BigInt(a.amount), BigInt(0)) +
    BigInt(bizdevAmount) +
    BigInt(bizdevBonus);

  console.log("Total amount needed:", totalAmount.toString());
  console.log("Total amount needed in EPIX:", formatEther(totalAmount));

  // Check if deployer has enough balance before funding
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Your balance:", formatEther(deployerBalance), "EPIX");
  // Compare balance with required amount
  if (deployerBalance < totalAmount) {
    console.error(`Insufficient balance. You need ${formatEther(totalAmount)} EPIX but only have ${formatEther(deployerBalance)} EPIX.`);
    process.exit(1);
  }

  // Send transaction(s) to fund the contract
  console.log(`Sending ${formatEther(totalAmount)} EPIX to ${vestingAddress}...`);

  // Split the amount into chunks if it's too large
  const chunks = splitIntoChunks(totalAmount);
  console.log(`Transaction will be split into ${chunks.length} chunk(s) to avoid size limitations`);

  let totalSent = 0n;
  for (let i = 0; i < chunks.length; i++) {
    const chunkAmount = chunks[i];
    console.log(`Sending chunk ${i + 1}/${chunks.length}: ${formatEther(chunkAmount)} EPIX...`);

    const tx = await deployer.sendTransaction({
      to: vestingAddress,
      value: chunkAmount
    });

    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");

    await tx.wait();
    totalSent += chunkAmount;
    console.log(`Progress: ${formatEther(totalSent)}/${formatEther(totalAmount)} EPIX sent`);
  }
  console.log("Contract funded successfully");

  // Start vesting
  console.log("Starting vesting period...");
  const startTx = await vesting.startVesting();
  await startTx.wait();
  console.log("Vesting period started");

  // Verify contract on Etherscan
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await vesting.deploymentTransaction().wait(5); // Wait for 5 confirmations

    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: vestingAddress,
        constructorArguments: [bizdevAddress, bizdevAmount, bizdevBonus],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
