// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SessionAnchor {
    event SessionCommitted(bytes32 indexed sessionHash, address indexed committer, uint256 blockNumber);

    mapping(bytes32 => address) public committerOf;
    mapping(bytes32 => uint256) public committedAt;

    function commit(bytes32 sessionHash) external {
        require(sessionHash != bytes32(0), "empty session");
        committerOf[sessionHash] = msg.sender;
        committedAt[sessionHash] = block.number;
        emit SessionCommitted(sessionHash, msg.sender, block.number);
    }
}
