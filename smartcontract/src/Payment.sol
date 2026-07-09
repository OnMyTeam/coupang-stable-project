// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title Payment
/// @notice Handles native-token and ERC-20 stablecoin payments on Tempo-compatible EVM chains.
contract Payment {
   
}
