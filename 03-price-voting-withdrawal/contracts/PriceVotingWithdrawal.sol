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

    constructor(IERC20 _token, uint256 _votingEnd) {
        // TODO: store the token reference and the voting end timestamp.
    }

    // TODO: implement voting, withdrawal, the winning-price resolution, and a
    //       way to read the final winning price after voting ends. Design the
    //       signatures, events, and errors yourself.
}
