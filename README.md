# MultiRewards

A modified version of the [Synthetix](https://github.com/Synthetixio/synthetix) staking rewards contract, allowing for multiple reward tokens. Designed for use with [Curve.fi](https://github.com/curvefi) liquidity gauges.

## Overview

The [`MultiRewards`](contracts/MultiRewards.sol) contract in this repository enables distribution of multiple reward tokens for staked users. It is a modified version of the Synthetix [StakingRewards](https://github.com/Synthetixio/synthetix/blob/master/contracts/StakingRewards.sol) contract.

## Modifications from Synthetix's StakingRewards Contract

The `MultiRewards` contract enhances the original `StakingRewards` contract by allowing for multiple reward tokens instead of just one. The key modifications include:

- **Support for Multiple Reward Tokens**: The contract supports an array of reward tokens (`rewardTokens`), each with its own reward distribution parameters.

- **Dynamic Reward Data Management**: Introduced `Reward` structs and mappings (`rewardData`, `userRewardPerTokenPaid`, `rewards`) to manage data for each reward token.

- **Flexible Reward Distribution**:
  - Added `addReward` function to allow the owner to add new reward tokens.
  - Modified `notifyRewardAmount` to accept a reward token address and amount.
  - Added `setRewardsDuration` for each reward token to allow updating the rewards duration.

- **Enhanced User Functions**:
  - Modified `getReward` to claim rewards for all reward tokens.
  - Adjusted `earned` and `rewardPerToken` functions to handle multiple reward tokens.

- **Event Updates**: Updated events to include reward token addresses where appropriate.

- **Security and Ownership Controls**: Ensured that only authorized distributors can notify rewards for their respective tokens.

## How it Works

As an example, assume we desire users to stake an ERC20 token `Base Token` ($BASE). As a reward for staking their tokens, we may wish to offer users multiple different tokens. For this example, we'll assume we have two different governance tokens, `Reward Token 1` ($ONE) and `Reward Token 2` ($TWO), which we want to release over different schedules.

1. **Deployment**: Deploy the `MultiRewards` contract, specifying the `$BASE` token as the staking token.

2. **Adding Reward Tokens**:
   - For both tokens `$ONE` and `$TWO`, the contract's **Owner** calls `addReward`:
     - Specifies the reward token address.
     - Sets the initial rewards duration (in seconds).
     - Assigns a **Distributor** for managing rewards distribution.

3. **Starting Reward Periods**:
   - Each **Distributor** calls `notifyRewardAmount` for their respective reward token:
     - Transfers the specified amount of reward tokens to the contract.
     - Starts the reward distribution cycle for that token.

4. **Staking Tokens**:
   - Users stake their `$BASE` tokens by calling `stake`.
   - Users begin accruing rewards in both `$ONE` and `$TWO` according to each token's distribution schedule.

5. **Claiming Rewards**:
   - Users can claim their accumulated rewards at any time by calling `getReward`.
   - This function disburses rewards for all active reward tokens.

6. **Withdrawing Stakes**:
   - Users can withdraw their staked `$BASE` tokens at any time by calling `withdraw`.
   - They can still claim any unclaimed rewards after withdrawing but will no longer accrue new rewards.

7. **Exiting**:
   - Users can call `exit` to withdraw all staked tokens and claim all rewards in one transaction.

### Considerations

- **Multiple Reward Schedules**: Each reward token has its own independent reward rate and duration.

- **Updating Rewards Duration**:
  - The **Distributor** can update the duration of a reward token by calling `setRewardsDuration`.
  - This can only be done after the current reward cycle has ended.

- **Distributor Management**:
  - The **Owner** can assign or update the **Distributor** for each reward token.

- **Automatic Reward Updates**:
  - The contract automatically updates reward balances whenever users interact with staking or reward functions.

- **Token Recovery**:
  - The **Owner** can call `recoverERC20` to retrieve tokens mistakenly sent to the contract.
  - Cannot withdraw the staking token or any active reward tokens.

- **Token Approvals**:
  - Before transferring tokens to the contract, ensure you have approved the `MultiRewards` contract to spend the required amount.

## Deployment Instructions

Follow these steps to deploy and set up the `MultiRewards` contract.

### Prerequisites

Ensure you have the following installed:

- **Python 3.6+**: [Download Python](https://www.python.org/downloads/)
- **Brownie**: Ethereum testing and development framework.

  ```bash
  pip install eth-brownie
  ```

- **Ganache CLI**: Personal blockchain for Ethereum development.

  ```bash
  npm install -g ganache-cli
  ```

- **Brownie Token Tester**: Brownie plugin for testing ERC20 tokens.

  ```bash
  pip install brownie-token-tester
  ```

### Compilation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/yourusername/multi-rewards.git
   cd multi-rewards
   ```

2. **Compile Contracts**:

   ```bash
   brownie compile
   ```

### Deployment

1. **Set Up Accounts**:

   - **Deployer Account**: The account that will deploy the contract.
   - **Owner Account**: The account that will own the contract and manage reward tokens.

   Load these accounts in Brownie. For example, using private keys:

   ```python
   from brownie import accounts

   DEPLOYER = accounts.add('PRIVATE_KEY_DEPLOYER')
   OWNER = 'ADDRESS_OF_OWNER'
   ```

2. **Configure Deployment Script**:

   Edit the [deployment script](scripts/deploy.py) `scripts/deploy.py` and set the appropriate variables:

   ```python
   DEPLOYER = accounts.add('PRIVATE_KEY_DEPLOYER')  # Deployer's private key
   OWNER = 'ADDRESS_OF_OWNER'  # Owner's address
   STAKING_TOKEN_ADDRESS = 'ADDRESS_OF_BASE_TOKEN'  # Base token to be staked
   ```

3. **Deploy the Contract**:

   Run the deployment script:

   ```bash
   brownie run scripts/deploy.py --network mainnet
   ```

   Replace `mainnet` with the desired network (e.g., `rinkeby` for testing).

4. **Verify the Contract** (Optional):

   Verify the contract on Etherscan for transparency:

   ```bash
   brownie run verify_contract.py --network mainnet
   ```

   Ensure you have set your Etherscan API key in the Brownie configuration.

## Usage Instructions

### Adding a New Reward Token

1. **Owner Adds Reward Token**:

   The **Owner** calls `addReward` to add a new reward token:

   ```python
   multi_rewards = MultiRewards.at('ADDRESS_OF_DEPLOYED_CONTRACT')
   multi_rewards.addReward(
       'ADDRESS_OF_REWARD_TOKEN',
       'ADDRESS_OF_DISTRIBUTOR',
       REWARDS_DURATION_IN_SECONDS,
       {'from': OWNER}
   )
   ```

2. **Distributor Configures Reward Amount**:

   The **Distributor** transfers reward tokens to the contract and sets up the reward schedule:

   ```python
   reward_token = Contract.from_explorer('ADDRESS_OF_REWARD_TOKEN')
   reward_token.approve(multi_rewards.address, REWARD_AMOUNT, {'from': DISTRIBUTOR})

   multi_rewards.notifyRewardAmount(
       reward_token.address,
       REWARD_AMOUNT,
       {'from': DISTRIBUTOR}
   )
   ```

### Staking Tokens

1. **User Stakes Tokens**:

   User stakes `$BASE` tokens to start earning rewards:

   ```python
   base_token = Contract.from_explorer('ADDRESS_OF_BASE_TOKEN')
   base_token.approve(multi_rewards.address, STAKE_AMOUNT, {'from': USER})

   multi_rewards.stake(STAKE_AMOUNT, {'from': USER})
   ```

### Claiming Rewards

1. **User Claims Rewards**:

   User claims all available rewards:

   ```python
   multi_rewards.getReward({'from': USER})
   ```

### Withdrawing Staked Tokens

1. **User Withdraws Tokens**:

   User withdraws a specific amount of staked tokens:

   ```python
   multi_rewards.withdraw(WITHDRAW_AMOUNT, {'from': USER})
   ```

2. **User Exits Completely**:

   User withdraws all staked tokens and claims all rewards:

   ```python
   multi_rewards.exit({'from': USER})
   ```

### Managing Rewards

1. **Updating Rewards Duration**:

   After the current reward period ends, the **Distributor** can update the rewards duration:

   ```python
   multi_rewards.setRewardsDuration(
       reward_token.address,
       NEW_REWARDS_DURATION_IN_SECONDS,
       {'from': DISTRIBUTOR}
   )
   ```

2. **Changing Rewards Distributor**:

   The **Owner** can change the distributor for a reward token:

   ```python
   multi_rewards.setRewardsDistributor(
       reward_token.address,
       'NEW_DISTRIBUTOR_ADDRESS',
       {'from': OWNER}
   )
   ```

### Recovering Tokens

1. **Owner Recovers Erroneously Sent Tokens**:

   The **Owner** can recover tokens sent to the contract by mistake (excluding staking and active reward tokens):

   ```python
   multi_rewards.recoverERC20('TOKEN_ADDRESS', AMOUNT, {'from': OWNER})
   ```

## Testing

The test suite is broadly split between [unit](tests/unitary) and [integration](tests/integration) tests.

To run the unit tests:

```bash
brownie test tests/unitary
```

To run the integration tests:

```bash
brownie test tests/integration
```

## License

The smart contract within this repository is forked from [Synthetixio/synthetix](https://github.com/Synthetixio/synthetix/tree/master), which is licensed under the [MIT License](https://github.com/Synthetixio/synthetix/blob/develop/LICENSE).

This repository is licensed under the [MIT License](LICENSE).

---
