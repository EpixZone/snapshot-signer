const { ethers } = require("ethers");

async function main() {
  // Connect to the Epix Testnet
  const provider = new ethers.JsonRpcProvider(
    "https://evmrpc.testnet.epix.zone/"
  );

  const contractAddress = "0xC43750C20BBD39601a0D55FC6719641D98Bcd87A";
  const userAddress = "0x33e16ddfb7308b286bf4d31fcf0b9bbb0c5a6658";

  // Contract ABI for the functions we need
  const abi = [
    "function vestingStartTime() view returns (uint256)",
    "function VESTING_PERIOD() view returns (uint256)",
    "function allocations(address) view returns (uint256 totalAmount, uint256 claimedAmount, bool exists)",
    "function getClaimableAmount(address) view returns (uint256)",
  ];

  try {
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Check if contract exists
    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      console.log("Contract not deployed at this address");
      return;
    }
    console.log("Contract exists at the specified address");

    // Get contract info
    const startTime = await contract.vestingStartTime();
    const period = await contract.VESTING_PERIOD();

    console.log("\nContract Info:");
    console.log(
      "Vesting Start Time:",
      new Date(Number(startTime) * 1000).toISOString()
    );
    console.log("Vesting Period:", Number(period) / (24 * 60 * 60), "days");

    // Check allocation for the user
    const allocation = await contract.allocations(userAddress);
    console.log("\nUser Allocation:");
    console.log(
      "Total Amount:",
      ethers.formatEther(allocation.totalAmount),
      "EPIX"
    );
    console.log(
      "Claimed Amount:",
      ethers.formatEther(allocation.claimedAmount),
      "EPIX"
    );
    console.log("Exists:", allocation.exists);

    // Get claimable amount
    const claimable = await contract.getClaimableAmount(userAddress);
    console.log("Claimable Amount:", ethers.formatEther(claimable), "EPIX");
  } catch (error) {
    console.error("Error:", error.message);
    // If we have more detailed error data, log it
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main().catch(console.error);
