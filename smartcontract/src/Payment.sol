// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title Payment
/// @notice Handles native-token and ERC-20 stablecoin payments on Tempo-compatible EVM chains.
contract Payment {
    error InvalidRecipient();
    error InvalidAmount();
    error InvalidNativePayment();
    error NativeTransferFailed();
    error TokenTransferFailed();
    error ReentrantCall();

    struct PaymentRecord {
        address payer;
        address token;
        address recipient;
        uint256 amount;
        string memo;
        uint256 paidAt;
    }

    address public constant NATIVE_TOKEN = address(0);

    uint256 public paymentCount;

    mapping(uint256 paymentId => PaymentRecord) private paymentRecords;

    bool private locked;

    event PaymentCompleted(
        uint256 indexed paymentId,
        address indexed payer,
        address indexed token,
        address recipient,
        uint256 amount,
        string memo,
        uint256 paidAt
    );

    modifier nonReentrant() {
        if (locked) revert ReentrantCall();
        locked = true;
        _;
        locked = false;
    }

    /// @notice Sends payment to `recipient` and stores a payment record.
    /// @dev Pass `token = address(0)` with `msg.value == amount` for native-token payment.
    /// For ERC-20 payment, approve this contract for `amount` before calling.
    function pay(address token, address recipient, uint256 amount, string calldata memo)
        external
        payable
        nonReentrant
        returns (uint256 paymentId)
    {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();

        if (token == NATIVE_TOKEN) {
            if (msg.value != amount) revert InvalidNativePayment();
        } else {
            if (msg.value != 0) revert InvalidNativePayment();
            _safeTransferFrom(token, msg.sender, recipient, amount);
        }

        paymentId = ++paymentCount;
        paymentRecords[paymentId] = PaymentRecord({
            payer: msg.sender,
            token: token,
            recipient: recipient,
            amount: amount,
            memo: memo,
            paidAt: block.timestamp
        });

        if (token == NATIVE_TOKEN) {
            (bool sent,) = recipient.call{ value: amount }("");
            if (!sent) revert NativeTransferFailed();
        }

        emit PaymentCompleted(
            paymentId, msg.sender, token, recipient, amount, memo, block.timestamp
        );
    }

    function getPayment(uint256 paymentId) external view returns (PaymentRecord memory) {
        return paymentRecords[paymentId];
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        (bool success, bytes memory data) =
            token.call(abi.encodeCall(IERC20.transferFrom, (from, to, amount)));

        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TokenTransferFailed();
        }
    }
}
