// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// PriceVotingWithdrawal — like the previous PriceVoting task, but voters may
// withdraw their locked tokens at any time, including during the voting period.
//
// Almost nothing about this contract's shape is prescribed. You decide the
// function signatures, events, errors, the storage layout, and the mechanism
// for resolving the winning price in the presence of withdrawals. The skeleton
// below is only a starting point — reuse, rename, or replace it as your design
// requires. See TASK.md for the required behavior and the reflection question.
contract PriceVotingWithdrawal {
    // TODO: declare your storage (token reference, voting end timestamp, the
    //       bookkeeping for locked tokens and per-price weight, and whatever
    //       structure you use to resolve the leader after withdrawals).

    IERC20 private curToken;
    uint256 private curVotingEnd;
    uint256[] private _allPrices;
    uint256 private _leaderPrice;
    uint256 private _leaderWeight;
    uint256 private _currentTokenPrice;
    bool private _finalized;

    mapping(uint256 => uint256) private _weightOf;
    mapping(address => mapping(uint256 => uint256)) private _lockedOf;
    mapping(uint256 => bool) private _priceExists;

    error VotingEnded();
    error VotingActive();
    error ZeroAmount();
    error AlreadyFinalized();
    error TransferFailed();

    event Voted(address indexed voter, uint256 indexed price, uint256 amount);
    event PriceFinalized(uint256 indexed price, uint256 weight);

    constructor(IERC20 _token, uint256 _votingEnd) {
        curToken = _token;
        curVotingEnd = _votingEnd;
    }

    function vote(uint256 price, uint256 amount) external {
        if (block.timestamp >= curVotingEnd) revert VotingEnded();
        if (amount == 0) revert ZeroAmount();

        bool success = curToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        _lockedOf[msg.sender][price] += amount;
        _weightOf[price] += amount;

        if (!_priceExists[price]) {
            _priceExists[price] = true;
            _allPrices.push(price);
        }

        emit Voted(msg.sender, price, amount);
    }

    function weightOf(uint256 price) external view returns (uint256) {
        return _weightOf[price];
    }

    function finalize() external {
        if (block.timestamp < curVotingEnd) revert VotingActive();
        if (_finalized) revert AlreadyFinalized();

        // if (_leaderWeight == 0) {
        //     _leaderPrice = 0;
        // }
        for (uint256 i = 0; i < _allPrices.length; i++) {
            uint256 price = _allPrices[i];
            uint256 weight = _weightOf[price];
            if (weight > _leaderWeight) {
                _leaderPrice = price;
                _leaderWeight = weight;
            }
        }

        _currentTokenPrice = _leaderPrice;
        _finalized = true;
        emit PriceFinalized(_leaderPrice, _leaderWeight);
    }

    function lockedOf(address voter, uint256 price) external view returns (uint256) {
        return _lockedOf[voter][price];
    }

    function allPrices() external view returns (uint256[] memory) {
        return _allPrices;
    }

    function votingEnd() external view returns (uint256) {
        return curVotingEnd;
    }

    function leader() external view returns (uint256 price, uint256 weight) {
        return (_leaderPrice, _leaderWeight);
    }

    function currentTokenPrice() external view returns (uint256) {
        return _currentTokenPrice;
    }

    // TODO: implement voting, withdrawal, the winning-price resolution, and a
    //       way to read the final winning price after voting ends. Design the
    //       signatures, events, and errors yourself.
}
