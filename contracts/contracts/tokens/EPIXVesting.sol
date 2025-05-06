// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title EPIXVesting
 * @dev A contract for vesting EPIX tokens over time.
 * Allows users to claim their tokens gradually over a vesting period.
 * Includes special allocation for a bizdev partner with conditional claiming rules.
 */
contract EPIXVesting is Ownable, ReentrancyGuard {
    // Vesting period in seconds (1 year)
    uint256 public constant VESTING_PERIOD = 365 days;

    // Start time of the vesting period
    uint256 public vestingStartTime;

    // Struct to store allocation data for each user
    struct Allocation {
        uint256 totalAmount; // Total amount allocated to the user
        uint256 claimedAmount; // Amount already claimed by the user
        bool exists; // Flag to check if allocation exists
    }

    // Special allocation for bizdev partner
    struct BizdevAllocation {
        address addr; // Bizdev partner address
        uint256 totalAmount; // Total amount allocated (excluding bonus)
        uint256 claimedAmount; // Amount already claimed
        uint256 bonusAmount; // Bonus amount that can be unlocked
        bool bonusUnlocked; // Whether the bonus is unlocked
        bool isPaused; // Whether claiming is paused
    }

    // Mapping from user address to their allocation
    mapping(address => Allocation) public allocations;

    // Bizdev allocation
    BizdevAllocation public bizdevAllocation;

    // Events
    event TokensClaimed(address indexed user, uint256 amount);
    event BizdevTokensClaimed(address indexed user, uint256 amount);
    event BizdevBonusUnlocked(address indexed user, uint256 amount);
    event BizdevClaimingPaused(address indexed user);
    event BizdevClaimingResumed(address indexed user);
    event AllocationAdded(address indexed user, uint256 amount);

    /**
     * @dev Constructor to initialize the vesting contract
     * @param _vestingStartTime The timestamp when vesting starts
     * @param _bizdevAddress The address of the bizdev partner
     * @param _bizdevAmount The amount allocated to the bizdev partner (excluding bonus)
     * @param _bizdevBonus The bonus amount for the bizdev partner
     */
    constructor(
        uint256 _vestingStartTime,
        address _bizdevAddress,
        uint256 _bizdevAmount,
        uint256 _bizdevBonus
    ) Ownable(msg.sender) {
        require(
            _vestingStartTime >= block.timestamp,
            "Vesting start time must be in the future"
        );
        require(_bizdevAddress != address(0), "Bizdev address cannot be zero");

        vestingStartTime = _vestingStartTime;

        // Initialize bizdev allocation
        bizdevAllocation = BizdevAllocation({
            addr: _bizdevAddress,
            totalAmount: _bizdevAmount,
            claimedAmount: 0,
            bonusAmount: _bizdevBonus,
            bonusUnlocked: false,
            isPaused: false
        });
    }

    /**
     * @dev Add allocations for multiple users
     * @param _users Array of user addresses
     * @param _amounts Array of allocation amounts
     */
    function addAllocations(
        address[] calldata _users,
        uint256[] calldata _amounts
    ) external onlyOwner {
        require(
            _users.length == _amounts.length,
            "Arrays must have the same length"
        );

        for (uint256 i = 0; i < _users.length; i++) {
            address user = _users[i];
            uint256 amount = _amounts[i];

            require(user != address(0), "User address cannot be zero");
            require(amount > 0, "Amount must be greater than zero");
            require(!allocations[user].exists, "Allocation already exists");

            allocations[user] = Allocation({
                totalAmount: amount,
                claimedAmount: 0,
                exists: true
            });

            emit AllocationAdded(user, amount);
        }
    }

    /**
     * @dev Add allocation for a single user
     * @param _user User address
     * @param _amount Allocation amount
     */
    function addAllocation(address _user, uint256 _amount) external onlyOwner {
        require(_user != address(0), "User address cannot be zero");
        require(_amount > 0, "Amount must be greater than zero");
        require(!allocations[_user].exists, "Allocation already exists");

        allocations[_user] = Allocation({
            totalAmount: _amount,
            claimedAmount: 0,
            exists: true
        });

        emit AllocationAdded(_user, _amount);
    }

    /**
     * @dev Calculate the amount of tokens that can be claimed by a user at the current time
     * @param _user User address
     * @return The amount of tokens that can be claimed
     */
    function getClaimableAmount(address _user) public view returns (uint256) {
        Allocation storage allocation = allocations[_user];

        if (!allocation.exists || block.timestamp < vestingStartTime) {
            return 0;
        }

        uint256 vestedAmount;
        if (block.timestamp >= vestingStartTime + VESTING_PERIOD) {
            // Vesting period has ended, all tokens are vested
            vestedAmount = allocation.totalAmount;
        } else {
            // Calculate vested amount based on elapsed time
            uint256 elapsedTime = block.timestamp - vestingStartTime;
            vestedAmount =
                (allocation.totalAmount * elapsedTime) /
                VESTING_PERIOD;
        }

        // Return the amount that can be claimed (vested amount minus already claimed amount)
        return
            vestedAmount > allocation.claimedAmount
                ? vestedAmount - allocation.claimedAmount
                : 0;
    }

    /**
     * @dev Calculate the amount of tokens that can be claimed by the bizdev partner at the current time
     * @return The amount of tokens that can be claimed
     */
    function getBizdevClaimableAmount() public view returns (uint256) {
        if (bizdevAllocation.isPaused || block.timestamp < vestingStartTime) {
            return 0;
        }

        uint256 vestedAmount;
        if (block.timestamp >= vestingStartTime + VESTING_PERIOD) {
            // Vesting period has ended, all tokens are vested
            vestedAmount = bizdevAllocation.totalAmount;
        } else {
            // Calculate vested amount based on elapsed time
            uint256 elapsedTime = block.timestamp - vestingStartTime;
            vestedAmount =
                (bizdevAllocation.totalAmount * elapsedTime) /
                VESTING_PERIOD;
        }

        // Return the amount that can be claimed (vested amount minus already claimed amount)
        return
            vestedAmount > bizdevAllocation.claimedAmount
                ? vestedAmount - bizdevAllocation.claimedAmount
                : 0;
    }

    /**
     * @dev Claim vested tokens
     */
    function claim() external nonReentrant {
        uint256 claimableAmount = getClaimableAmount(msg.sender);
        require(claimableAmount > 0, "No tokens available to claim");

        // Update claimed amount
        allocations[msg.sender].claimedAmount += claimableAmount;

        // Transfer tokens to the user
        // Since EPIX is a native L1 coin, we transfer the native currency
        (bool success, ) = payable(msg.sender).call{value: claimableAmount}("");
        require(success, "Transfer failed");

        emit TokensClaimed(msg.sender, claimableAmount);
    }

    /**
     * @dev Claim vested tokens for bizdev partner
     */
    function claimBizdev() external nonReentrant {
        require(
            msg.sender == bizdevAllocation.addr,
            "Only bizdev partner can call this function"
        );

        uint256 claimableAmount = getBizdevClaimableAmount();
        require(claimableAmount > 0, "No tokens available to claim");

        // Update claimed amount
        bizdevAllocation.claimedAmount += claimableAmount;

        // Transfer tokens to the bizdev partner
        (bool success, ) = payable(msg.sender).call{value: claimableAmount}("");
        require(success, "Transfer failed");

        emit BizdevTokensClaimed(msg.sender, claimableAmount);
    }

    /**
     * @dev Claim bonus for bizdev partner
     */
    function claimBizdevBonus() external nonReentrant {
        require(
            msg.sender == bizdevAllocation.addr,
            "Only bizdev partner can call this function"
        );
        require(bizdevAllocation.bonusUnlocked, "Bonus is not unlocked yet");
        require(bizdevAllocation.bonusAmount > 0, "Bonus already claimed");

        uint256 bonusAmount = bizdevAllocation.bonusAmount;
        bizdevAllocation.bonusAmount = 0;

        // Transfer bonus tokens to the bizdev partner
        (bool success, ) = payable(msg.sender).call{value: bonusAmount}("");
        require(success, "Transfer failed");

        emit BizdevBonusUnlocked(msg.sender, bonusAmount);
    }

    /**
     * @dev Unlock bonus for bizdev partner
     */
    function unlockBizdevBonus() external onlyOwner {
        require(!bizdevAllocation.bonusUnlocked, "Bonus already unlocked");
        bizdevAllocation.bonusUnlocked = true;
    }

    /**
     * @dev Pause claiming for bizdev partner
     */
    function pauseBizdevClaiming() external onlyOwner {
        require(!bizdevAllocation.isPaused, "Already paused");
        bizdevAllocation.isPaused = true;
        emit BizdevClaimingPaused(bizdevAllocation.addr);
    }

    /**
     * @dev Resume claiming for bizdev partner
     */
    function resumeBizdevClaiming() external onlyOwner {
        require(bizdevAllocation.isPaused, "Not paused");
        bizdevAllocation.isPaused = false;
        emit BizdevClaimingResumed(bizdevAllocation.addr);
    }

    /**
     * @dev Receive function to accept EPIX tokens
     */
    receive() external payable {}
}
