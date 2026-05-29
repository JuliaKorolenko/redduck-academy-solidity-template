// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

// Raffle — players deposit a volatile token; each deposit's USD value at entry
// time (from a Chainlink price feed) sets its win probability. After drawTime a
// Chainlink VRF draw picks a weighted winner, who claims the whole pot.
//
// Randomness is asynchronous: drawWinner() requests a random word and returns
// immediately; the VRF coordinator calls fulfillRandomWords() back some blocks
// later. The data structure for the weighted draw and the claim verification are
// yours to design — you may not import a library that solves the weighted-draw
// or random-selection problem. See TASK.md for the full behavior spec.
contract Raffle is VRFConsumerBaseV2Plus {
    IERC20 public immutable token; // deposit token
    AggregatorV3Interface public immutable priceFeed; // token/USD feed
    uint256 public immutable drawTime;

    uint256 public immutable subscriptionId;
    bytes32 public immutable keyHash;
    uint32 public immutable callbackGasLimit;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 1;

    uint256 public constant MAX_PRICE_AGE = 1 hours; // feed staleness bound

    // TODO: declare the state you need — the entries and their weights, the
    //       total weight, the VRF request id, the random word, and whatever you
    //       use to track the winner and whether the prize has been claimed.
    uint256 public totalWeight;
    uint256 public requestId;
    uint256 public randomWord;

    error InvalidClaim();

    event Deposited(address indexed who, uint256 amount, uint256 weight);
    event DrawRequested(uint256 requestId);
    event WinnerPicked(address indexed winner);
    event Claimed(address indexed winner, uint256 amount);

    constructor(
        IERC20 _token,
        AggregatorV3Interface _priceFeed,
        uint256 _drawTime,
        address _coordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit
    ) VRFConsumerBaseV2Plus(_coordinator) {
        token = _token;
        priceFeed = _priceFeed;
        drawTime = _drawTime;
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
    }

    /// @notice Join the raffle by depositing tokens while it is open. The deposit's
    ///         weight is its USD value at the current feed price, fixed at entry.
    ///         Reject prices that are missing, non-positive, or stale.
    function deposit(uint256 amount) external {
        // TODO
    }

    /// @notice After drawTime, with at least one deposit, request a single random
    ///         word from VRF and track the returned request id. Only once.
    function drawWinner() external returns (uint256) {
        // TODO
    }

    /// @notice VRF callback. Confirm the request id matches and record the random
    ///         word — nothing more. No transfers, no loops, no settlement here.
    function fulfillRandomWords(uint256 _requestId, uint256[] calldata randomWords) internal override {
        // TODO
    }

    /// @notice After the random word arrives, the winner claims the prize. The
    ///         caller supplies the index of the winning entry; verify it belongs
    ///         to msg.sender and is the winning entry, else revert InvalidClaim.
    function claim(uint256 entryIndex) external {
        // TODO
    }
}
