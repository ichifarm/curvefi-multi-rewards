pragma solidity 0.5.17;

import { Address, IERC20, Math, Owned, Pausable, ReentrancyGuard, SafeERC20, SafeMath } from "./MultiRewards.sol";

contract MultiRewardsMinimal is ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    struct Reward {
        address rewardsDistributor;
        uint256 rewardsDuration;
        uint256 periodFinish;
        uint256 rewardRate;
        uint256 lastUpdateTime;
        uint256 rewardPerTokenStored;
    }
    IERC20 public stakingToken;
    mapping(address => Reward) public rewardData;
    address[] public rewardTokens;

    // user -> reward token -> amount
    mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;
    mapping(address => mapping(address => uint256)) public rewards;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    // Added mapping to track unallocated rewards per reward token
    mapping(address => uint256) public unallocatedRewards;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _owner,
        address _stakingToken
    ) public Owned(_owner) {
        stakingToken = IERC20(_stakingToken);
    }

    function addReward(
        address _rewardsToken,
        address _rewardsDistributor,
        uint256 _rewardsDuration
    )
        public
        onlyOwner
    {
        require(rewardData[_rewardsToken].rewardsDuration == 0);
        rewardTokens.push(_rewardsToken);
        rewardData[_rewardsToken].rewardsDistributor = _rewardsDistributor;
        rewardData[_rewardsToken].rewardsDuration = _rewardsDuration;
    }

    /* ========== VIEWS ========== */

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function lastTimeRewardApplicable(address _rewardsToken) public view returns (uint256) {
        return Math.min(block.timestamp, rewardData[_rewardsToken].periodFinish);
    }

    function rewardPerToken(address _rewardsToken) public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardData[_rewardsToken].rewardPerTokenStored;
        }
        return
            rewardData[_rewardsToken].rewardPerTokenStored.add(
                lastTimeRewardApplicable(_rewardsToken).sub(rewardData[_rewardsToken].lastUpdateTime).mul(rewardData[_rewardsToken].rewardRate).mul(1e18).div(_totalSupply)
            );
    }

    function earned(address account, address _rewardsToken) public view returns (uint256) {
        return _balances[account].mul(rewardPerToken(_rewardsToken).sub(userRewardPerTokenPaid[account][_rewardsToken])).div(1e18).add(rewards[account][_rewardsToken]);
    }

    function getRewardForDuration(address _rewardsToken) external view returns (uint256) {
        return rewardData[_rewardsToken].rewardRate.mul(rewardData[_rewardsToken].rewardsDuration);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function setRewardsDistributor(address _rewardsToken, address _rewardsDistributor) external onlyOwner {
        rewardData[_rewardsToken].rewardsDistributor = _rewardsDistributor;
    }

    function stake(uint256 amount) external nonReentrant notPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply = _totalSupply.sub(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public nonReentrant updateReward(msg.sender) {

        for (uint i; i < rewardTokens.length; i++) {
            address _rewardsToken = rewardTokens[i];
            uint256 reward = rewards[msg.sender][_rewardsToken];
            if (reward > 0) {
                rewards[msg.sender][_rewardsToken] = 0;
                IERC20(_rewardsToken).safeTransfer(msg.sender, reward);
                emit RewardPaid(msg.sender, _rewardsToken, reward);
            }
        }
    }

    function exit() external {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function notifyRewardAmount(address _rewardsToken, uint256 reward) external updateReward(address(0)) {
        require(rewardData[_rewardsToken].rewardsDistributor == msg.sender);
        // handle the transfer of reward tokens via `transferFrom` to reduce the number
        // of transactions required and ensure correctness of the reward amount
        IERC20(_rewardsToken).safeTransferFrom(msg.sender, address(this), reward);

        // Include unallocated rewards accumulated up to now
        uint256 unallocated = unallocatedRewards[_rewardsToken];
        unallocatedRewards[_rewardsToken] = 0;

        if (block.timestamp >= rewardData[_rewardsToken].periodFinish) {
            rewardData[_rewardsToken].rewardRate = (reward.add(unallocated)).div(rewardData[_rewardsToken].rewardsDuration);
        } else {
            uint256 remaining = rewardData[_rewardsToken].periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardData[_rewardsToken].rewardRate);
            rewardData[_rewardsToken].rewardRate = (reward.add(leftover).add(unallocated)).div(rewardData[_rewardsToken].rewardsDuration);
        }

        rewardData[_rewardsToken].lastUpdateTime = block.timestamp;
        rewardData[_rewardsToken].periodFinish = block.timestamp.add(rewardData[_rewardsToken].rewardsDuration);
        emit RewardAdded(reward.add(unallocated));
    }

    // Added to support recovering LP Rewards from other systems such as BAL to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        require(tokenAddress != address(stakingToken), "Cannot withdraw staking token");
        require(rewardData[tokenAddress].lastUpdateTime == 0, "Cannot withdraw reward token");
        IERC20(tokenAddress).safeTransfer(owner, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    function setRewardsDuration(address _rewardsToken, uint256 _rewardsDuration) external {
        require(
            block.timestamp > rewardData[_rewardsToken].periodFinish,
            "Reward period still active"
        );
        require(rewardData[_rewardsToken].rewardsDistributor == msg.sender);
        require(_rewardsDuration > 0, "Reward duration must be non-zero");
        rewardData[_rewardsToken].rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(_rewardsToken, rewardData[_rewardsToken].rewardsDuration);
    }

    /* ========== MODIFIERS ========== */

    modifier updateReward(address account) {
        for (uint i; i < rewardTokens.length; i++) {
            address token = rewardTokens[i];
            // Compute the applicable time for rewards
            uint256 lastApplicableTime = lastTimeRewardApplicable(token);
            uint256 timeDifference = lastApplicableTime.sub(rewardData[token].lastUpdateTime);
            if (_totalSupply > 0) {
                // Update rewardPerTokenStored
                rewardData[token].rewardPerTokenStored = rewardPerToken(token);
            } else if (timeDifference > 0) {
                // Accumulate unallocated rewards when total supply is zero
                uint256 unallocated = timeDifference.mul(rewardData[token].rewardRate);
                unallocatedRewards[token] = unallocatedRewards[token].add(unallocated);
            }
            rewardData[token].lastUpdateTime = lastApplicableTime;
            if (account != address(0)) {
                rewards[account][token] = earned(account, token);
                userRewardPerTokenPaid[account][token] = rewardData[token].rewardPerTokenStored;
            }
        }
        _;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward);
    event RewardsDurationUpdated(address token, uint256 newDuration);
    event Recovered(address token, uint256 amount);
}