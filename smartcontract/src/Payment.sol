// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title Payment
/// @notice Handles ERC-20 stablecoin payments on Tempo-compatible EVM chains.
contract Payment {
    event PaymentCompleted(
        address indexed payer,
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    error InvalidToken();
    error InvalidRecipient();
    error InvalidAmount();
    error TransferFailed();

    function pay(address token, address recipient, uint256 amount) external {
        if (token == address(0)) revert InvalidToken();
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();

        bool success = IERC20(token).transferFrom(msg.sender, recipient, amount);
        if (!success) revert TransferFailed();

        emit PaymentCompleted(msg.sender, token, recipient, amount);
    }
}
