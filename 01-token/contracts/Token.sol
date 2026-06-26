// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Token is IERC20 {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalAmount;

    // TODO: declare storage for totalSupply, balances, and allowances.
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;

    error InsufficientBalance();
    error TransferToZeroAddress();
    error ApproveToZeroAddress();
    error InsufficientAllowance();

    constructor(string memory name_, string memory symbol_, uint256 initialSupply) {
        name = name_;
        symbol = symbol_;
        totalAmount = initialSupply;

        initialize(initialSupply);
        // TODO: credit `initialSupply` to msg.sender and emit a Transfer event
        //       from the zero address to msg.sender for the same amount.
    }

    function initialize(uint256 initialSupply) internal {
        balances[msg.sender] = initialSupply;
        emit Transfer(address(0), msg.sender, initialSupply);
    }

    function totalSupply() external view returns (uint256) {
        return totalAmount;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return allowances[owner][spender];
    }

    function transfer(address to, uint256 value) external returns (bool) {
        if (balances[msg.sender] < value) {
            revert InsufficientBalance();
        }
        if (to == address(0)) {
            revert TransferToZeroAddress();
        }

        balances[msg.sender] -= value;
        balances[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        if (spender == address(0)) {
            revert ApproveToZeroAddress();
        }

        allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        if (balances[from] < value) {
            revert InsufficientBalance();
        }
        if (allowances[from][msg.sender] < value) {
            revert InsufficientAllowance();
        }

        allowances[from][msg.sender] -= value;
        balances[to] += value;
        balances[from] -= value;
        emit Transfer(from, to, value);

        return true;
    }
}
