// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/JunoClock.sol";

contract Token is IERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 a) external { balanceOf[to] += a; }
    function approve(address s, uint256 a) external { allowance[msg.sender][s] = a; }
    function transferFrom(address f, address t, uint256 a) external returns (bool) {
        allowance[f][msg.sender] -= a; balanceOf[f] -= a; balanceOf[t] += a; return true;
    }
}

contract JunoClockTest is Test {
    Token token;
    JunoClock clock;
    address keeper = address(0xCAFE);
    address a = address(0xA11CE);
    address b = address(0xB0B);

    function setUp() public {
        token = new Token();
        clock = new JunoClock(token, keeper);
        token.mint(a, 1000e18); token.mint(b, 1000e18);
        vm.prank(a); token.approve(address(clock), type(uint256).max);
        vm.prank(b); token.approve(address(clock), type(uint256).max);
        vm.deal(address(this), 100 ether);
    }

    function fees(uint256 v) internal { (bool ok,) = address(clock).call{value: v}(""); require(ok); }

    function testBurnSendsToDead() public {
        vm.prank(a); clock.burn(100e18);
        assertEq(token.balanceOf(clock.DEAD()), 100e18);
        assertEq(clock.burned(a), 100e18);
        assertEq(clock.totalBurned(), 100e18);
    }

    function testSliceIsProportionalToSecondsLeft() public {
        vm.prank(a); clock.burn(100e18);
        fees(10 ether);
        // 1800s left, weight 3 = 90s, slice = 10 * 90/1800 = 0.5
        vm.prank(keeper); clock.advance(3);
        assertEq(clock.pending(a), 0.5 ether);
        assertEq(clock.pot(), 9.5 ether);
        assertEq(clock.secondsLeft(), 1710);
    }

    function testSplitByBurnedShare() public {
        vm.prank(a); clock.burn(300e18);
        vm.prank(b); clock.burn(100e18);
        fees(4 ether);
        vm.prank(keeper); clock.advance(5); // 150/1800 of 4 = 0.3333
        uint256 total = clock.pending(a) + clock.pending(b);
        assertApproxEqAbs(total, uint256(4 ether) * 150 / 1800, 1e6);
        assertEq(clock.pending(a), clock.pending(b) * 3);
    }

    function testLateBurnerGetsNothingFromEarlierSlices() public {
        vm.prank(a); clock.burn(100e18);
        fees(1 ether);
        vm.prank(keeper); clock.advance(2);
        vm.prank(b); clock.burn(100e18);
        assertEq(clock.pending(b), 0);
        vm.prank(keeper); clock.advance(2);
        assertGt(clock.pending(b), 0);
        // a got all of slice one and half of slice two; b got the other half of slice two
        assertApproxEqAbs(clock.pending(a), uint256(1 ether) * 60 / 1800 + clock.pending(b), 1e6);
    }

    function testClaimPaysAndZeroes() public {
        vm.prank(a); clock.burn(100e18);
        fees(2 ether);
        vm.prank(keeper); clock.advance(1);
        uint256 due = clock.pending(a);
        uint256 before = a.balance;
        vm.prank(a); clock.claim();
        assertEq(a.balance - before, due);
        assertEq(clock.pending(a), 0);
        vm.prank(a); vm.expectRevert(JunoClock.Zero.selector); clock.claim();
    }

    function testMidnightReleasesEverythingAndStops() public {
        vm.prank(a); clock.burn(1e18);
        fees(3 ether);
        vm.startPrank(keeper);
        for (uint256 i = 0; i < 12; i++) clock.advance(5);
        vm.stopPrank();
        assertTrue(clock.isMidnight());
        assertEq(clock.pot(), 0);
        assertEq(clock.pending(a), 3 ether);
        vm.prank(keeper); vm.expectRevert(JunoClock.Midnight.selector); clock.advance(1);
        vm.prank(b); vm.expectRevert(JunoClock.Midnight.selector); clock.burn(1);
    }

    function testPotWaitsWhenNobodyBurned() public {
        fees(1 ether);
        vm.prank(keeper); clock.advance(4);
        assertEq(clock.pot(), 1 ether);
        assertEq(clock.score(), 4);
    }

    function testOnlyKeeperAdvances() public {
        vm.prank(a); vm.expectRevert(JunoClock.NotKeeper.selector); clock.advance(1);
    }
}
