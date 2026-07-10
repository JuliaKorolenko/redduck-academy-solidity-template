// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/* 
If voters could withdraw their tokens during the voting period, it would be possible to
manipulate the voting results. The _leaderPrice and _leaderWeight variables are only ever
increased inside vote() — there's no logic to recalculate them when a price's weight decreases.
So if a voter withdrew their tokens after their price became the leader, _leaderPrice and
_leaderWeight would keep pointing to a price that no longer actually has the highest weight,
and finalize() would set currentTokenPrice incorrectly.

*/
contract PriceVoting {
    IERC20 private curToken;
    uint256 private curVotingEnd;
    uint256 private _finalizedPrice;
    uint256 private _finalizedWeight;
    uint256 private _currentTokenPrice;
    bool private _finalized;
    bool private _isTie;

    mapping(uint256 => uint256) private _weightOf;
    mapping(address => uint256) private _lockedOf;

    error VotingEnded();
    error VotingActive();
    error AlreadyFinalized();
    error ZeroAmount();
    error NothingToClaim();
    error TransferFailed();

    event Voted(address indexed voter, uint256 indexed price, uint256 amount);
    event PriceFinalized(uint256 indexed price, uint256 weight);
    event Claimed(address indexed voter, uint256 amount);

    constructor(IERC20 _token, uint256 _votingEnd) {
        curToken = _token;
        curVotingEnd = _votingEnd;
    }

    function vote(uint256 price, uint256 amount) external {
        if (block.timestamp >= curVotingEnd) revert VotingEnded();
        if (amount == 0) revert ZeroAmount();

        bool success = curToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        _lockedOf[msg.sender] += amount;
        _weightOf[price] += amount;

        if (_weightOf[price] > _finalizedWeight) {
            _finalizedPrice = price;
            _finalizedWeight = _weightOf[price];
            _isTie = false;
            emit PriceFinalized(price, _weightOf[price]);
        } else if (_weightOf[price] == _finalizedWeight) {
            _isTie = true;
        }

        emit Voted(msg.sender, price, amount);
    }

    function finalize() external {
        if (block.timestamp < curVotingEnd) revert VotingActive();
        if (_finalized) revert AlreadyFinalized();

        if (_finalizedWeight == 0 || _isTie) {
            _finalizedPrice = 0;
        }

        _currentTokenPrice = _finalizedPrice;
        _finalized = true;
        emit PriceFinalized(_finalizedPrice, _finalizedWeight);
    }

    function claim() external {
        if (block.timestamp < curVotingEnd) revert VotingActive();

        uint256 lockedAmount = _lockedOf[msg.sender];
        if (lockedAmount == 0) revert NothingToClaim();

        _lockedOf[msg.sender] = 0;
        curToken.transfer(msg.sender, lockedAmount);
        emit Claimed(msg.sender, lockedAmount);
    }

    // ----- read -----

    function token() external view returns (IERC20) {
        return curToken;
    }

    function votingEnd() external view returns (uint256) {
        return curVotingEnd;
    }

    function weightOf(uint256 price) external view returns (uint256) {
        return _weightOf[price];
    }

    function lockedOf(address voter) external view returns (uint256) {
        return _lockedOf[voter];
    }

    function leader() external view returns (uint256 price, uint256 weight) {
        return (_finalizedPrice, _finalizedWeight);
    }

    function currentTokenPrice() external view returns (uint256) {
        return _currentTokenPrice;
    }

    function finalized() external view returns (bool) {
        return _finalized;
    }
}
