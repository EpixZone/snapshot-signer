const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

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

  // Fund the contract
  console.log("Funding the contract with", totalAmount.toString(), "wei...");
  const fundTx = await deployer.sendTransaction({
    to: vestingAddress,
    value: totalAmount,
  });
  await fundTx.wait();
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
