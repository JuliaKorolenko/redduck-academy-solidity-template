// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Merkle airdrop with two independent claim paths: a Merkle proof (your address
// is on the list committed to by `merkleRoot`) or a signature from the trusted
// `signer`. The two paths share `hasClaimed`. See TASK.md for the full spec.
//
// Implement the Merkle verification and the signature recovery by hand — you may
// not import MerkleProof, ECDSA, EIP712, or any equivalent library. The
// conventions you choose here must match what tests/merkle.ts and
// tests/signatures.ts produce off-chain.
contract MerkleAirdrop {
    IERC20 public immutable token;
    bytes32 public immutable merkleRoot;
    address public immutable signer;

    mapping(address => bool) public hasClaimed;

    error AlreadyClaimed();
    error InvalidProof();
    error InvalidSignature();

    event Claimed(address indexed account, uint256 amount);

    constructor(IERC20 _token, bytes32 _merkleRoot, address _signer) {
        token = _token;
        merkleRoot = _merkleRoot;
        signer = _signer;
    }

    function claim(uint256 amount, bytes32[] calldata proof) external {
        // TODO
    }

    function claimWithSignature(uint256 amount, uint8 v, bytes32 r, bytes32 s) external {
        // TODO
    }

    // Verify that `proof` connects `leaf` to `merkleRoot`. The leaf format and the
    // node-combination rule used here must match tests/merkle.ts.
    function _verify(bytes32[] calldata proof, bytes32 leaf) internal view returns (bool) {
        // TODO
    }
}
