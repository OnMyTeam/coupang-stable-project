// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Payment } from "../src/Payment.sol";

interface Vm {
    function startBroadcast() external;
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployPayment {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (Payment payment) {
        vm.startBroadcast();
        payment = new Payment();
        vm.stopBroadcast();
    }
}
