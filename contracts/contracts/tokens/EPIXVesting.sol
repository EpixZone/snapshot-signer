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

    // Flag to check if vesting has started
    bool public vestingStarted;

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

    // Global stats
    uint256 public totalAllocated; // Total amount allocated to all users (excluding bizdev)
    uint256 public totalClaimed; // Total amount claimed by all users (excluding bizdev)
    uint256 public totalUsers; // Total number of users with allocations
    uint256 public originalBizdevBonus; // Original bizdev bonus amount (to track if claimed)
    uint256 public totalTimesClaimed; // Total number of claim transactions

    // Events
    event TokensClaimed(address indexed user, uint256 amount);
    event BizdevTokensClaimed(address indexed user, uint256 amount);
    event BizdevBonusUnlocked(address indexed user, uint256 amount);
    event BizdevClaimingPaused(address indexed user);
    event BizdevClaimingResumed(address indexed user);
    event AllocationAdded(address indexed user, uint256 amount);
    event VestingStarted(uint256 startTime);
    event BizdevRemainingClawedBack(address indexed user, uint256 amount);
    event BizdevBonusClawedBack(address indexed user, uint256 amount);

    /**
     * @dev Constructor to initialize the vesting contract
     * @param _bizdevAddress The address of the bizdev partner
     * @param _bizdevAmount The amount allocated to the bizdev partner (excluding bonus)
     * @param _bizdevBonus The bonus amount for the bizdev partner
     */
    constructor(
        address _bizdevAddress,
        uint256 _bizdevAmount,
        uint256 _bizdevBonus
    ) Ownable(msg.sender) {
        require(_bizdevAddress != address(0), "Bizdev address cannot be zero");

        vestingStarted = false;

        // Initialize bizdev allocation
        bizdevAllocation = BizdevAllocation({
            addr: _bizdevAddress,
            totalAmount: _bizdevAmount,
            claimedAmount: 0,
            bonusAmount: _bizdevBonus,
            bonusUnlocked: false,
            isPaused: false
        });

        // Initialize global stats
        totalAllocated = 0;
        totalClaimed = 0;
        totalUsers = 0;
        originalBizdevBonus = _bizdevBonus;
        totalTimesClaimed = 0;
    }

    /**
     * @dev Start the vesting period
     * Can only be called once by the contract owner
     */
    function startVesting() external onlyOwner {
        require(!vestingStarted, "Vesting has already started");
        vestingStartTime = block.timestamp;
        vestingStarted = true;
        emit VestingStarted(vestingStartTime);
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

            // Update global stats
            totalAllocated += amount;
            totalUsers += 1;

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

        // Update global stats
        totalAllocated += _amount;
        totalUsers += 1;

        emit AllocationAdded(_user, _amount);
    }

    /**
     * @dev Calculate the amount of tokens that can be claimed by a user at the current time
     * @param _user User address
     * @return The amount of tokens that can be claimed
     */
    function getClaimableAmount(address _user) public view returns (uint256) {
        // Check if this is the bizdev partner
        if (_user == bizdevAllocation.addr) {
            return getBizdevClaimableAmount();
        }

        Allocation storage allocation = allocations[_user];

        if (!allocation.exists || !vestingStarted) {
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
        if (bizdevAllocation.isPaused || !vestingStarted) {
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

        // Check if this is the bizdev partner
        if (msg.sender == bizdevAllocation.addr) {
            // Update claimed amount for bizdev
            bizdevAllocation.claimedAmount += claimableAmount;

            // Update global stats to include bizdev claims
            totalClaimed += claimableAmount;
            totalTimesClaimed += 1;

            // Transfer tokens to the bizdev partner
            (bool success, ) = payable(msg.sender).call{value: claimableAmount}(
                ""
            );
            require(success, "Transfer failed");

            emit BizdevTokensClaimed(msg.sender, claimableAmount);
        } else {
            // Update claimed amount for regular user
            allocations[msg.sender].claimedAmount += claimableAmount;

            // Update global stats
            totalClaimed += claimableAmount;
            totalTimesClaimed += 1;

            // Transfer tokens to the user
            // Since EPIX is a native L1 coin, we transfer the native currency
            (bool success, ) = payable(msg.sender).call{value: claimableAmount}(
                ""
            );
            require(success, "Transfer failed");

            emit TokensClaimed(msg.sender, claimableAmount);
        }
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

        // Update global stats to include bizdev claims
        totalClaimed += claimableAmount;
        totalTimesClaimed += 1;

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

        // Update the claimed amount to include the bonus
        bizdevAllocation.claimedAmount += bonusAmount;
        totalClaimed += bonusAmount;
        totalTimesClaimed += 1;

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
     * @dev Claw back remaining claimable amount from bizdev partner
     * Can only be called by the owner when claiming is paused
     * @return The amount clawed back
     */
    function clawBackBizdevRemaining() external onlyOwner returns (uint256) {
        require(bizdevAllocation.isPaused, "Claiming must be paused first");

        // Calculate the remaining amount that would be claimable if not paused
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

        // Calculate remaining claimable amount
        uint256 remainingClaimable = 0;
        if (vestedAmount > bizdevAllocation.claimedAmount) {
            remainingClaimable = vestedAmount - bizdevAllocation.claimedAmount;
        }

        if (remainingClaimable == 0) {
            return 0;
        }

        // Set the claimed amount to the vested amount to prevent future claims
        bizdevAllocation.claimedAmount = vestedAmount;

        // Transfer the clawed back amount to the owner
        (bool success, ) = payable(owner()).call{value: remainingClaimable}("");
        require(success, "Transfer failed");

        emit BizdevRemainingClawedBack(
            bizdevAllocation.addr,
            remainingClaimable
        );

        return remainingClaimable;
    }

    /**
     * @dev Claw back bonus amount from bizdev partner
     * Can only be called by the owner when claiming is paused
     * @return The amount clawed back
     */
    function clawBackBizdevBonus() external onlyOwner returns (uint256) {
        require(bizdevAllocation.isPaused, "Claiming must be paused first");
        require(bizdevAllocation.bonusAmount > 0, "No bonus to claw back");

        uint256 bonusAmount = bizdevAllocation.bonusAmount;
        bizdevAllocation.bonusAmount = 0;

        // Transfer the clawed back bonus to the owner
        (bool success, ) = payable(owner()).call{value: bonusAmount}("");
        require(success, "Transfer failed");

        emit BizdevBonusClawedBack(bizdevAllocation.addr, bonusAmount);

        return bonusAmount;
    }

    /**
     * @dev Get total allocated amount including bizdev allocation and bonus
     * @return Total allocated amount
     */
    function getTotalAllocated() public view returns (uint256) {
        return
            totalAllocated + bizdevAllocation.totalAmount + originalBizdevBonus;
    }

    /**
     * @dev Get total claimed amount
     * @return Total claimed amount
     */
    function getTotalClaimed() public view returns (uint256) {
        // Since we now update totalClaimed directly for all claims including bizdev,
        // we just return the totalClaimed variable
        return totalClaimed;
    }

    /**
     * @dev Get total number of users including bizdev
     * @return Total number of users
     */
    function getTotalUsers() public view returns (uint256) {
        return totalUsers + 1; // +1 for bizdev
    }

    /**
     * @dev Get global vesting stats
     * @return _totalAllocated Total allocated amount
     * @return _totalClaimed Total claimed amount
     * @return _totalUsers Total number of users
     * @return _remainingClaimable Total amount that can still be claimed
     * @return _totalTimesClaimed Total number of claim transactions
     */
    function getGlobalStats()
        public
        view
        returns (
            uint256 _totalAllocated,
            uint256 _totalClaimed,
            uint256 _totalUsers,
            uint256 _remainingClaimable,
            uint256 _totalTimesClaimed
        )
    {
        _totalAllocated = getTotalAllocated();
        _totalClaimed = getTotalClaimed();
        _totalUsers = getTotalUsers();
        _totalTimesClaimed = totalTimesClaimed;

        // Prevent underflow by checking if claimed amount exceeds allocated amount
        if (_totalClaimed > _totalAllocated) {
            _remainingClaimable = 0;
        } else {
            _remainingClaimable = _totalAllocated - _totalClaimed;
        }

        return (
            _totalAllocated,
            _totalClaimed,
            _totalUsers,
            _remainingClaimable,
            _totalTimesClaimed
        );
    }

    /**
     * @dev Receive function to accept EPIX tokens
     */
    receive() external payable {}
}
