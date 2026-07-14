// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/* 
    The leader is resolved lazily: during voting, only _weightOf[price] and the
    list of unique prices (_allPrices) are maintained. The winning price is
    computed once, in finalize(), by iterating _allPrices and picking the price
    with the highest weight.

    An incremental approach (updating a cached leader on every vote, as in the
    previous task) would break here, since withdraw() lets a price's weight
    decrease — there'd be no way to demote a stale leader without a full
    recompute anyway. The lazy approach sidesteps this by always resolving the
    winner from the final state, regardless of how many votes or withdrawals
    happened before finalize() was called.
*/

contract PriceVotingWithdrawal {
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
    error InsufficientAmount(uint256 available, uint256 requested);

    event Voted(address indexed voter, uint256 indexed price, uint256 amount);
    event PriceFinalized(uint256 indexed price, uint256 weight);
    event Withdrawn(address indexed voter, uint256 indexed price, uint256 amount);

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

    function withdraw(uint256 price, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (_lockedOf[msg.sender][price] < amount) {
            revert InsufficientAmount(_lockedOf[msg.sender][price], amount);
        }

        _lockedOf[msg.sender][price] -= amount;
        _weightOf[price] -= amount;

        bool success = curToken.transfer(msg.sender, amount);
        if (!success) revert TransferFailed();

        emit Withdrawn(msg.sender, price, amount);
    }

    function finalize() external {
        if (block.timestamp < curVotingEnd) revert VotingActive();
        if (_finalized) revert AlreadyFinalized();

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

    function weightOf(uint256 price) external view returns (uint256) {
        return _weightOf[price];
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

    function token() external view returns (IERC20) {
        return curToken;
    }

    function finalized() external view returns (bool) {
        return _finalized;
    }

    function leader() external view returns (uint256 price, uint256 weight) {
        if (!_finalized) revert VotingActive();
        return (_leaderPrice, _leaderWeight);
    }

    function currentTokenPrice() external view returns (uint256) {
        return _currentTokenPrice;
    }

    // TODO: implement voting, withdrawal, the winning-price resolution, and a
    //       way to read the final winning price after voting ends. Design the
    //       signatures, events, and errors yourself.
}
