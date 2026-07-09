// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Payment } from "../src/Payment.sol";

contract MockERC20 {
    string public name = "Mock Stable";
    string public symbol = "MUSD";
    uint8 public decimals = 18;

    mapping(address account => uint256) public balanceOf;
    mapping(address owner => mapping(address spender => uint256)) public allowance;

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

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
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
    Payment private payment;
    MockERC20 private token;
    Receiver private recipient;

    receive() external payable {}

    function setUp() public {
        payment = new Payment();
        token = new MockERC20();
        recipient = new Receiver();
    }

    function testPayWithNativeToken() public {
        uint256 amount = 1 ether;
        uint256 paymentId =
            payment.pay{ value: amount }(address(0), address(recipient), amount, "order-1001");

        assertEq(paymentId, 1);
        assertEq(address(recipient).balance, amount);

        Payment.PaymentRecord memory record = payment.getPayment(paymentId);
        assertEq(record.payer, address(this));
        assertEq(record.token, address(0));
        assertEq(record.recipient, address(recipient));
        assertEq(record.amount, amount);
        assertEq(record.memo, "order-1001");
    }

    function testPayWithErc20Token() public {
        uint256 amount = 25 ether;

        token.mint(address(this), amount);
        token.approve(address(payment), amount);

        uint256 paymentId = payment.pay(address(token), address(recipient), amount, "order-1002");

        assertEq(paymentId, 1);
        assertEq(token.balanceOf(address(recipient)), amount);

        Payment.PaymentRecord memory record = payment.getPayment(paymentId);
        assertEq(record.payer, address(this));
        assertEq(record.token, address(token));
        assertEq(record.recipient, address(recipient));
        assertEq(record.amount, amount);
        assertEq(record.memo, "order-1002");
    }

    function testRevertsWhenRecipientIsZeroAddress() public {
        try payment.pay(address(0), address(0), 1 ether, "bad") {
            revert("expected revert");
        } catch (bytes memory reason) {
            assertRevertSelector(reason, Payment.InvalidRecipient.selector);
        }
    }

    function assertEq(address actual, address expected) private pure {
        require(actual == expected, "address mismatch");
    }

    function assertEq(uint256 actual, uint256 expected) private pure {
        require(actual == expected, "uint256 mismatch");
    }

    function assertEq(string memory actual, string memory expected) private pure {
        require(
            keccak256(bytes(actual)) == keccak256(bytes(expected)),
            "string mismatch"
        );
    }

    function assertEq(bytes4 actual, bytes4 expected) private pure {
        require(actual == expected, "selector mismatch");
    }

    function assertRevertSelector(bytes memory reason, bytes4 expected) private pure {
        require(reason.length >= 4, "missing revert selector");

        bytes4 actual;
        assembly {
            actual := mload(add(reason, 0x20))
        }

        assertEq(actual, expected);
    }
}

contract Receiver {
    receive() external payable {}
}
