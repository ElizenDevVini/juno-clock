// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// Wager by burning JUNO. Fees paid into this contract form the pot. Each time the keeper
/// logs an entry the clock advances and a slice of the pot is released to burners, pro rata
/// to what they burned. At midnight the whole pot is released and the clock stops.
contract JunoClock {
    uint256 public constant START = 1800;      // seconds to midnight before any evidence
    uint256 public constant PER_POINT = 30;    // seconds per weight point
    uint256 public constant MIDNIGHT = 60;     // points
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    IERC20 public immutable juno;
    address public keeper;

    uint256 public score;
    uint256 public pot;
    uint256 public totalBurned;
    uint256 public released;
    uint256 private accPerBurned; // scaled by 1e18

    mapping(address => uint256) public burned;
    mapping(address => uint256) private debt;
    mapping(address => uint256) private owed;

    event Burned(address indexed who, uint256 amount);
    event Advanced(uint256 weight, uint256 score, uint256 slice);
    event Claimed(address indexed who, uint256 amount);
    event Fees(address indexed from, uint256 amount);

    error NotKeeper();
    error Midnight();
    error BadWeight();
    error Zero();

    /// initialScore lets the chain start where the public record already is.
    constructor(IERC20 token, address keeper_, uint256 initialScore) {
        if (initialScore >= MIDNIGHT) revert Midnight();
        juno = token;
        keeper = keeper_;
        score = initialScore;
    }

    receive() external payable {
        pot += msg.value;
        emit Fees(msg.sender, msg.value);
    }

    function secondsLeft() public view returns (uint256) {
        uint256 used = score * PER_POINT;
        return used >= START ? 0 : START - used;
    }

    function isMidnight() public view returns (bool) {
        return score >= MIDNIGHT;
    }

    function pending(address who) public view returns (uint256) {
        return owed[who] + (burned[who] * accPerBurned) / 1e18 - debt[who];
    }

    function burn(uint256 amount) external {
        if (amount == 0) revert Zero();
        if (isMidnight()) revert Midnight();
        settle(msg.sender);
        juno.transferFrom(msg.sender, DEAD, amount);
        burned[msg.sender] += amount;
        totalBurned += amount;
        debt[msg.sender] = (burned[msg.sender] * accPerBurned) / 1e18;
        emit Burned(msg.sender, amount);
    }

    function advance(uint256 weight) external {
        if (msg.sender != keeper) revert NotKeeper();
        if (weight == 0 || weight > 5) revert BadWeight();
        if (isMidnight()) revert Midnight();
        uint256 left = secondsLeft();
        score += weight;
        uint256 slice;
        if (isMidnight() || weight * PER_POINT >= left) slice = pot;
        else slice = (pot * weight * PER_POINT) / left;
        if (totalBurned > 0 && slice > 0) {
            pot -= slice;
            released += slice;
            accPerBurned += (slice * 1e18) / totalBurned;
        } else {
            slice = 0; // nobody has burned yet, the pot waits
        }
        emit Advanced(weight, score, slice);
    }

    function claim() external {
        settle(msg.sender);
        uint256 amount = owed[msg.sender];
        if (amount == 0) revert Zero();
        owed[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "send failed");
        emit Claimed(msg.sender, amount);
    }

    function setKeeper(address next) external {
        if (msg.sender != keeper) revert NotKeeper();
        keeper = next;
    }

    function settle(address who) private {
        uint256 earned = (burned[who] * accPerBurned) / 1e18;
        owed[who] += earned - debt[who];
        debt[who] = earned;
    }
}
