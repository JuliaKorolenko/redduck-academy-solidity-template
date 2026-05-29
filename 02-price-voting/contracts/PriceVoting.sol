// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// PriceVoting — token holders lock tokens behind a price to vote on it. While
// voting is open, anyone can vote(price, amount); the contract pulls the tokens
// via transferFrom. After votingEnd, anyone can finalize() once to set the
// winning price, and voters claim() their locked tokens back.
//
// The required public interface (the functions tests call) is declared below.
// You design the internal storage layout. See TASK.md for the full behavior
// spec and the scenarios your tests must cover.
contract PriceVoting {
    // TODO: declare the storage you need — e.g. the token reference, the voting
    //       end timestamp, per-price accumulated weight, per-voter locked
    //       balance, the current leader, the finalized price, and a finalized
    //       flag.

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
        // TODO: store the token reference and the voting end timestamp.
    }

    // ----- write -----

    function vote(uint256 price, uint256 amount) external {
        // TODO
    }

    function finalize() external {
        // TODO
    }

    function claim() external {
        // TODO
    }

    // ----- read -----

    function token() external view returns (IERC20) {
        // TODO
    }

    function votingEnd() external view returns (uint256) {
        // TODO
    }

    function weightOf(uint256 price) external view returns (uint256) {
        // TODO
    }

    function lockedOf(address voter) external view returns (uint256) {
        // TODO
    }

    function leader() external view returns (uint256 price, uint256 weight) {
        // TODO
    }

    function currentTokenPrice() external view returns (uint256) {
        // TODO
    }

    function finalized() external view returns (bool) {
        // TODO
    }
}
