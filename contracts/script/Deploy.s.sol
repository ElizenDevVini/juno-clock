// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/JunoClock.sol";

contract Deploy is Script {
    function run() external {
        require(block.chainid == 4663, "robinhood chain only");
        IERC20 juno = IERC20(vm.envAddress("JUNO"));
        address keeper = vm.envAddress("KEEPER");
        vm.startBroadcast();
        JunoClock clock = new JunoClock(juno, keeper, vm.envUint("SCORE"));
        vm.stopBroadcast();
        console.log("JunoClock", address(clock));
    }
}
