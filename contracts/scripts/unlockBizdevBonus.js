// Script to unlock the bizdev bonus in the EPIXVesting contract
const { ethers } = require("hardhat");

// Handle different ethers versions
const formatEther = (value) => {
  // For ethers v6
  if (ethers.formatEther) {
    return ethers.formatEther(value);
  }
  // For ethers v5
  if (ethers.utils && ethers.utils.formatEther) {
    return ethers.utils.formatEther(value);
  }
  // Fallback: convert to string and divide by 10^18
  return (BigInt(value.toString()) / BigInt(10 ** 18)).toString();
};

async function main() {
  try {
    // Get the contract address from environment variable
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
      console.error("Please provide the contract address as an environment variable");
      console.error("Usage: CONTRACT_ADDRESS=0x... npx hardhat run scripts/unlockBizdevBonus.js --network <network>");
      process.exit(1);
    }

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Unlocking bizdev bonus with the account:", deployer.address);

    // Get the contract instance
    const EPIXVesting = await ethers.getContractFactory("EPIXVesting");
    const vesting = EPIXVesting.attach(contractAddress);

    // Get bizdev allocation before unlocking
    const bizdevBefore = await vesting.bizdevAllocation();
    console.log("\nBizdev allocation before unlocking:");
    console.log(`Address: ${bizdevBefore.addr}`);
    console.log(`Total Amount: ${formatEther(bizdevBefore.totalAmount)} EPIX`);
    console.log(`Claimed Amount: ${formatEther(bizdevBefore.claimedAmount)} EPIX`);
    console.log(`Bonus Amount: ${formatEther(bizdevBefore.bonusAmount)} EPIX`);
    console.log(`Bonus Unlocked: ${bizdevBefore.bonusUnlocked}`);
    console.log(`Is Paused: ${bizdevBefore.isPaused}`);

    // Check if bonus is already unlocked
    if (bizdevBefore.bonusUnlocked) {
      console.log("\nBonus is already unlocked!");
      process.exit(0);
    }

    // Unlock the bizdev bonus
    console.log("\nUnlocking bizdev bonus...");
    const tx = await vesting.unlockBizdevBonus();
    await tx.wait();
    console.log("Transaction hash:", tx.hash);

    // Get bizdev allocation after unlocking
    const bizdevAfter = await vesting.bizdevAllocation();
    console.log("\nBizdev allocation after unlocking:");
    console.log(`Address: ${bizdevAfter.addr}`);
    console.log(`Total Amount: ${formatEther(bizdevAfter.totalAmount)} EPIX`);
    console.log(`Claimed Amount: ${formatEther(bizdevAfter.claimedAmount)} EPIX`);
    console.log(`Bonus Amount: ${formatEther(bizdevAfter.bonusAmount)} EPIX`);
    console.log(`Bonus Unlocked: ${bizdevAfter.bonusUnlocked}`);
    console.log(`Is Paused: ${bizdevAfter.isPaused}`);

    console.log("\nBonus unlocked successfully!");
    console.log(`The bizdev partner (${bizdevAfter.addr}) can now claim the bonus of ${formatEther(bizdevAfter.bonusAmount)} EPIX.`);

  } catch (error) {
    console.error("Error unlocking bizdev bonus:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
