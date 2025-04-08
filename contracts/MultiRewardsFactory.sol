// SPDX-License-Identifier: MIT
pragma solidity ^0.5.17;

import "./MultiRewards.sol";

contract MultiRewardsFactory {
    // Event emitted when a new MultiRewards contract is created
    event MultiRewardsCreated(address indexed multiRewards, address indexed owner, address indexed stakingToken);

    /**
     * @notice Creates a new MultiRewards contract
     * @param stakingToken The token that will be staked in the MultiRewards contract
     * @return newMultiRewardsAddress address of the newly created MultiRewards contract
     */
    function createMultiRewards(address stakingToken) external returns (address newMultiRewardsAddress) {
        address owner = msg.sender;
        require(stakingToken != address(0), "Invalid staking token address");

        // Create new MultiRewards contract
        MultiRewards newMultiRewards = new MultiRewards(owner, stakingToken);

        newMultiRewardsAddress = address(newMultiRewards);

        // Emit creation event
        emit MultiRewardsCreated(newMultiRewardsAddress, owner, stakingToken);

        return newMultiRewardsAddress;
    }
}
