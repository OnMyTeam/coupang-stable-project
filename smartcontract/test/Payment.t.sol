// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Payment } from "../src/Payment.sol";

contract MockERC20 {
    mapping(address account => uint256) public balanceOf;
    mapping(address owner => mapping(address spender => uint256)) public allowance;

    bool public failTransfer;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function setFailTransfer(bool shouldFail) external {
        failTransfer = shouldFail;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (failTransfer) return false;

        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "insufficient allowance");
        require(balanceOf[from] >= amount, "insufficient balance");

        allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
        return true;
    }
}

contract PaymentTest {
    event PaymentCompleted(
        address indexed payer,
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    Payment private payment;
    MockERC20 private token;
    address private recipient = address(0xBEEF);

    function setUp() public {
        payment = new Payment();
        token = new MockERC20();
    }

    function testPayWithStablecoinTransfersTokens() public {
        uint256 amount = 25 ether;

        token.mint(address(this), amount);
        token.approve(address(payment), amount);

        payment.pay(address(token), recipient, amount);

        assertEq(token.balanceOf(recipient), amount);
        assertEq(token.balanceOf(address(this)), 0);
        assertEq(token.allowance(address(this), address(payment)), 0);
    }

    function testPayWithStablecoinEmitsPaymentCompleted() public {
        uint256 amount = 10 ether;

        token.mint(address(this), amount);
        token.approve(address(payment), amount);

        Vm vm = Vm(HEVM_ADDRESS);
        vm.expectEmit(true, true, true, true);
        emit PaymentCompleted(address(this), address(token), recipient, amount);

        payment.pay(address(token), recipient, amount);
    }

    function testRevertsWhenTokenIsZeroAddress() public {
        assertRevertSelector(
            abi.encodeCall(payment.pay, (address(0), recipient, 1 ether)),
            Payment.InvalidToken.selector
        );
    }

    function testRevertsWhenRecipientIsZeroAddress() public {
        assertRevertSelector(
            abi.encodeCall(payment.pay, (address(token), address(0), 1 ether)),
            Payment.InvalidRecipient.selector
        );
    }

    function testRevertsWhenAmountIsZero() public {
        assertRevertSelector(
            abi.encodeCall(payment.pay, (address(token), recipient, 0)),
            Payment.InvalidAmount.selector
        );
    }

    function testRevertsWhenTransferReturnsFalse() public {
        uint256 amount = 5 ether;

        token.mint(address(this), amount);
        token.approve(address(payment), amount);
        token.setFailTransfer(true);

        assertRevertSelector(
            abi.encodeCall(payment.pay, (address(token), recipient, amount)),
            Payment.TransferFailed.selector
        );
    }

    function assertEq(address actual, address expected) private pure {
        require(actual == expected, "address mismatch");
    }

    function assertEq(uint256 actual, uint256 expected) private pure {
        require(actual == expected, "uint256 mismatch");
    }

    function assertRevertSelector(bytes memory callData, bytes4 expected) private {
        try this.callPayment(callData) {
            revert("expected revert");
        } catch (bytes memory reason) {
            require(reason.length >= 4, "missing revert selector");

            bytes4 actual;
            assembly {
                actual := mload(add(reason, 0x20))
            }

            require(actual == expected, "selector mismatch");
        }
    }

    function callPayment(bytes calldata callData) external {
        require(msg.sender == address(this), "test only");

        (bool ok, bytes memory reason) = address(payment).call(callData);
        if (!ok) {
            assembly {
                revert(add(reason, 0x20), mload(reason))
            }
        }
    }
}

interface Vm {
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
}

address constant HEVM_ADDRESS = address(uint160(uint256(keccak256("hevm cheat code"))));
